import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, TrendingDown, Search } from 'lucide-react'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [
    { data: trackedEvents, count: trackedCount },
    { data: activeAlerts, count: alertCount },
    { data: tierLimits },
  ] = await Promise.all([
    supabase
      .from('user_tracked_events')
      .select('*, event:events(*, venue:venues(name, city, state))', { count: 'exact' })
      .eq('user_id', user.id)
      .order('tracked_at', { ascending: false })
      .limit(5),
    supabase
      .from('price_alerts')
      .select('*, event:events(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase.from('tier_limits').select('*').eq('tier', profile?.tier ?? 'free').single(),
  ])

  const limits = tierLimits as { max_tracked_events: number; max_alerts: number } | null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening with your tracked events.</p>
        </div>
        <Link href="/events">
          <Button className="gap-2">
            <Search className="w-4 h-4" />
            Find events
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tracked Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trackedCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {limits?.max_tracked_events ?? 3} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {limits?.max_alerts ?? 2} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Account Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold capitalize">{profile?.tier ?? 'free'}</span>
              {profile?.tier === 'free' && (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracked Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tracked Events</CardTitle>
          <Link href="/events" className="text-xs text-primary hover:underline">
            Find more →
          </Link>
        </CardHeader>
        <CardContent>
          {!trackedEvents || trackedEvents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm mb-4">You&apos;re not tracking any events yet.</p>
              <Link href="/events">
                <Button variant="outline" size="sm">Browse events</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {trackedEvents.map((te: any) => (
                <Link
                  key={te.id}
                  href={`/events/${te.event_id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors border border-border"
                >
                  <div>
                    <p className="font-medium text-sm">{te.event?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {te.event?.venue?.name && `${te.event.venue.name} · `}
                      {te.event?.event_date && format(new Date(te.event.event_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {te.event?.category ?? 'event'}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
