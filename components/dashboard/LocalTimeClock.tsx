'use client'

import { useState, useEffect } from 'react'
import { getBusinessHoursStatus, getLocalTime } from '@/lib/timezone'

interface Props {
  timezone: string | null
  showDot?: boolean
  compact?: boolean
}

export function LocalTimeClock({ timezone, showDot = true, compact = false }: Props) {
  const [time, setTime] = useState('')
  const [status, setStatus] = useState<'good' | 'early_late' | 'closed'>('closed')

  function update() {
    if (!timezone) return
    setTime(getLocalTime(timezone))
    setStatus(getBusinessHoursStatus(timezone))
  }

  useEffect(() => {
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone])

  if (!timezone || !time) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const dot =
    status === 'good' ? 'bg-green-500'
    : status === 'early_late' ? 'bg-amber-500'
    : 'bg-red-500'

  if (compact) {
    return <span className="text-xs font-mono">{time}</span>
  }

  return (
    <span className="flex items-center gap-1.5">
      {showDot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />}
      <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{time}</span>
    </span>
  )
}

// Keep default export for backward compatibility
export default LocalTimeClock
