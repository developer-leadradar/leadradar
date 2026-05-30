import { createClient } from '@/lib/supabase/server'
import TutorLeadsClient from './TutorLeadsClient'

export const dynamic = 'force-dynamic'

export default async function TutorLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

  // Try to fetch tutor leads — if table doesn't exist, pass empty array with setup flag
  const { data: leads, error } = await supabase
    .from('tutor_leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const tableExists = !error || !error.message.includes('does not exist')

  return (
    <TutorLeadsClient
      userId={userId}
      initialLeads={leads ?? []}
      tableExists={tableExists}
    />
  )
}
