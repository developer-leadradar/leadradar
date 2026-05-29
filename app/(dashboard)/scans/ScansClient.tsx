'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { History, Loader2, RefreshCw, Trash2, ExternalLink, Play, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import type { Scan, ScanFilters } from '@/types'

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yelp: 'Yelp',
  yellow_pages: 'Yellow Pages',
  bbb: 'BBB',
  angi: 'Angi',
  thumbtack: 'Thumbtack',
  houzz: 'Houzz',
  nextdoor: 'Nextdoor',
  yell: 'Yell.com',
  thomson_local: 'Thomson Local',
  checkatrade: 'Checkatrade',
  bark: 'Bark.com',
  yellow_pages_ca: 'YP Canada',
  homestars: 'HomeStars',
  yelp_ca: 'Yelp CA',
  '411ca': '411.ca',
  yellow_pages_au: 'YP Australia',
  truelocal: 'True Local',
  hipages: 'HiPages',
  oneflare: 'Oneflare',
  yellow_nz: 'Yellow NZ',
  nocowboys: 'NoCowboys',
  finda: 'Finda.co.nz',
  golden_pages: 'Golden Pages',
  tripadvisor: 'TripAdvisor',
  facebook: 'Facebook',
  foursquare: 'Foursquare',
  bing: 'Bing Places',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    )
  }
  if (status === 'completed') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1">
        <CheckCircle className="h-3 w-3" />
        Completed
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1">
      <AlertTriangle className="h-3 w-3" />
      Failed
    </Badge>
  )
}

function ScanRow({ scan, onDelete, onRerun, onViewLeads }: {
  scan: Scan
  onDelete: (id: string) => void
  onRerun: (scan: Scan) => void
  onViewLeads: (scanId: string) => void
}) {
  const filters = scan.filters as ScanFilters
  const platforms = scan.platforms_searched ?? []
  const summary = [
    filters.category,
    filters.cities?.length ? filters.cities : null,
    filters.countries?.join(', '),
  ].filter(Boolean).join(' in ')

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{summary || 'Scan'}</p>
            <p className="text-xs text-muted-foreground mt-0.5" title={format(new Date(scan.created_at), 'PPpp')}>
              {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
            </p>
          </div>
          <StatusBadge status={scan.status} />
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {platforms.slice(0, 5).map((p) => (
              <Badge key={p} variant="outline" className="text-xs py-0 px-1.5">
                {PLATFORM_LABELS[p] ?? p}
              </Badge>
            ))}
            {platforms.length > 5 && (
              <Badge variant="outline" className="text-xs py-0 px-1.5">
                +{platforms.length - 5} more
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>{scan.total_found ?? 0} leads found</span>
            {(scan.duplicates_merged ?? 0) > 0 && (
              <span>{scan.duplicates_merged} merged</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {scan.status === 'running' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/scan/${scan.id}/progress`}
          >
            <Play className="h-3 w-3 mr-1" />
            View
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewLeads(scan.id)}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Leads
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRerun(scan)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-run
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => onDelete(scan.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function ScansClient({ initialScans }: { initialScans: Scan[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [scans, setScans] = useState<Scan[]>(initialScans)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('scans').delete().eq('id', deleteId)
    setScans((prev) => prev.filter((s) => s.id !== deleteId))
    setDeleteId(null)
    setDeleting(false)
    toast.success('Scan deleted')
  }

  function handleRerun(scan: Scan) {
    const params = new URLSearchParams()
    params.set('preset', JSON.stringify(scan.filters))
    router.push(`/scan/new?${params.toString()}`)
  }

  function handleViewLeads(scanId: string) {
    router.push(`/dashboard?scan_id=${scanId}`)
  }

  const runningCount = scans.filter((s) => s.status === 'running').length
  const completedCount = scans.filter((s) => s.status === 'completed').length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-semibold">Scan History</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount} completed · {runningCount} running
          </p>
        </div>
        <Button
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => router.push('/scan/new')}
        >
          New Scan
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            All scans ({scans.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <History className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="font-medium text-muted-foreground">No scans yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                Run your first scan to discover businesses with no website.
              </p>
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => router.push('/scan/new')}
              >
                Start First Scan
              </Button>
            </div>
          ) : (
            scans.map((scan) => (
              <ScanRow
                key={scan.id}
                scan={scan}
                onDelete={setDeleteId}
                onRerun={handleRerun}
                onViewLeads={handleViewLeads}
              />
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scan record. Leads discovered in this scan will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
