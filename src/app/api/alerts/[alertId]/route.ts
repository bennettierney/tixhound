import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  is_active: z.boolean().optional(),
  target_price: z.number().positive().optional(),
  condition: z.enum(['below', 'above', 'any_change']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { data, error } = await supabase
    .from('price_alerts')
    .update(parsed.data)
    .eq('id', alertId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
