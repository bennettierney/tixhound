import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import EventSearch from '@/components/events/EventSearch'
import { Skeleton } from '@/components/ui/skeleton'

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select('*, venue:venues(name, city, state), platform:platforms(name)')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(50)

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,artist_name.ilike.%${params.q}%`)
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }

  const { data: events } = await query

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Events</h1>
        <p className="text-muted-foreground text-sm mt-1">Find events to track and get price alerts</p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <EventSearch initialEvents={events ?? []} initialParams={params} />
      </Suspense>
    </div>
  )
}
