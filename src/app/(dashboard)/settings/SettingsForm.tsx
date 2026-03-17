'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/types'

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const supabase = createClient()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ full_name: fullName, notify_email: notifyEmail })
      .eq('id', profile!.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={profile?.email ?? ''} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button type="submit" disabled={saving}>
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-muted-foreground">Get emailed when a price alert triggers</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !notifyEmail
                setNotifyEmail(next)
                await supabase
                  .from('profiles')
                  .update({ notify_email: next })
                  .eq('id', profile!.id)
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                notifyEmail ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                  notifyEmail ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium capitalize">{profile?.tier} plan</p>
              <p className="text-xs text-muted-foreground">
                {profile?.tier === 'free'
                  ? 'Track up to 3 events, 2 alerts'
                  : 'Track up to 50 events, 25 alerts'}
              </p>
            </div>
            {profile?.tier === 'free' && (
              <Button variant="outline" size="sm" disabled>
                Upgrade (coming soon)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
