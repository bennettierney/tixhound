import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SG_BASE = 'https://api.seatgeek.com/2'
const SG_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID!
// Affiliate tag appended to all SeatGeek URLs
const SG_AFFILIATE_TAG = SG_CLIENT_ID

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: events } = await supabase
    .from('events')
    .select('id, name, artist_name, event_date')
    .eq('is_active', true)

  const { data: sgPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', 'SeatGeek')
    .single()

  if (!sgPlatform) {
    return NextResponse.json({ error: 'SeatGeek platform not found' }, { status: 500 })
  }

  const results: { event: string; status: string; url?: string }[] = []

  for (const event of events ?? []) {
    const searchTerm = event.artist_name ?? event.name
    const params = new URLSearchParams({
      client_id: SG_CLIENT_ID,
      q: searchTerm,
      per_page: '5',
      sort: 'score.desc',
    })

    try {
      const res = await fetch(`${SG_BASE}/events?${params}`)
      const json = await res.json()
      const sgEvents = json.events ?? []

      // Find best match: prefer events with a date close to ours
      const eventDate = new Date(event.event_date)
      const match = bestMatch(sgEvents, eventDate)

      if (!match) {
        results.push({ event: event.name, status: 'no_match' })
        continue
      }

      // Build affiliate URL — SeatGeek uses aid param for affiliates
      const affiliateUrl = `${match.url}?aid=${SG_AFFILIATE_TAG}`

      // Upsert into affiliate_links (replace existing SeatGeek link for this event)
      const { error } = await supabase
        .from('affiliate_links')
        .upsert(
          {
            event_id: event.id,
            platform_id: sgPlatform.id,
            url: affiliateUrl,
            affiliate_tag: SG_AFFILIATE_TAG,
            is_active: true,
          },
          { onConflict: 'event_id,platform_id' }
        )

      if (error) {
        results.push({ event: event.name, status: 'db_error', url: affiliateUrl })
      } else {
        results.push({ event: event.name, status: 'ok', url: affiliateUrl })
      }

      await sleep(250) // stay under rate limit
    } catch (err: any) {
      results.push({ event: event.name, status: 'fetch_error' })
    }
  }

  return NextResponse.json({ ok: true, results })
}

function bestMatch(sgEvents: any[], targetDate: Date): any | null {
  if (!sgEvents.length) return null

  // Score each event: date proximity wins, then SeatGeek's own score
  const scored = sgEvents.map((e) => {
    const sgDate = new Date(e.datetime_utc)
    const daysDiff = Math.abs((sgDate.getTime() - targetDate.getTime()) / 86400000)
    // Within 30 days is acceptable (tours have multiple dates)
    const datePenalty = daysDiff > 30 ? 999 : daysDiff
    return { e, datePenalty, score: e.score ?? 0 }
  })

  scored.sort((a, b) => a.datePenalty - b.datePenalty || b.score - a.score)
  return scored[0].datePenalty < 180 ? scored[0].e : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
