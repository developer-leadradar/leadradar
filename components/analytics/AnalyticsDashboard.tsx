'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend,
  type TooltipProps,
} from 'recharts'
import { TrendingUp, Users, Phone, DollarSign, Target, Award, Download } from 'lucide-react'
import { format, subDays, eachDayOfInterval } from 'date-fns'

const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead', color: '#94a3b8' },
  { key: 'attempted', label: 'Attempted', color: '#64748b' },
  { key: 'connected', label: 'Connected', color: '#6366f1' },
  { key: 'interested', label: 'Interested', color: '#8b5cf6' },
  { key: 'demo_sent', label: 'Demo Sent', color: '#f59e0b' },
  { key: 'proposal_made', label: 'Proposal', color: '#f97316' },
  { key: 'committed', label: 'Committed', color: '#10b981' },
  { key: 'building', label: 'Building', color: '#059669' },
  { key: 'closed_won', label: 'Won', color: '#22c55e' },
  { key: 'closed_lost', label: 'Lost', color: '#ef4444' },
]

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
]

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`
)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MetricCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
  }
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`h-8 w-8 ${colorMap[color] ?? 'text-indigo-500'} opacity-80`} />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children, className = '' }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0
  const alpha = 0.1 + intensity * 0.9
  return (
    <div
      className="rounded-sm"
      style={{ backgroundColor: `rgba(34,197,94,${alpha})`, width: '100%', height: '100%' }}
      title={`${value} successful calls`}
    />
  )
}

// Typed tooltip formatter wrapper
function dollarFormatter(value: unknown): [string, string] {
  return [`$${Number(value ?? 0).toLocaleString()}`, '']
}

function percentFormatter(value: unknown): [string, string] {
  return [`${Number(value ?? 0)}%`, 'Win Rate']
}

function countFormatter(label: string) {
  return (value: unknown): [number, string] => [Number(value ?? 0), label]
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    totalCalls: 0,
    dealsWon: 0,
    revenue: 0,
    conversionRate: 0,
    avgDealValue: 0,
  })
  const [pipelineData, setPipelineData] = useState<{ stage: string; count: number; color: string }[]>([])
  const [callsPerDay, setCallsPerDay] = useState<{ date: string; calls: number }[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<{ range: string; count: number; color: string }[]>([])
  const [countryWinRate, setCountryWinRate] = useState<{ country: string; rate: number; total: number }[]>([])
  const [categoryWinRate, setCategoryWinRate] = useState<{ category: string; rate: number; total: number }[]>([])
  const [platformPerf, setPlatformPerf] = useState<{ platform: string; rate: number; total: number }[]>([])
  const [heatmapData, setHeatmapData] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)))
  const [revenueData, setRevenueData] = useState<{ date: string; actual: number; projected?: number }[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id ?? '00000000-0000-0000-0000-000000000000'

    const daysAgo = parseInt(range)
    const since = subDays(new Date(), daysAgo).toISOString()

    const [
      { data: leads },
      { data: calls },
    ] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', uid),
      supabase.from('call_logs').select('*').eq('user_id', uid).gte('called_at', since),
    ])

    if (!leads) { setLoading(false); return }

    // Metrics
    const wonLeads = leads.filter((l) => l.pipeline_stage === 'closed_won')
    const lostLeads = leads.filter((l) => l.pipeline_stage === 'closed_lost')
    const revenue = wonLeads.reduce((s, l) => s + (Number(l.deal_value) || 0), 0)
    const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0
    const avgDeal = wonLeads.length > 0 ? Math.round(revenue / wonLeads.length) : 0

    setMetrics({
      totalLeads: leads.length,
      totalCalls: calls?.length ?? 0,
      dealsWon: wonLeads.length,
      revenue,
      conversionRate,
      avgDealValue: avgDeal,
    })

    // Pipeline funnel
    const stageCounts = PIPELINE_STAGES.map((s) => ({
      stage: s.label,
      count: leads.filter((l) => l.pipeline_stage === s.key).length,
      color: s.color,
    })).filter((s) => s.count > 0)
    setPipelineData(stageCounts)

    // Calls per day
    const days = eachDayOfInterval({ start: subDays(new Date(), daysAgo - 1), end: new Date() })
    const callMap: Record<string, number> = {}
    ;(calls ?? []).forEach((c) => {
      const day = format(new Date(c.called_at), 'yyyy-MM-dd')
      callMap[day] = (callMap[day] ?? 0) + 1
    })
    setCallsPerDay(days.map((d) => ({
      date: format(d, 'MMM d'),
      calls: callMap[format(d, 'yyyy-MM-dd')] ?? 0,
    })))

    // Score distribution
    const bins = [
      { range: '0–20', min: 0, max: 20, color: '#94a3b8' },
      { range: '21–40', min: 21, max: 40, color: '#64748b' },
      { range: '41–60', min: 41, max: 60, color: '#f59e0b' },
      { range: '61–80', min: 61, max: 80, color: '#f97316' },
      { range: '81–100', min: 81, max: 100, color: '#22c55e' },
    ]
    setScoreDistribution(bins.map((b) => ({
      range: b.range,
      count: leads.filter((l) => l.lead_score >= b.min && l.lead_score <= b.max).length,
      color: b.color,
    })))

    // Country win rate
    const countries = [...new Set(leads.map((l) => l.country as string).filter((c): c is string => !!c))]
    setCountryWinRate(
      countries.map((c) => {
        const countryLeads = leads.filter((l) => l.country === c)
        const won = countryLeads.filter((l) => l.pipeline_stage === 'closed_won').length
        return { country: c, rate: Math.round((won / countryLeads.length) * 100), total: countryLeads.length }
      }).filter((c) => c.total >= 2).sort((a, b) => b.rate - a.rate)
    )

    // Category win rate (top 10)
    const cats = [...new Set(leads.map((l) => l.category as string).filter((c): c is string => !!c))]
    const catData = cats.map((c) => {
      const catLeads = leads.filter((l) => l.category === c)
      const won = catLeads.filter((l) => l.pipeline_stage === 'closed_won').length
      return { category: c, rate: Math.round((won / catLeads.length) * 100), total: catLeads.length }
    }).filter((c) => c.total >= 2).sort((a, b) => b.total - a.total).slice(0, 10)
    setCategoryWinRate(catData)

    // Platform performance
    const platforms: Record<string, { total: number; engaged: number }> = {}
    const engagedStages = new Set(['interested', 'demo_sent', 'proposal_made', 'committed', 'building', 'closed_won'])
    leads.forEach((l) => {
      const plist = (l.platforms_found_on ?? []) as string[]
      plist.forEach((p) => {
        if (!platforms[p]) platforms[p] = { total: 0, engaged: 0 }
        platforms[p].total++
        if (engagedStages.has(l.pipeline_stage)) platforms[p].engaged++
      })
    })
    setPlatformPerf(
      Object.entries(platforms)
        .filter(([, v]) => v.total >= 2)
        .map(([k, v]) => ({
          platform: k.charAt(0).toUpperCase() + k.slice(1),
          rate: Math.round((v.engaged / v.total) * 100),
          total: v.total,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 8)
    )

    // Heatmap: successful calls by day/hour
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0)) as number[][]
    ;(calls ?? []).filter((c) => c.outcome === 'interested').forEach((c) => {
      const d = new Date(c.called_at)
      const dayIndex = (d.getDay() + 6) % 7
      const hour = d.getHours()
      grid[dayIndex][hour]++
    })
    setHeatmapData(grid)

    // Revenue forecast
    const wonByDay: Record<string, number> = {}
    wonLeads.forEach((l) => {
      if (l.stage_updated_at) {
        const day = format(new Date(l.stage_updated_at), 'yyyy-MM-dd')
        wonByDay[day] = (wonByDay[day] ?? 0) + (Number(l.deal_value) || 0)
      }
    })
    const committed = leads.filter((l) => ['committed', 'building'].includes(l.pipeline_stage))
    const projectedTotal = committed.reduce((s, l) => s + (Number(l.deal_value) || Number(l.proposal_price) || 0), 0)

    let cumulativeRevenue = 0
    const revenueChartData = days.map((d, i) => {
      const dayKey = format(d, 'yyyy-MM-dd')
      cumulativeRevenue += wonByDay[dayKey] ?? 0
      const isLast = i === days.length - 1
      return {
        date: format(d, 'MMM d'),
        actual: cumulativeRevenue,
        projected: isLast ? cumulativeRevenue + projectedTotal : undefined,
      }
    })
    setRevenueData(revenueChartData)

    setLoading(false)
  }, [range])

  useEffect(() => { loadData() }, [loadData])

  function exportCSV() {
    window.location.href = '/api/leads/export?format=csv'
  }

  const maxHeatmap = Math.max(1, ...heatmapData.flat())

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-semibold">Analytics</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={Users} label="Total Leads" value={metrics.totalLeads.toLocaleString()} color="indigo" />
        <MetricCard icon={Phone} label="Calls Logged" value={metrics.totalCalls.toLocaleString()} sub={`last ${range} days`} color="blue" />
        <MetricCard icon={Award} label="Deals Won" value={metrics.dealsWon} color="green" />
        <MetricCard icon={DollarSign} label="Revenue" value={`$${metrics.revenue.toLocaleString()}`} color="green" />
        <MetricCard icon={Target} label="Conversion" value={`${metrics.conversionRate}%`} sub="leads → won" color="purple" />
        <MetricCard icon={TrendingUp} label="Avg Deal" value={metrics.avgDealValue > 0 ? `$${metrics.avgDealValue.toLocaleString()}` : '—'} color="amber" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Pipeline Funnel */}
        <ChartCard title="Pipeline Funnel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipelineData} layout="vertical" margin={{ left: 70, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={countFormatter('Leads')} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {pipelineData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Calls Per Day */}
        <ChartCard title={`Calls Per Day (Last ${range} Days)`}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={callsPerDay} margin={{ left: 0, right: 10 }}>
              <defs>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="calls" stroke="#6366f1" fill="url(#callsGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Score Distribution */}
        <ChartCard title="Lead Score Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={scoreDistribution} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={countFormatter('Leads')} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Win Rate by Country */}
        <ChartCard title="Win Rate by Country">
          {countryWinRate.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryWinRate} layout="vertical" margin={{ left: 80, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={percentFormatter} />
                <Bar dataKey="rate" fill="#6366f1" radius={[0, 4, 4, 0]}>
                  {countryWinRate.map((_, i) => (
                    <Cell key={i} fill={`hsl(${240 + i * 20}, 70%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5. Win Rate by Category */}
        <ChartCard title="Win Rate by Business Category (Top 10)">
          {categoryWinRate.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryWinRate} layout="vertical" margin={{ left: 100, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={percentFormatter} />
                <Bar dataKey="rate" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {categoryWinRate.map((entry, i) => {
                    const g = Math.round((entry.rate / 100) * 200)
                    return <Cell key={i} fill={`rgb(${130 - entry.rate}, ${g}, 100)`} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 6. Platform Performance */}
        <ChartCard title="Platform Performance (% Leads Reaching Interested+)">
          {platformPerf.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={platformPerf} layout="vertical" margin={{ left: 80, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={percentFormatter} />
                <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 7. Calling Hours Heatmap */}
        <ChartCard title="Best Calling Hours (Successful Outcomes by Day/Hour)" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="flex ml-10 mb-1">
                {HOUR_LABELS.map((h, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">
                    {i % 3 === 0 ? h : ''}
                  </div>
                ))}
              </div>
              {heatmapData.map((row, dayIdx) => (
                <div key={dayIdx} className="flex items-center mb-0.5 gap-0.5">
                  <div className="w-9 text-right text-xs text-muted-foreground pr-1">{DAY_LABELS[dayIdx]}</div>
                  {row.map((val, hourIdx) => (
                    <div key={hourIdx} className="flex-1 h-5">
                      <HeatmapCell value={val} max={maxHeatmap} />
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-xs text-muted-foreground">Less</span>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                  <div key={i} className="h-3 w-5 rounded-sm" style={{ backgroundColor: `rgba(34,197,94,${v})` }} />
                ))}
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* 8. Revenue Forecast */}
        <ChartCard title="Revenue (Actual + Projected)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData} margin={{ left: 20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip formatter={dollarFormatter} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Closed Revenue"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Projected (if all committed close)"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
