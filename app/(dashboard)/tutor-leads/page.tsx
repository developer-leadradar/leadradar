import { createClient } from '@/lib/supabase/server'
import TutorLeadsClient from './TutorLeadsClient'

export const dynamic = 'force-dynamic'

export default async function TutorLeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

  const { data: leads, error } = await supabase
    .from('tutor_leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const tableExists = !error ||
    (!error.message.toLowerCase().includes('does not exist') &&
     !error.message.toLowerCase().includes('relation'))

  // Build direct link to Supabase SQL editor for this project
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard'

  return (
    <TutorLeadsClient
      userId={userId}
      initialLeads={leads ?? []}
      tableExists={tableExists}
      sqlEditorUrl={sqlEditorUrl}
    />
  )
}
