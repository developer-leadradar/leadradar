import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScansClient } from './ScansClient'

export const dynamic = 'force-dynamic'

export default async function ScansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isPlaceholderEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  if (!user && !isPlaceholderEnv) redirect('/login')

  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  return <ScansClient initialScans={scans ?? []} />
}
