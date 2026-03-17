import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SG_BASE = 'https://api.seatgeek.com/2'
const SG_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID!

// High-demand searches to populate TixHound with real on-sale events
const SEARCHES = [
  { q: 'Taylor Swift', category: 'concert' },
  { q: 'Kendrick Lamar', category: 'concert' },
  { q: 'Billie Eilish', category: 'concert' },
  { q: 'Bad Bunny', category: 'concert' },
  { q: 'Coldplay', category: 'concert' },
  { q: 'Zach Bryan', category: 'concert' },
  { q: 'Phish', category: 'concert' },
  { q: 'Lakers', category: 'sports' },
  { q: 'Celtics', category: 'sports' },
  { q: 'Yankees', category: 'sports' },
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sgPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', 'SeatGeek')
    .single()

  if (!sgPlatform) {
    return NextResponse.json({ error: 'SeatGeek platform not in DB' }, { status: 500 })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const search of SEARCHES) {
    const params = new URLSearchParams({
      client_id: SG_CLIENT_ID,
      q: search.q,
      per_page: '3',
      sort: 'score.desc',
      'datetime_local.gte': new Date().toISOString().split('T')[0],
    })

    try {
      const res = await fetch(`${SG_BASE}/events?${params}`)
      const json = await res.json()
      const sgEvents: any[] = json.events ?? []

      for (const e of sgEvents) {
        if (!e.datetime_utc || !e.title) continue

        const venue = e.venue
        let venueId: string | null = null

        if (venue?.name) {
          const venueSlug = venue.slug ?? null
          // If no slug, try to find by name+city to avoid duplicates
          if (!venueSlug) {
            const { data: existing } = await supabase
              .from('venues')
              .select('id')
              .eq('name', venue.name)
              .eq('city', venue.city ?? '')
              .maybeSingle()
            if (existing) {
              venueId = existing.id
            } else {
              const { data: v } = await supabase
                .from('venues')
                .insert({
                  name: venue.name,
                  city: venue.city ?? null,
                  state: venue.state ?? null,
                  country: venue.country ?? 'US',
                  capacity: venue.capacity ?? null,
                  slug: null,
                })
                .select('id')
                .single()
              venueId = v?.id ?? null
            }
          } else {
            const { data: v } = await supabase
              .from('venues')
              .upsert(
                {
                  name: venue.name,
                  city: venue.city ?? null,
                  state: venue.state ?? null,
                  country: venue.country ?? 'US',
                  capacity: venue.capacity ?? null,
                  slug: venueSlug,
                },
                { onConflict: 'slug' }
              )
              .select('id')
              .single()
            venueId = v?.id ?? null
          }
        }

        // Primary performer image
        const primaryPerformer = e.performers?.find((p: any) => p.primary) ?? e.performers?.[0]
        const imageUrl = primaryPerformer?.image ?? null
        const artistName = primaryPerformer?.name ?? null

        // Upsert event keyed on SeatGeek ID + platform
        const externalId = String(e.id)
        const slug = slugify(`${e.title}-${externalId}`)

        const { data: eventRow, error: eventErr } = await supabase
          .from('events')
          .upsert(
            {
              external_id: externalId,
              platform_id: sgPlatform.id,
              venue_id: venueId,
              name: e.title,
              slug,
              category: search.category,
              artist_name: artistName,
              event_date: e.datetime_utc,
              image_url: imageUrl,
              is_active: true,
            },
            { onConflict: 'external_id,platform_id' }
          )
          .select('id')
          .single()

        if (eventErr || !eventRow) {
          errors.push(`${e.title}: ${eventErr?.message}`)
          continue
        }

        // Upsert affiliate link with SeatGeek URL + client_id as affiliate tag
        const affiliateUrl = `${e.url}?aid=${SG_CLIENT_ID}`
        await supabase
          .from('affiliate_links')
          .upsert(
            {
              event_id: eventRow.id,
              platform_id: sgPlatform.id,
              url: affiliateUrl,
              affiliate_tag: SG_CLIENT_ID,
              is_active: true,
            },
            { onConflict: 'event_id,platform_id' }
          )

        // Store price snapshot if stats available
        const stats = e.stats ?? {}
        if (stats.lowest_price || stats.average_price) {
          await supabase.from('price_snapshots').insert({
            event_id: eventRow.id,
            platform_id: sgPlatform.id,
            snapshot_time: new Date().toISOString(),
            min_price_usd: stats.lowest_price ?? stats.average_price,
            max_price_usd: stats.highest_price ?? null,
            avg_price_usd: stats.average_price ?? null,
            listing_count: stats.listing_count ?? 0,
          }).select()
        }

        imported++
      }

      await sleep(250)
    } catch (err: any) {
      errors.push(`Search "${search.q}": ${err.message}`)
    }
  }

  return NextResponse.json({ ok: true, imported, skipped, errors })
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
