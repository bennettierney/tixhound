import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const TM_BASE = 'https://app.ticketmaster.com/discovery/v2'
const TM_KEY = process.env.TICKETMASTER_API_KEY!

// High-demand searches to populate with real Ticketmaster events
const SEARCHES = [
  { keyword: 'Taylor Swift',    category: 'concert' },
  { keyword: 'Kendrick Lamar', category: 'concert' },
  { keyword: 'Billie Eilish',  category: 'concert' },
  { keyword: 'Bad Bunny',      category: 'concert' },
  { keyword: 'Coldplay',       category: 'concert' },
  { keyword: 'Zach Bryan',     category: 'concert' },
  { keyword: 'Sabrina Carpenter', category: 'concert' },
  { keyword: 'Tyler the Creator', category: 'concert' },
  { keyword: 'Chappell Roan',  category: 'concert' },
  { keyword: 'Post Malone',    category: 'concert' },
  { keyword: 'Lakers',         category: 'sports' },
  { keyword: 'Celtics',        category: 'sports' },
  { keyword: 'Yankees',        category: 'sports' },
  { keyword: 'Cubs',           category: 'sports' },
  { keyword: 'Chiefs',         category: 'sports' },
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

  const { data: tmPlatform } = await supabase
    .from('platforms')
    .select('id')
    .eq('name', 'Ticketmaster')
    .single()

  if (!tmPlatform) {
    return NextResponse.json({ error: 'Ticketmaster platform not in DB' }, { status: 500 })
  }

  let imported = 0
  const errors: string[] = []

  for (const search of SEARCHES) {
    // TM requires format: 2026-03-17T00:00:00Z (no milliseconds)
    const startDateTime = new Date().toISOString().split('.')[0] + 'Z'

    const params = new URLSearchParams({
      apikey: TM_KEY,
      keyword: search.keyword,
      countryCode: 'US',
      size: '5',
      sort: 'relevance,desc',
      startDateTime,
    })

    try {
      const res = await fetch(`${TM_BASE}/events.json?${params}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 0 },
      })

      if (!res.ok) {
        errors.push(`${search.keyword}: HTTP ${res.status}`)
        continue
      }

      const json = await res.json()
      const tmEvents: any[] = json._embedded?.events ?? []

      for (const e of tmEvents) {
        if (!e.name || !e.dates?.start?.dateTime) continue

        // Venue
        const tmVenue = e._embedded?.venues?.[0]
        let venueId: string | null = null

        if (tmVenue?.name) {
          const { data: v } = await supabase
            .from('venues')
            .upsert(
              {
                name: tmVenue.name,
                city: tmVenue.city?.name ?? null,
                state: tmVenue.state?.stateCode ?? null,
                country: tmVenue.country?.countryCode ?? 'US',
                capacity: null,
                slug: tmVenue.id ? `tm-${tmVenue.id}` : null,
              },
              { onConflict: 'slug' }
            )
            .select('id')
            .single()
          venueId = v?.id ?? null
        }

        // Artist / performer
        const primaryAttr = e._embedded?.attractions?.[0]
        const artistName = primaryAttr?.name ?? null
        const imageUrl = e.images?.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url
          ?? e.images?.[0]?.url ?? null

        const externalId = String(e.id)
        const slug = slugify(`${e.name}-${externalId}`)

        // Price range
        let minPrice: number | null = null
        let maxPrice: number | null = null
        if (e.priceRanges?.length) {
          for (const pr of e.priceRanges) {
            if (pr.min != null && (minPrice === null || pr.min < minPrice)) minPrice = pr.min
            if (pr.max != null && (maxPrice === null || pr.max > maxPrice)) maxPrice = pr.max
          }
        }

        const { data: eventRow, error: eventErr } = await supabase
          .from('events')
          .upsert(
            {
              external_id: externalId,
              platform_id: tmPlatform.id,
              venue_id: venueId,
              name: e.name,
              slug,
              category: search.category,
              artist_name: artistName,
              event_date: e.dates.start.dateTime,
              image_url: imageUrl,
              is_active: true,
            },
            { onConflict: 'external_id,platform_id' }
          )
          .select('id')
          .single()

        if (eventErr || !eventRow) {
          errors.push(`${e.name}: ${eventErr?.message}`)
          continue
        }

        // Affiliate link (Ticketmaster affiliate uses ref param — update tag once approved)
        await supabase
          .from('affiliate_links')
          .upsert(
            {
              event_id: eventRow.id,
              platform_id: tmPlatform.id,
              url: e.url ?? `https://www.ticketmaster.com/event/${externalId}`,
              affiliate_tag: 'tixhound',
              is_active: true,
            },
            { onConflict: 'event_id,platform_id' }
          )

        // Price snapshot if available
        if (minPrice !== null) {
          await supabase.from('price_snapshots').insert({
            event_id: eventRow.id,
            platform_id: tmPlatform.id,
            snapshot_time: new Date().toISOString(),
            min_price_usd: round2(minPrice),
            max_price_usd: maxPrice ? round2(maxPrice) : null,
            avg_price_usd: maxPrice ? round2((minPrice + maxPrice) / 2) : round2(minPrice),
            listing_count: 1,
          })

          // Update current listing
          await supabase
            .from('ticket_listings')
            .update({ is_current: false })
            .eq('event_id', eventRow.id)
            .eq('platform_id', tmPlatform.id)

          await supabase.from('ticket_listings').insert({
            event_id: eventRow.id,
            platform_id: tmPlatform.id,
            section: 'Various',
            price_usd: round2(minPrice),
            fees_usd: round2(minPrice * 0.27),
            listing_url: e.url ?? null,
            is_current: true,
          })
        }

        imported++
      }

      await sleep(220) // ~4.5 req/sec — under TM's 5/sec limit
    } catch (err: any) {
      errors.push(`${search.keyword}: ${err.message}`)
    }
  }

  return NextResponse.json({ ok: true, imported, errors })
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
