import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ eventId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { eventId } = parsed.data

  // Check tier limit
  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  const { data: limits } = await supabase.from('tier_limits').select('max_tracked_events').eq('tier', profile?.tier ?? 'free').single()
  const { count } = await supabase.from('user_tracked_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

  if (limits && count !== null && count >= limits.max_tracked_events) {
    return NextResponse.json(
      { error: `Free tier allows tracking up to ${limits.max_tracked_events} events. Upgrade to track more.` },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('user_tracked_events')
    .insert({ user_id: user.id, event_id: eventId })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already tracking this event' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { error } = await supabase
    .from('user_tracked_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', parsed.data.eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
