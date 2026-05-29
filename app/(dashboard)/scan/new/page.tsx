import { createClient } from '@/lib/supabase/server'
import FilterBuilder from '@/components/scan/FilterBuilder'

export const dynamic = 'force-dynamic'

export default async function NewScanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

  const { data: presets } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">New Scan</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Find businesses with no website across multiple directories</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <FilterBuilder userId={userId} presets={presets ?? []} />
      </div>
    </div>
  )
}
