'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, X } from 'lucide-react'

interface Props { userId: string }

export default function StaleLeadsBanner({ userId }: Props) {
  const [count, setCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('pipeline_stage', 'interested')
      .lt('last_contacted_at', fiveDaysAgo)
      .then(({ count: c }) => setCount(c ?? 0))
  }, [userId])

  if (count === 0 || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">{count} interested lead{count !== 1 ? 's' : ''}</span>{' '}
          haven&apos;t been contacted in 5+ days
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
      >
        <X size={16} />
      </button>
    </div>
  )
}
