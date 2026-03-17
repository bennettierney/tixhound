'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import type { Event } from '@/types'

const CATEGORIES = ['concert', 'sports', 'theater', 'comedy', 'festival']

export default function EventSearch({
  initialEvents,
  initialParams,
}: {
  initialEvents: Event[]
  initialParams: { q?: string; category?: string }
}) {
  const router = useRouter()
  const [q, setQ] = useState(initialParams.q ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (initialParams.category) params.set('category', initialParams.category)
    router.push(`/events?${params.toString()}`)
  }

  function setCategory(cat: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (cat !== initialParams.category) params.set('category', cat)
    router.push(`/events?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search events, artists, teams…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={!initialParams.category ? 'default' : 'outline'}
          className="cursor-pointer capitalize"
          onClick={() => setCategory('')}
        >
          All
        </Badge>
        {CATEGORIES.map(cat => (
          <Badge
            key={cat}
            variant={initialParams.category === cat ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Results */}
      {initialEvents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No events found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialEvents.map((event: any) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{event.name}</h3>
                  {event.artist_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.artist_name}</p>
                  )}
                </div>
                {event.category && (
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">
                    {event.category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {event.venue && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.event_date), 'MMM d, yyyy')}
                </span>
              </div>
              {event.min_price != null && (
                <p className="text-xs text-primary font-medium mt-2">
                  From ${event.min_price.toFixed(2)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
