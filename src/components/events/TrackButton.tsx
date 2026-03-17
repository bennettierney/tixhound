'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck } from 'lucide-react'

export default function TrackButton({
  eventId,
  isTracked,
  userId,
}: {
  eventId: string
  isTracked: boolean
  userId: string
}) {
  const router = useRouter()
  const [tracked, setTracked] = useState(isTracked)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleToggle() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tracking', {
        method: tracked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setTracked(!tracked)
        router.refresh()
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="shrink-0">
      <Button
        variant={tracked ? 'default' : 'outline'}
        className="gap-2"
        onClick={handleToggle}
        disabled={loading}
      >
        {tracked ? (
          <><BookmarkCheck className="w-4 h-4" /> Tracking</>
        ) : (
          <><Bookmark className="w-4 h-4" /> Track event</>
        )}
      </Button>
      {error && <p className="text-destructive text-xs mt-1 text-right max-w-48">{error}</p>}
    </div>
  )
}
