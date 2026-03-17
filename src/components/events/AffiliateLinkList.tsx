'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AffiliateLink } from '@/types'

export default function AffiliateLinkList({
  links,
  eventId,
}: {
  links: (AffiliateLink & { platform?: { name: string; logo_url: string | null } })[]
  eventId: string
}) {
  function handleClick(linkId: string) {
    // Fire-and-forget — the redirect API records the click and bounces to affiliate URL
    window.open(`/api/affiliate/${linkId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h2 className="font-semibold mb-1">Buy Tickets</h2>
      <p className="text-xs text-muted-foreground mb-4">
        We may earn a commission when you buy through these links — at no extra cost to you.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {links.map(link => (
          <Button
            key={link.id}
            variant="outline"
            className="h-auto py-3 flex flex-col gap-1 hover:border-primary/50"
            onClick={() => handleClick(link.id)}
          >
            <span className="font-medium text-sm">{link.platform?.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              View tickets
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
