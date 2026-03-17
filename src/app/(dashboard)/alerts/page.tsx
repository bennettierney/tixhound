import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Plus } from 'lucide-react'
import { format } from 'date-fns'
import AlertToggle from '@/components/alerts/AlertToggle'

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*, event:events(name, event_date), platform:platforms(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const { data: tierLimits } = await supabase
    .from('tier_limits')
    .select('max_alerts')
    .eq('tier', profile?.tier ?? 'free')
    .single()

  const activeCount = alerts?.filter(a => a.is_active).length ?? 0

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Price Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} of {tierLimits?.max_alerts ?? 2} active alerts used
          </p>
        </div>
        <Link href="/alerts/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New alert
          </Button>
        </Link>
      </div>

      {!alerts || alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No price alerts yet.</p>
            <Link href="/events">
              <Button variant="outline">Browse events to set an alert</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <Card key={alert.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/events/${alert.event_id}`}
                      className="font-medium text-sm hover:text-primary transition-colors"
                    >
                      {alert.event?.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {alert.condition === 'below' ? 'Below' : alert.condition === 'above' ? 'Above' : 'Any change'}
                        {' '}${Number(alert.target_price).toFixed(2)}
                      </Badge>
                      {alert.platform && (
                        <Badge variant="secondary" className="text-xs">{alert.platform.name}</Badge>
                      )}
                      {alert.section_filter && (
                        <Badge variant="secondary" className="text-xs">Section {alert.section_filter}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Created {format(new Date(alert.created_at), 'MMM d, yyyy')}
                      {alert.last_triggered && ` · Last triggered ${format(new Date(alert.last_triggered), 'MMM d')}`}
                    </p>
                  </div>
                  <AlertToggle alertId={alert.id} isActive={alert.is_active} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
