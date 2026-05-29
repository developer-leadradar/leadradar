import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScanProgress from '@/components/scan/ScanProgress'

export const dynamic = 'force-dynamic'

export default async function ScanProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: scan } = await supabase.from('scans').select('*').eq('id', id).single()
  if (!scan) redirect('/dashboard')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Running</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Searching for {scan.filters?.category} businesses · {scan.filters?.countries?.join(', ')}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <ScanProgress scanId={id} initialStatus={scan.status} platforms={scan.filters?.platforms ?? []} />
      </div>
    </div>
  )
}
