'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Business Profile', yelp: 'Yelp', yellowpages_us: 'Yellow Pages (US)',
  yellowpages_ca: 'Yellow Pages CA', yellowpages_au: 'Yellow Pages AU', bbb: 'Better Business Bureau',
  angi: 'Angi', thumbtack: 'Thumbtack', houzz: 'Houzz', nextdoor: 'Nextdoor Business',
  yell: 'Yell.com', thomsonlocal: 'Thomson Local', checkatrade: 'Checkatrade',
  bark_uk: 'Bark.com (UK)', homestars: 'HomeStars', '411ca': '411.ca',
  truelocal: 'True Local', hipages: 'HiPages', oneflare: 'Oneflare',
  yellow_nz: 'Yellow NZ', nocowboys: 'NoCowboys', finda: 'Finda.co.nz',
  goldenpages: 'Golden Pages', bark_ie: 'Bark.com (Ireland)',
  tripadvisor: 'TripAdvisor', facebook: 'Facebook Business Pages',
  foursquare: 'Foursquare', bing: 'Bing Places',
}

interface Props {
  scanId: string
  initialStatus: string
  platforms: string[]
}

export default function ScanProgress({ scanId, initialStatus, platforms }: Props) {
  const router = useRouter()

  const [leadsFound, setLeadsFound] = useState(0)
  const [duplicatesMerged, setDuplicatesMerged] = useState(0)
  const [platformsComplete, setPlatformsComplete] = useState<string[]>([])
  const [platformsError, setPlatformsError] = useState<string[]>([])
  const [status, setStatus] = useState(initialStatus)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`scan:${scanId}`)
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        setLeadsFound(payload.leadsFound ?? 0)
        setDuplicatesMerged(payload.duplicatesMerged ?? 0)
        setPlatformsComplete(payload.platformsComplete ?? [])
        setPlatformsError(payload.platformsError ?? [])
        if (payload.status) setStatus(payload.status)
      })
      .subscribe()

    // Also poll DB status every 5s as fallback
    const pollTimer = setInterval(async () => {
      const { data } = await supabase.from('scans').select('status,total_found,duplicates_merged').eq('id', scanId).single()
      if (data?.status === 'completed' || data?.status === 'failed') {
        setStatus(data.status)
        setLeadsFound(data.total_found ?? 0)
        setDuplicatesMerged(data.duplicates_merged ?? 0)
        clearInterval(pollTimer)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
  }, [scanId])

  const isComplete = status === 'completed' || status === 'failed'
  const progress = platforms.length > 0
    ? Math.round(((platformsComplete.length + platformsError.length) / platforms.length) * 100)
    : 0

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Main status card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4 mb-6">
          {isComplete ? (
            status === 'completed'
              ? <CheckCircle className="w-10 h-10 text-green-500" />
              : <XCircle className="w-10 h-10 text-red-500" />
          ) : (
            <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isComplete
                ? (status === 'completed' ? 'Scan complete!' : 'Scan failed')
                : 'Scanning directories…'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isComplete
                ? `Found ${leadsFound} leads in ${formatTime(elapsed)}`
                : `Elapsed: ${formatTime(elapsed)}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {!isComplete && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{platformsComplete.length + platformsError.length} / {platforms.length} platforms</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{leadsFound}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leads found</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{duplicatesMerged}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Duplicates merged</p>
          </div>
        </div>

        {/* Actions when complete */}
        {isComplete && (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            View leads in dashboard <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Platform status list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Platform status</h3>
        <div className="space-y-2">
          {platforms.map(platform => {
            const isOk = platformsComplete.includes(platform)
            const isErr = platformsError.includes(platform)
            const isRunning = !isOk && !isErr && !isComplete
            return (
              <div key={platform} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {PLATFORM_LABELS[platform] ?? platform}
                </span>
                <div className="flex items-center gap-2">
                  {isOk && <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle size={14} /> Done</span>}
                  {isErr && <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400"><XCircle size={14} /> Error</span>}
                  {isRunning && <span className="flex items-center gap-1 text-xs text-gray-400"><Loader2 size={14} className="animate-spin" /> Searching…</span>}
                  {isComplete && !isOk && !isErr && <span className="text-xs text-gray-400">Skipped</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
