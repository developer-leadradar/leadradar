import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import StatsBar from '@/components/dashboard/StatsBar'
import StaleLeadsBanner from '@/components/dashboard/StaleLeadsBanner'
import LeadsTable from '@/components/dashboard/LeadsTable'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ scan_id?: string; lead?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  // Graceful fallback for preview/placeholder env — use a dummy UUID
  const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'
  const scanId = params.scan_id
  const openLeadId = params.lead

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {scanId ? 'Leads from selected scan' : 'All your leads in one place'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <StatsBar userId={userId} />
        </Suspense>

        <Suspense fallback={null}>
          <StaleLeadsBanner userId={userId} />
        </Suspense>

        <Suspense fallback={
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        }>
          <LeadsTable userId={userId} initialScanId={scanId} initialOpenLeadId={openLeadId} />
        </Suspense>
      </div>
    </div>
  )
}
