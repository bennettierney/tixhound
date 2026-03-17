'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AlertToggle({
  alertId,
  isActive,
}: {
  alertId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [active, setActive] = useState(isActive)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const res = await fetch(`/api/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !active }),
    })
    if (res.ok) {
      setActive(!active)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
        active ? 'bg-primary' : 'bg-muted'
      } ${loading ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
          active ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
