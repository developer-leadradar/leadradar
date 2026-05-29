'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Phone, Mail, Bell, Eye, Star, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, X, Trash2, RefreshCw, Download,
} from 'lucide-react'
import PipelineStageBadge, { ALL_STAGES, getStageName } from './PipelineStageBadge'
import LocalTimeClock from './LocalTimeClock'
import LeadDetailPanel from './LeadDetailPanel'
import { getScoreTier } from '@/lib/scoring'
import type { Lead, PipelineStage } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', NZ: '🇳🇿', IE: '🇮🇪',
}

const PAGE_SIZES = [25, 50, 100]

type SortField = 'lead_score' | 'business_name' | 'created_at' | 'last_contacted_at' | 'next_call_at' | 'rating' | 'review_count'

interface Props { userId: string; initialScanId?: string; initialOpenLeadId?: string }

export default function LeadsTable({ userId, initialScanId, initialOpenLeadId }: Props) {
  const supabase = createClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage[]>([])
  const [countryFilter, setCountryFilter] = useState<string[]>([])
  const [scoreFilter, setScoreFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Sort & pagination
  const [sortField, setSortField] = useState<SortField>('lead_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState<PipelineStage | ''>('')

  // Detail panel
  const [panelLeadId, setPanelLeadId] = useState<string | null>(initialOpenLeadId ?? null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    if (initialScanId) q = q.eq('scan_id', initialScanId)
    if (debouncedSearch) {
      q = q.or(`business_name.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`)
    }
    if (stageFilter.length > 0) q = q.in('pipeline_stage', stageFilter)
    if (countryFilter.length > 0) q = q.in('country_code', countryFilter)
    if (scoreFilter === 'hot') q = q.gte('lead_score', 80)
    else if (scoreFilter === 'warm') q = q.gte('lead_score', 50).lt('lead_score', 80)
    else if (scoreFilter === 'cold') q = q.lt('lead_score', 50)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')

    q = q.order(sortField, { ascending: sortDir === 'asc' })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    const { data, count, error } = await q
    if (!error) {
      setLeads(data as Lead[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [userId, debouncedSearch, stageFilter, countryFilter, scoreFilter, dateFrom, dateTo, sortField, sortDir, page, pageSize, initialScanId])

  useEffect(() => { setPage(0) }, [debouncedSearch, stageFilter, countryFilter, scoreFilter, dateFrom, dateTo, sortField, sortDir, pageSize])
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` }, () => {
        fetchLeads()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchLeads])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-gray-400" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-indigo-600" />
      : <ChevronDown size={12} className="text-indigo-600" />
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map(l => l.id)))
  }

  async function bulkChangeStage() {
    if (!bulkStage || selected.size === 0) return
    const { error } = await supabase
      .from('leads')
      .update({ pipeline_stage: bulkStage, stage_updated_at: new Date().toISOString() })
      .in('id', Array.from(selected))
      .eq('user_id', userId)
    if (error) { toast.error(error.message); return }
    toast.success(`Updated ${selected.size} lead${selected.size > 1 ? 's' : ''}`)
    setSelected(new Set()); setBulkStage('')
    fetchLeads()
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} lead${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    const { error } = await supabase.from('leads').delete().in('id', Array.from(selected)).eq('user_id', userId)
    if (error) { toast.error(error.message); return }
    toast.success(`Deleted ${selected.size} lead${selected.size > 1 ? 's' : ''}`)
    setSelected(new Set()); fetchLeads()
  }

  async function changeStageInline(leadId: string, stage: PipelineStage) {
    await supabase.from('leads').update({ pipeline_stage: stage, stage_updated_at: new Date().toISOString() }).eq('id', leadId)
    fetchLeads()
  }

  async function copyPhone(phone: string) {
    await navigator.clipboard.writeText(phone)
    toast.success('Phone number copied')
  }

  function exportCSV() {
    const headers = ['Business Name','Category','City','State','Country','Phone','Email','Rating','Reviews','Score','Stage','Platforms','Last Contact','Created At']
    const rows = leads.map(l => [
      l.business_name, l.category, l.city, l.state_province, l.country,
      l.phone, l.email, l.rating, l.review_count, l.lead_score,
      l.pipeline_stage, (l.platforms_found_on ?? []).join(';'),
      l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : '',
      new Date(l.created_at).toLocaleDateString(),
    ].map(v => `"${v ?? ''}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leadradar-leads-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const activeFilterCount = [
    stageFilter.length > 0, countryFilter.length > 0,
    scoreFilter !== 'all', dateFrom, dateTo,
  ].filter(Boolean).length

  function clearFilters() {
    setStageFilter([]); setCountryFilter([]); setScoreFilter('all'); setDateFrom(''); setDateTo(''); setSearch('')
  }

  const totalPages = Math.ceil(total / pageSize)

  function relativeTime(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  }

  function scoreBadge(score: number) {
    const tier = getScoreTier(score)
    const cls = tier === 'hot' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : tier === 'warm' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    const label = tier === 'hot' ? 'Hot' : tier === 'warm' ? 'Warm' : 'Cold'
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${cls}`}>
        {score} <span className="font-normal opacity-70">{label}</span>
      </span>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

      {/* Filter bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, city, category, phone…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stage filter */}
        <select
          multiple
          value={stageFilter}
          onChange={e => setStageFilter(Array.from(e.target.selectedOptions, o => o.value as PipelineStage))}
          className="h-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 hidden"
        />

        {/* Score filter */}
        {(['all','hot','warm','cold'] as const).map(tier => (
          <button key={tier} onClick={() => setScoreFilter(tier)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              scoreFilter === tier
                ? tier === 'hot' ? 'bg-green-600 text-white'
                  : tier === 'warm' ? 'bg-amber-500 text-white'
                  : tier === 'cold' ? 'bg-gray-600 text-white'
                  : 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}

        {/* Sort */}
        <select value={sortField} onChange={e => setSortField(e.target.value as SortField)}
          className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none">
          <option value="lead_score">Sort: Score</option>
          <option value="business_name">Sort: Name</option>
          <option value="created_at">Sort: Date added</option>
          <option value="last_contacted_at">Sort: Last contact</option>
          <option value="next_call_at">Sort: Next call</option>
          <option value="rating">Sort: Rating</option>
          <option value="review_count">Sort: Reviews</option>
        </select>

        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          {sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            <X size={12} /> Clear filters ({activeFilterCount})
          </button>
        )}

        <button onClick={exportCSV}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <Download size={12} /> Export
        </button>

        <select value={pageSize} onChange={e => setPageSize(parseInt(e.target.value))}
          className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none">
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>

        <button onClick={fetchLeads}
          className={`p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${loading ? 'animate-spin' : ''}`}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
            {selected.size} selected
          </span>
          <select value={bulkStage} onChange={e => setBulkStage(e.target.value as PipelineStage)}
            className="px-2 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none">
            <option value="">Change stage…</option>
            {ALL_STAGES.map(s => <option key={s} value={s}>{getStageName(s)}</option>)}
          </select>
          {bulkStage && (
            <button onClick={bulkChangeStage}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Apply
            </button>
          )}
          <button onClick={bulkDelete}
            className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="py-3 pl-4 pr-2 w-8">
                <input type="checkbox" checked={selected.size > 0 && selected.size === leads.length}
                  onChange={toggleSelectAll} className="rounded border-gray-300 text-indigo-600" />
              </th>
              <th className="py-3 px-3 text-left">
                <button onClick={() => toggleSort('lead_score')} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Score <SortIcon field="lead_score" />
                </button>
              </th>
              <th className="py-3 px-3 text-left min-w-48">
                <button onClick={() => toggleSort('business_name')} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Business <SortIcon field="business_name" />
                </button>
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Location</th>
              <th className="py-3 px-3 text-left">
                <button onClick={() => toggleSort('rating')} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Rating <SortIcon field="rating" />
                </button>
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Local time</th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Stage</th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Sources</th>
              <th className="py-3 px-3 text-left">
                <button onClick={() => toggleSort('last_contacted_at')} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Last contact <SortIcon field="last_contacted_at" />
                </button>
              </th>
              <th className="py-3 px-3 text-left">
                <button onClick={() => toggleSort('next_call_at')} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  Next call <SortIcon field="next_call_at" />
                </button>
              </th>
              <th className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 13 }).map((_, j) => (
                    <td key={j} className="py-3 px-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">No leads found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters or run a new scan</p>
                </td>
              </tr>
            ) : leads.map(lead => (
              <tr key={lead.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selected.has(lead.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>

                <td className="py-3 pl-4 pr-2">
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                    className="rounded border-gray-300 text-indigo-600" />
                </td>

                <td className="py-3 px-3">{scoreBadge(lead.lead_score)}</td>

                <td className="py-3 px-3">
                  <button onClick={() => setPanelLeadId(lead.id)}
                    className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left max-w-48 truncate block">
                    {lead.business_name}
                  </button>
                </td>

                <td className="py-3 px-3 text-gray-600 dark:text-gray-400 text-xs truncate max-w-32">{lead.category ?? '—'}</td>

                <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {COUNTRY_FLAGS[lead.country_code ?? ''] ?? ''} {[lead.city, lead.state_province].filter(Boolean).join(', ')}
                </td>

                <td className="py-3 px-3 whitespace-nowrap text-xs">
                  {lead.rating ? (
                    <span className="flex items-center gap-1">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      {lead.rating.toFixed(1)}
                      <span className="text-gray-400">({lead.review_count?.toLocaleString()})</span>
                    </span>
                  ) : '—'}
                </td>

                <td className="py-3 px-3">
                  {lead.phone ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyPhone(lead.phone!)}
                        className="font-mono text-xs text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                        {lead.phone}
                      </button>
                      {lead.dnc_status === 'flagged' && (
                        <span title="DNC flagged" className="text-red-500 text-xs">⚠</span>
                      )}
                    </div>
                  ) : <span className="text-xs text-gray-400">No phone</span>}
                </td>

                <td className="py-3 px-3">
                  <LocalTimeClock timezone={lead.timezone} />
                </td>

                <td className="py-3 px-3">
                  <StageDropdown lead={lead} onChange={stage => changeStageInline(lead.id, stage)} />
                </td>

                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1 max-w-32">
                    {(lead.platforms_found_on ?? []).slice(0, 3).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                        {p === 'google' ? 'G' : p === 'yelp' ? 'Y' : p.slice(0, 4)}
                      </span>
                    ))}
                    {(lead.platforms_found_on ?? []).length > 3 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded text-xs">
                        +{(lead.platforms_found_on ?? []).length - 3}
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {relativeTime(lead.last_contacted_at)}
                </td>

                <td className="py-3 px-3 whitespace-nowrap">
                  {lead.next_call_at ? (
                    <span className={`text-xs ${new Date(lead.next_call_at) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {new Date(lead.next_call_at).toLocaleDateString()}
                    </span>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <ActionBtn icon={Phone} title="Log call" onClick={() => setPanelLeadId(lead.id)} />
                    <ActionBtn icon={Mail} title="Email outreach" onClick={() => setPanelLeadId(lead.id)} />
                    <ActionBtn icon={Bell} title="Add reminder" onClick={() => setPanelLeadId(lead.id)} />
                    <ActionBtn icon={Eye} title="View detail" onClick={() => setPanelLeadId(lead.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()} leads
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Lead detail slide-over */}
      {panelLeadId && (
        <LeadDetailPanel
          leadId={panelLeadId}
          userId={userId}
          onClose={() => { setPanelLeadId(null); fetchLeads() }}
        />
      )}
    </div>
  )
}

// ── Inline stage dropdown ────────────────────────────────────────────────────
function StageDropdown({ lead, onChange }: { lead: Lead; onChange: (s: PipelineStage) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}>
        <PipelineStageBadge stage={lead.pipeline_stage} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg py-1">
            {ALL_STAGES.map(s => (
              <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${lead.pipeline_stage === s ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                <PipelineStageBadge stage={s} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ActionBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <Icon size={13} />
    </button>
  )
}
