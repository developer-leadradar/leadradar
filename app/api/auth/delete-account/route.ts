import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete all user data from tables (cascade will handle related rows)
  // The user row deletion cascades to: leads, scans, call_logs, reminders, filter_presets, email_logs, audit_log
  await supabase.from('users').delete().eq('id', user.id)

  // Delete the auth user using the service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (serviceRoleKey && supabaseUrl) {
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey)
    await adminClient.auth.admin.deleteUser(user.id)
  }

  // Sign out the current session
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
