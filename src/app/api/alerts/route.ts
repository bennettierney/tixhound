import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  eventId: z.string().min(1),
  targetPrice: z.number().positive(),
  condition: z.enum(['below', 'above', 'any_change']).default('below'),
  platformId: z.string().min(1).optional(),
  sectionFilter: z.string().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*, event:events(name, event_date), platform:platforms(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Check tier limit
  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  const { data: limits } = await supabase.from('tier_limits').select('max_alerts').eq('tier', profile?.tier ?? 'free').single()
  const { count } = await supabase.from('price_alerts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true)

  if (limits && count !== null && count >= limits.max_alerts) {
    return NextResponse.json(
      { error: `Free tier allows up to ${limits.max_alerts} active alerts.` },
      { status: 403 }
    )
  }

  const { data, error } = await supabase.from('price_alerts').insert({
    user_id: user.id,
    event_id: parsed.data.eventId,
    target_price: parsed.data.targetPrice,
    condition: parsed.data.condition,
    platform_id: parsed.data.platformId ?? null,
    section_filter: parsed.data.sectionFilter ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
