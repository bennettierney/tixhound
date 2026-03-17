import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2'
const TM_KEY = process.env.TICKETMASTER_API_KEY!

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all active events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, artist_name, event_date, category')
    .eq('is_active', true)

  if (eventsError || !events?.length) {
    return NextResponse.json({ error: eventsError?.message ?? 'No events' }, { status: 500 })
  }

  // Get Ticketmaster platform ID
  const { data: tmPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', 'Ticketmaster')
    .single()

  if (!tmPlatform) {
    return NextResponse.json({ error: 'Ticketmaster platform not found in DB' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const results: { event: string; source: string; min?: number; max?: number; error?: string }[] = []

  for (const event of events) {
    const searchTerm = event.artist_name ?? event.name
    const eventDate = new Date(event.event_date)

    // Search Ticketmaster for this event — look within ±3 days of event date
    const startDT = new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().replace('.000', '')
    const endDT = new Date(eventDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().replace('.000', '')

    const params = new URLSearchParams({
      apikey: TM_KEY,
      keyword: searchTerm,
      startDateTime: startDT,
      endDateTime: endDT,
      countryCode: 'US',
      size: '5',
      sort: 'date,asc',
    })

    try {
      const res = await fetch(`${TM_BASE}/events.json?${params}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      })

      if (!res.ok) {
        results.push({ event: event.name, source: 'ticketmaster', error: `HTTP ${res.status}` })
        continue
      }

      const json = await res.json()
      const tmEvents = json._embedded?.events ?? []

      // Find the best match — prefer events with priceRanges
      const match = tmEvents.find((e: any) => e.priceRanges?.length) ?? tmEvents[0]

      if (!match) {
        results.push({ event: event.name, source: 'ticketmaster', error: 'No TM match found' })
        continue
      }

      let minPrice: number | null = null
      let maxPrice: number | null = null

      if (match.priceRanges?.length) {
        // May have multiple price types — take the broadest range
        for (const pr of match.priceRanges) {
          if (pr.min != null && (minPrice === null || pr.min < minPrice)) minPrice = pr.min
          if (pr.max != null && (maxPrice === null || pr.max > maxPrice)) maxPrice = pr.max
        }
      }

      if (minPrice === null) {
        // TM found the event but no price data yet — skip snapshot
        results.push({ event: event.name, source: 'ticketmaster', error: 'No price data from TM' })
        continue
      }

      // Store snapshot
      const { error: snapErr } = await supabase.from('price_snapshots').insert({
        event_id: event.id,
        platform_id: tmPlatform.id,
        snapshot_time: now,
        min_price_usd: round2(minPrice),
        max_price_usd: maxPrice ? round2(maxPrice) : null,
        avg_price_usd: maxPrice ? round2((minPrice + maxPrice) / 2) : round2(minPrice),
        listing_count: 1, // TM API doesn't expose count
      })

      if (snapErr && snapErr.code !== '23505') {
        results.push({ event: event.name, source: 'ticketmaster', error: snapErr.message })
        continue
      }

      // Also insert a single representative ticket_listing so current listings show real data
      await supabase
        .from('ticket_listings')
        .update({ is_current: false })
        .eq('event_id', event.id)
        .eq('platform_id', tmPlatform.id)
        .eq('is_current', true)

      await supabase.from('ticket_listings').insert({
        event_id: event.id,
        platform_id: tmPlatform.id,
        section: 'Various',
        row: null,
        quantity: null,
        price_usd: round2(minPrice),
        fees_usd: round2(minPrice * 0.27), // TM fees ~27%
        is_current: true,
        listing_url: match.url ?? null,
      })

      results.push({ event: event.name, source: 'ticketmaster', min: minPrice, max: maxPrice ?? undefined })

      // Respect TM rate limit: 5 req/sec
      await sleep(220)
    } catch (err: any) {
      results.push({ event: event.name, source: 'ticketmaster', error: err.message })
    }
  }

  return NextResponse.json({ ok: true, timestamp: now, results })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
