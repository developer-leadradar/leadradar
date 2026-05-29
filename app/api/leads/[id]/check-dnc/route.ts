import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkDNC } from '@/lib/dnc'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead } = await supabase.from('leads').select('phone,user_id').eq('id', id).single()
  if (!lead || lead.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!lead.phone) return NextResponse.json({ status: 'unknown', message: 'No phone number' })

  const result = await checkDNC(lead.phone)
  await supabase.from('leads').update({ dnc_status: result.status, dnc_checked: true }).eq('id', id)

  return NextResponse.json(result)
}
