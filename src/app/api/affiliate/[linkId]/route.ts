import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params
  const supabase = await createClient()

  const { data: link } = await supabase
    .from('affiliate_links')
    .select('url, is_active')
    .eq('id', linkId)
    .single()

  if (!link || !link.is_active) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Record click (async, non-blocking)
  const { data: { user } } = await supabase.auth.getUser()
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? ''
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null

  supabase.from('affiliate_clicks').insert({
    link_id: linkId,
    user_id: user?.id ?? null,
    referrer: req.headers.get('referer'),
    user_agent: req.headers.get('user-agent'),
    ip_hash: ipHash,
  }).then(() => {})

  return NextResponse.redirect(link.url, { status: 302 })
}
