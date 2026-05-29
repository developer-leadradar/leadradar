import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // DEV_PREVIEW: skip auth check when using placeholder credentials
  const isPlaceholderEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  if (isPlaceholderEnv) {
    const placeholderProfile = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'demo@leadradar.app',
      full_name: 'Demo User',
      created_at: new Date().toISOString(),
      settings: {},
    }
    return <AppShell user={placeholderProfile}>{children}</AppShell>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell user={profile ?? { id: user.id, email: user.email!, full_name: null, created_at: '', settings: {} }}>
      {children}
    </AppShell>
  )
}
