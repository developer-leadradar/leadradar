'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PipelineStageBadge } from '@/components/dashboard/PipelineStageBadge'
import { LocalTimeClock } from '@/components/dashboard/LocalTimeClock'
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel'
import { getBusinessHoursStatus, getCallingWindowsCalculated } from '@/lib/timezone'
import { getScoreTier } from '@/lib/scoring'
import { type Lead } from '@/types'
import {
  Phone,
  Copy,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

const STAGE_PRIORITY = ['interested', 'connected', 'call_back_later', 'new_lead', 'attempted']

function CallingWindowsPanel({ userTz }: { userTz: string }) {
  const [windows, setWindows] = useState(() => getCallingWindowsCalculated(userTz))

  useEffect(() => {
    const interval = setInterval(() => {
      setWindows(getCallingWindowsCalculated(userTz))
    }, 60_000)
    return () => clearInterval(interval)
  }, [userTz])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-indigo-500" />
          Best Calling Windows
        </CardTitle>
        <p className="text-xs text-muted-foreground">Your timezone: {userTz}</p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Column headers */}
        <div className="grid grid-cols-3 px-4 py-1.5 bg-muted/40 border-y text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Market</span>
          <span>Their hours</span>
          <span>Call from Lagos</span>
        </div>

        <div className="divide-y">
          {windows.map((w) => {
            const isActive = w.isActiveNow
            return (
              <div
                key={w.market}
                className={`grid grid-cols-3 items-center px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500'
                    : 'hover:bg-muted/30'
                }`}
              >
                {/* Market name */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className={`font-medium truncate ${isActive ? 'text-green-700 dark:text-green-400' : ''}`}>
                    {w.market}
                  </span>
                </div>

                {/* Their business hours */}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {w.marketHours}
                </span>

                {/* Your calling window */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                  }`}>
                    {w.yourCallTime}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-semibold shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Now
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TopCallCard({ lead, onCall }: { lead: Lead; onCall: (lead: Lead) => void }) {
  const [copied, setCopied] = useState(false)
  const status = lead.timezone ? getBusinessHoursStatus(lead.timezone) : 'closed'
  const tier = getScoreTier(lead.lead_score)
  const tierColor = tier === 'hot' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
    tier === 'warm' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'

  const daysSince = lead.last_contacted_at
    ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
    : 'Never contacted'

  function copyPhone() {
    if (lead.phone) {
      navigator.clipboard.writeText(lead.phone)
      setCopied(true)
      toast.success('Phone number copied')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="border-2 border-indigo-500 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{lead.business_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {lead.category} · {lead.city}{lead.state_province ? `, ${lead.state_province}` : ''}{lead.country ? ` · ${lead.country}` : ''}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tierColor}`}>
            {lead.lead_score} · {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lead.phone ? (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <Phone className="h-5 w-5 text-indigo-500 shrink-0" />
            <span className="font-mono text-lg font-semibold">{lead.phone}</span>
            <Button size="sm" variant="outline" onClick={copyPhone} className="ml-auto">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <AlertCircle className="h-4 w-4" />
            No phone number on record
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Local time</div>
            {lead.timezone ? (
              <LocalTimeClock timezone={lead.timezone} showDot />
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )}
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Status</div>
            <div className="flex items-center justify-center gap-1">
              <span className={`h-2 w-2 rounded-full ${
                status === 'good' ? 'bg-green-500' : status === 'early_late' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-xs font-medium">
                {status === 'good' ? 'Good time' : status === 'early_late' ? 'Early/Late' : 'Closed'}
              </span>
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Last contact</div>
            <span className="text-xs font-medium">{daysSince}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <PipelineStageBadge stage={lead.pipeline_stage as any} />
        </div>

        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-5 text-base"
          onClick={() => onCall(lead)}
        >
          <Phone className="h-5 w-5 mr-2" />
          Prepare to Call
        </Button>
      </CardContent>
    </Card>
  )
}

function QueueCard({ lead, onOpen }: { lead: Lead; onOpen: (lead: Lead) => void }) {
  const status = lead.timezone ? getBusinessHoursStatus(lead.timezone) : 'closed'
  const tier = getScoreTier(lead.lead_score)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
      onClick={() => onOpen(lead)}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${
        status === 'good' ? 'bg-green-500' : status === 'early_late' ? 'bg-amber-500' : 'bg-red-500'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{lead.business_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {lead.city}{lead.state_province ? `, ${lead.state_province}` : ''} · {lead.category}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {lead.timezone && (
          <span className="text-xs text-muted-foreground">
            <LocalTimeClock timezone={lead.timezone} compact />
          </span>
        )}
        <Badge
          variant="outline"
          className={`text-xs ${
            tier === 'hot' ? 'border-green-500 text-green-700 dark:text-green-300' :
              tier === 'warm' ? 'border-amber-500 text-amber-700 dark:text-amber-300' :
                'border-gray-400 text-gray-600'
          }`}
        >
          {lead.lead_score}
        </Badge>
        <PipelineStageBadge stage={lead.pipeline_stage as any} compact />
      </div>
    </div>
  )
}

export default function PriorityQueuePage() {
  const [topLead, setTopLead] = useState<Lead | null>(null)
  const [queue, setQueue] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [panelLeadId, setPanelLeadId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userTz, setUserTz] = useState('UTC')

  const loadQueue = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? '00000000-0000-0000-0000-000000000000'
    setUserId(uid)

    const { data: profile } = await supabase
      .from('users')
      .select('settings')
      .eq('id', uid)
      .single()

    const tz = profile?.settings?.timezone ?? 'UTC'
    setUserTz(tz)

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', uid)
      .in('pipeline_stage', STAGE_PRIORITY)
      .neq('dnc_status', 'flagged')
      .order('lead_score', { ascending: false })
      .limit(50)

    if (!leads) return

    const eligibleForTop = leads.filter((l) => {
      if (!['interested', 'connected', 'call_back_later'].includes(l.pipeline_stage)) return false
      if (l.last_contacted_at && l.last_contacted_at > yesterday) return false
      return true
    })

    if (eligibleForTop.length > 0) {
      setTopLead(eligibleForTop[0] as Lead)
    }

    setQueue(leads as Lead[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadQueue()
    const interval = setInterval(loadQueue, 60_000)
    return () => clearInterval(interval)
  }, [loadQueue])

  function openLead(lead: Lead) {
    setPanelLeadId(lead.id)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-6 w-6 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-semibold">Priority Queue</h1>
          <p className="text-sm text-muted-foreground">Your highest-priority leads to call today</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={loadQueue}>
          <Clock className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {topLead ? (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Call This Now
              </h2>
              <TopCallCard lead={topLead} onCall={openLead} />
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No high-priority leads need attention right now. Check back later.
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Queue for Today ({queue.length})
            </h2>
            <Card>
              {queue.length === 0 ? (
                <CardContent className="py-8 text-center text-muted-foreground">
                  No leads in your queue. Run a scan to find leads.
                </CardContent>
              ) : (
                <div>
                  {queue.map((lead) => (
                    <QueueCard key={lead.id} lead={lead} onOpen={openLead} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Calling Windows
          </h2>
          <CallingWindowsPanel userTz={userTz} />
        </div>
      </div>

      {panelLeadId && userId && (
        <LeadDetailPanel
          leadId={panelLeadId}
          userId={userId}
          onClose={() => {
            setPanelLeadId(null)
            loadQueue()
          }}
        />
      )}
    </div>
  )
}
