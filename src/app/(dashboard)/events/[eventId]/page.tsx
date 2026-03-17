import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar } from 'lucide-react'
import TrackButton from '@/components/events/TrackButton'
import PriceHistoryChart from '@/components/events/PriceHistoryChart'
import AffiliateLinkList from '@/components/events/AffiliateLinkList'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: event },
    { data: snapshots },
    { data: listings },
    { data: affiliateLinks },
    { data: tracked },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('*, venue:venues(*), platform:platforms(*)')
      .eq('id', eventId)
      .single(),
    supabase
      .from('price_snapshots')
      .select('*, platform:platforms(name)')
      .eq('event_id', eventId)
      .order('snapshot_time', { ascending: true })
      .limit(90),
    supabase
      .from('ticket_listings')
      .select('*, platform:platforms(name, base_url)')
      .eq('event_id', eventId)
      .eq('is_current', true)
      .order('price_usd', { ascending: true })
      .limit(20),
    supabase
      .from('affiliate_links')
      .select('*, platform:platforms(name, logo_url)')
      .eq('event_id', eventId)
      .eq('is_active', true),
    supabase
      .from('user_tracked_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single(),
  ])

  if (!event) notFound()

  const isTracked = !!tracked

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {event.category && (
              <Badge variant="secondary" className="capitalize">{event.category}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          {event.artist_name && (
            <p className="text-muted-foreground mt-1">{event.artist_name}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {event.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {event.venue.name}
                {event.venue.city ? `, ${event.venue.city}` : ''}
                {event.venue.state ? `, ${event.venue.state}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy · h:mm a')}
            </span>
          </div>
        </div>
        <TrackButton eventId={eventId} isTracked={isTracked} userId={user.id} />
      </div>

      {/* Price History Chart */}
      {snapshots && snapshots.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Price History</h2>
          <PriceHistoryChart snapshots={snapshots} />
        </div>
      )}

      {/* Current Listings */}
      {listings && listings.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Current Listings</h2>
          <div className="space-y-2">
            {listings.map((listing: any) => (
              <div key={listing.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="text-sm font-medium">{listing.platform?.name}</span>
                  {listing.section && (
                    <span className="text-xs text-muted-foreground ml-2">
                      Section {listing.section}{listing.row ? ` · Row ${listing.row}` : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-sm">${listing.price_usd.toFixed(2)}</p>
                    {listing.fees_usd && (
                      <p className="text-xs text-muted-foreground">+${listing.fees_usd.toFixed(2)} fees</p>
                    )}
                  </div>
                  {listing.listing_url && (
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Buy →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Affiliate Links */}
      {affiliateLinks && affiliateLinks.length > 0 && (
        <AffiliateLinkList links={affiliateLinks} eventId={eventId} />
      )}
    </div>
  )
}
