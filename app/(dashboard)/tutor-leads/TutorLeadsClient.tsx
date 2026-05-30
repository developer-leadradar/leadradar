'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  GraduationCap, Plus, Search, X, ExternalLink, Copy,
  CheckCircle, Trash2, BookOpen, MessageSquare, Instagram,
  Linkedin, Globe, Users, Radar, Play, RefreshCw,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────
type ServiceType = 'tutoring' | 'proofreading' | 'coaching' | 'exam_prep' | 'research_guidance'
type StudentStatus = 'inquiry' | 'contacted' | 'trial' | 'ongoing' | 'completed' | 'lost'
type ContactType = 'email' | 'whatsapp' | 'instagram' | 'reddit' | 'linkedin' | 'other'
type LeadSource = 'reddit' | 'linkedin' | 'facebook' | 'instagram' | 'referral' | 'direct' | 'tiktok' | 'other'

interface TutorLead {
  id: string
  user_id: string
  student_name: string
  contact: string
  contact_type: ContactType
  university: string | null
  country: string | null
  subject: string
  service_type: ServiceType
  status: StudentStatus
  hourly_rate: number | null
  sessions_completed: number
  total_earned: number | null
  source: LeadSource
  notes: string | null
  next_session_at: string | null
  created_at: string
}

interface ScanResult {
  found: number
  newLeads: number
  duplicatesSkipped: number
  subredditsSearched: string[]
  message: string
}

interface Props {
  userId: string
  initialLeads: TutorLead[]
  tableExists: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SUBJECTS = [
  'Mathematics', 'Statistics', 'Physics', 'Chemistry', 'Biology',
  'English Literature', 'Academic Writing', 'Proofreading / Editing',
  'Economics', 'Accounting', 'Business Studies', 'Law',
  'Computer Science / Programming', 'Engineering',
  'History', 'Psychology', 'Sociology', 'Political Science',
  'IELTS / TOEFL Prep', 'GMAT / GRE Prep', 'Study Coaching',
  'Research Methodology', 'Other',
]

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'proofreading', label: 'Proofreading' },
  { value: 'coaching', label: 'Study Coaching' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'research_guidance', label: 'Research Guidance' },
]
const SERVICE_LABELS = Object.fromEntries(SERVICE_OPTIONS.map(o => [o.value, o.label])) as Record<ServiceType, string>

const STATUS_CONFIG: Record<StudentStatus, { label: string; color: string }> = {
  inquiry:   { label: 'Inquiry',   color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  trial:     { label: 'Trial',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ongoing:   { label: 'Ongoing',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  lost:      { label: 'Lost',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  reddit:    <span className="text-orange-500 font-bold text-[10px]">r/</span>,
  linkedin:  <Linkedin size={11} className="text-blue-600" />,
  facebook:  <Users size={11} className="text-blue-500" />,
  instagram: <Instagram size={11} className="text-pink-500" />,
  tiktok:    <span className="text-[10px]">♪</span>,
  referral:  <span className="text-[10px]">👥</span>,
  direct:    <Globe size={11} className="text-gray-500" />,
  other:     <Globe size={11} className="text-gray-400" />,
}

// Subreddits to scan
const SUBREDDIT_OPTIONS = [
  { value: 'UniUK',       label: 'r/UniUK', desc: 'UK university students' },
  { value: 'college',     label: 'r/college', desc: 'US college students' },
  { value: 'HomeworkHelp',label: 'r/HomeworkHelp', desc: 'General subject help' },
  { value: 'proofreading',label: 'r/proofreading', desc: 'Proofreading requests' },
  { value: 'learnmath',   label: 'r/learnmath', desc: 'Math help seekers' },
  { value: 'GradSchool',  label: 'r/GradSchool', desc: 'Graduate students' },
  { value: 'AskAcademia', label: 'r/AskAcademia', desc: 'Academic questions' },
  { value: 'slatestarcodex', label: 'r/studytips', desc: 'Study tips seekers' },
  { value: 'IBO',         label: 'r/IBO', desc: 'IB students' },
  { value: 'alevel',      label: 'r/alevel', desc: 'A-Level students (UK)' },
  { value: '6thForm',     label: 'r/6thForm', desc: '6th form UK students' },
  { value: 'GCSE',        label: 'r/GCSE', desc: 'GCSE students (UK)' },
  { value: 'IELTS',       label: 'r/IELTS', desc: 'IELTS test takers' },
]

const SQL_SETUP = `-- Run this once in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.tutor_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name      TEXT NOT NULL,
  contact           TEXT NOT NULL,
  contact_type      TEXT DEFAULT 'email',
  university        TEXT,
  country           TEXT,
  subject           TEXT NOT NULL,
  service_type      TEXT DEFAULT 'tutoring',
  status            TEXT DEFAULT 'inquiry',
  hourly_rate       DECIMAL(10,2),
  sessions_completed INTEGER DEFAULT 0,
  total_earned      DECIMAL(10,2),
  source            TEXT DEFAULT 'direct',
  notes             TEXT,
  next_session_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tutor_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own tutor_leads" ON public.tutor_leads
  FOR ALL USING (auth.uid() = user_id);`

// Lead-finding tips
const FINDING_SOURCES = [
  {
    category: 'Reddit (auto-scanned)',
    icon: <span className="text-orange-500 font-bold text-sm">r/</span>,
    tips: [
      { label: 'r/UniUK', desc: 'UK university students asking for help', url: 'https://reddit.com/r/UniUK' },
      { label: 'r/HomeworkHelp', desc: 'Students needing subject guidance', url: 'https://reddit.com/r/HomeworkHelp' },
      { label: 'r/proofreading', desc: 'Direct proofreading requests', url: 'https://reddit.com/r/proofreading' },
      { label: 'r/IELTS', desc: 'IELTS preparation seekers', url: 'https://reddit.com/r/IELTS' },
    ],
  },
  {
    category: 'Facebook Groups (manual)',
    icon: <Users size={14} className="text-blue-500" />,
    tips: [
      { label: 'Nigerian Students UK', desc: 'Nigerian students at UK universities', url: null },
      { label: 'International Students London', desc: 'Pan-university international student group', url: null },
      { label: 'IELTS Preparation Groups', desc: 'Students preparing for IELTS', url: null },
    ],
  },
  {
    category: 'LinkedIn (manual)',
    icon: <Linkedin size={14} className="text-blue-600" />,
    tips: [
      { label: 'Search: "Looking for tutor"', desc: 'Filter by university, degree level', url: null },
      { label: 'Post weekly: "I offer tutoring for..."', desc: 'Inbound inquiries come to you', url: null },
    ],
  },
]

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TutorLeadsClient({ userId, initialLeads, tableExists }: Props) {
  const supabase = createClient()
  const [leads, setLeads] = useState<TutorLead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'leads' | 'scan' | 'manual' | 'tips'>('leads')

  // SQL setup
  const [showSql, setShowSql] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Scan form
  const [scanSubjects, setScanSubjects] = useState<string[]>(['Mathematics', 'Academic Writing'])
  const [scanServices, setScanServices] = useState<ServiceType[]>(['tutoring', 'proofreading'])
  const [scanSubreddits, setScanSubreddits] = useState<string[]>(['UniUK', 'HomeworkHelp', 'proofreading', 'college'])
  const [scanMaxResults, setScanMaxResults] = useState(50)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanElapsed, setScanElapsed] = useState(0)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Manual add form
  const [form, setForm] = useState({
    student_name: '', contact: '', contact_type: 'email' as ContactType,
    university: '', country: '', subject: 'Mathematics',
    service_type: 'tutoring' as ServiceType, source: 'reddit' as LeadSource,
    hourly_rate: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Detail panel
  const [detailId, setDetailId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<StudentStatus>('inquiry')
  const [editNotes, setEditNotes] = useState('')
  const [editSessions, setEditSessions] = useState('')
  const [editEarned, setEditEarned] = useState('')
  const [editNextSession, setEditNextSession] = useState('')
  const [savingDetail, setSavingDetail] = useState(false)
  const detailLead = leads.find(l => l.id === detailId)

  useEffect(() => {
    if (detailLead) {
      setEditStatus(detailLead.status)
      setEditNotes(detailLead.notes ?? '')
      setEditSessions(detailLead.sessions_completed.toString())
      setEditEarned(detailLead.total_earned?.toString() ?? '')
      setEditNextSession(detailLead.next_session_at ? detailLead.next_session_at.slice(0, 16) : '')
    }
  }, [detailId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current) }
  }, [])

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = q === '' ||
      l.student_name.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      (l.university ?? '').toLowerCase().includes(q) ||
      (l.notes ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const totalEarned = leads.reduce((s, l) => s + (l.total_earned ?? 0), 0)
  const activeLeads = leads.filter(l => ['trial', 'ongoing'].includes(l.status)).length
  const totalSessions = leads.reduce((s, l) => s + l.sessions_completed, 0)

  // ── Scan ──────────────────────────────────────────────────────────────────────
  async function runScan() {
    if (scanSubjects.length === 0) { toast.error('Select at least one subject'); return }
    if (scanSubreddits.length === 0) { toast.error('Select at least one subreddit'); return }

    setScanning(true)
    setScanResult(null)
    setScanElapsed(0)
    scanTimerRef.current = setInterval(() => setScanElapsed(e => e + 1), 1000)

    try {
      const res = await fetch('/api/tutor-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: scanSubjects,
          serviceTypes: scanServices,
          subreddits: scanSubreddits,
          maxResults: scanMaxResults,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Scan failed'); return }

      setScanResult(data)
      toast.success(`Added ${data.newLeads} new student leads`)

      // Reload leads from DB
      const { data: fresh } = await supabase
        .from('tutor_leads').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (fresh) setLeads(fresh as TutorLead[])

    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current)
      setScanning(false)
    }
  }

  function toggleSubject(s: string) {
    setScanSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleService(s: ServiceType) {
    setScanServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleSubreddit(s: string) {
    setScanSubreddits(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // ── Manual add ────────────────────────────────────────────────────────────────
  async function addLead() {
    if (!form.student_name.trim() || !form.contact.trim()) {
      toast.error('Name and contact are required'); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('tutor_leads').insert({
      user_id: userId,
      student_name: form.student_name.trim(),
      contact: form.contact.trim(),
      contact_type: form.contact_type,
      university: form.university.trim() || null,
      country: form.country.trim() || null,
      subject: form.subject,
      service_type: form.service_type,
      source: form.source,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      notes: form.notes.trim() || null,
      status: 'inquiry',
      sessions_completed: 0,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setLeads(prev => [data as TutorLead, ...prev])
    setForm({ student_name: '', contact: '', contact_type: 'email', university: '', country: '', subject: 'Mathematics', service_type: 'tutoring', source: 'reddit', hourly_rate: '', notes: '' })
    setActiveTab('leads')
    toast.success('Student lead added')
  }

  // ── Detail panel save ─────────────────────────────────────────────────────────
  async function saveDetail() {
    if (!detailLead) return
    setSavingDetail(true)
    const { error } = await supabase.from('tutor_leads').update({
      status: editStatus,
      notes: editNotes || null,
      sessions_completed: parseInt(editSessions) || 0,
      total_earned: editEarned ? parseFloat(editEarned) : null,
      next_session_at: editNextSession ? new Date(editNextSession).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', detailLead.id)
    setSavingDetail(false)
    if (error) { toast.error(error.message); return }
    setLeads(prev => prev.map(l => l.id === detailLead.id ? {
      ...l, status: editStatus, notes: editNotes || null,
      sessions_completed: parseInt(editSessions) || 0,
      total_earned: editEarned ? parseFloat(editEarned) : null,
      next_session_at: editNextSession ? new Date(editNextSession).toISOString() : null,
    } : l))
    toast.success('Saved')
    setDetailId(null)
  }

  async function deleteLead(id: string) {
    await supabase.from('tutor_leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setDetailId(null)
    toast.success('Lead removed')
  }

  async function copyText(val: string) {
    await navigator.clipboard.writeText(val)
    toast.success('Copied')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap size={20} className="text-indigo-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">TutorLeads</h1>
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full">Beta</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Automatically find students seeking tutoring, proofreading &amp; coaching</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'leads', label: 'My Leads', icon: <GraduationCap size={14} /> },
            { id: 'scan',  label: 'Find Students', icon: <Radar size={14} /> },
            { id: 'manual',label: 'Add Manually', icon: <Plus size={14} /> },
            { id: 'tips',  label: 'Where to Look', icon: <BookOpen size={14} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* DB setup banner */}
        {!tableExists && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">One-time database setup required</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Run this SQL in your{' '}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase SQL Editor</a>
              {' '}to enable TutorLeads.
            </p>
            <button onClick={() => setShowSql(o => !o)} className="text-xs font-medium text-amber-700 dark:text-amber-400 underline mb-2">
              {showSql ? 'Hide SQL' : 'Show SQL'}
            </button>
            {showSql && (
              <div className="relative mt-2">
                <pre className="text-xs font-mono bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg p-4 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{SQL_SETUP}</pre>
                <button onClick={async () => { await navigator.clipboard.writeText(SQL_SETUP); setCopiedSql(true); setTimeout(() => setCopiedSql(false), 2000) }}
                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 flex items-center gap-1">
                  {copiedSql ? <><CheckCircle size={11} /> Copied!</> : <><Copy size={11} /> Copy SQL</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SCAN TAB ── */}
        {activeTab === 'scan' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Find Students Automatically</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scans Reddit for genuine student posts asking for tutoring, proofreading or study help.
                  New students are added directly to your leads list.
                </p>
              </div>

              {/* Subjects */}
              <div>
                <label className={labelCls}>Subjects to find students for <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        scanSubjects.includes(s)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                {scanSubjects.length === 0 && <p className="text-xs text-red-500 mt-1">Select at least one subject</p>}
              </div>

              {/* Service type */}
              <div>
                <label className={labelCls}>Service type to match</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SERVICE_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => toggleService(o.value)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        scanServices.includes(o.value)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subreddits */}
              <div>
                <label className={labelCls}>Subreddits to scan <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUBREDDIT_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => toggleSubreddit(o.value)}
                      title={o.desc}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        scanSubreddits.includes(o.value)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                {scanSubreddits.length === 0 && <p className="text-xs text-red-500 mt-1">Select at least one subreddit</p>}
              </div>

              {/* Max results */}
              <div className="max-w-xs">
                <label className={labelCls}>Max results to scan</label>
                <select value={scanMaxResults} onChange={e => setScanMaxResults(Number(e.target.value))} className={inputCls}>
                  {[25, 50, 100, 150, 200].map(n => <option key={n} value={n}>{n} leads</option>)}
                </select>
              </div>

              {/* Start button */}
              <button
                onClick={runScan}
                disabled={scanning || scanSubjects.length === 0 || scanSubreddits.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors">
                {scanning
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning Reddit… {scanElapsed}s</>
                  : <><Radar size={16} /> Find Students Now</>}
              </button>

              <p className="text-xs text-gray-400">
                Uses Reddit&apos;s public search API — no API key needed. Finds posts where students are actively asking for help, then adds them as leads automatically. Duplicates are skipped.
              </p>
            </div>

            {/* Scan result */}
            {scanResult && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Scan complete</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  {[
                    { label: 'Posts found', value: scanResult.found },
                    { label: 'New leads added', value: scanResult.newLeads },
                    { label: 'Duplicates skipped', value: scanResult.duplicatesSkipped },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{s.value}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 dark:text-green-400">{scanResult.message}</p>
                <button onClick={() => setActiveTab('leads')} className="mt-3 text-xs font-medium text-green-700 dark:text-green-400 underline">
                  View leads →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add student lead manually</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Student name / username *</label>
                <input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} className={inputCls} placeholder="e.g. James Adeyemi or u/username123" />
              </div>
              <div>
                <label className={labelCls}>Subject *</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputCls}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Service type</label>
                <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value as ServiceType }))} className={inputCls}>
                  {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))} className={inputCls}>
                  {(['reddit','linkedin','facebook','instagram','tiktok','referral','direct','other'] as LeadSource[]).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Contact method</label>
                <select value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value as ContactType }))} className={inputCls}>
                  {(['email','whatsapp','instagram','reddit','linkedin','other'] as ContactType[]).map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Contact *</label>
                <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} placeholder="Email, phone, @handle, u/username…" />
              </div>
              <div>
                <label className={labelCls}>University / Institution</label>
                <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} className={inputCls} placeholder="e.g. University of Manchester" />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputCls} placeholder="e.g. United Kingdom" />
              </div>
              <div>
                <label className={labelCls}>Hourly rate ($)</label>
                <input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} className={inputCls} placeholder="25" min={0} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={`${inputCls} resize-y`} placeholder="What are they struggling with? Deadline? Budget?" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addLead} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : <><Plus size={14} /> Add lead</>}
              </button>
              <button onClick={() => setActiveTab('leads')} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* ── TIPS TAB ── */}
        {activeTab === 'tips' && (
          <div className="space-y-4">
            {FINDING_SOURCES.map(src => (
              <div key={src.category} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                  {src.icon}
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{src.category}</h3>
                </div>
                <div className="space-y-2">
                  {src.tips.map(tip => (
                    <div key={tip.label} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{tip.label}</p>
                        <p className="text-xs text-gray-400">{tip.desc}</p>
                      </div>
                      {tip.url && (
                        <a href={tip.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">✓ Best outreach message</p>
              <p className="text-xs text-green-700 dark:text-green-400">
                When you find a student post, reply: <em>"Hi! I saw you need help with [subject]. I offer [service] sessions and have helped many students at [university type] improve their grades. DM me for a free 30-minute trial session?"</em>
              </p>
            </div>
          </div>
        )}

        {/* ── LEADS TAB ── */}
        {activeTab === 'leads' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total leads', value: leads.length.toString(), color: 'text-indigo-600' },
                { label: 'Active students', value: activeLeads.toString(), color: 'text-green-600' },
                { label: 'Sessions done', value: totalSessions.toString(), color: 'text-amber-600' },
                { label: 'Total earned', value: `$${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, color: 'text-emerald-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' pl-9'} placeholder="Search name, subject, notes…" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'inquiry', 'contacted', 'trial', 'ongoing', 'completed', 'lost'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      statusFilter === s
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveTab('scan')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                <RefreshCw size={12} /> Run scan
              </button>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <GraduationCap size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {leads.length === 0 ? 'No student leads yet' : 'No leads match your filters'}
                </p>
                {leads.length === 0 && (
                  <button onClick={() => setActiveTab('scan')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                    <Radar size={14} /> Find students automatically
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Student</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Subject / Service</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Sessions</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Earned</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Source</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Added</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <button onClick={() => setDetailId(lead.id)} className="text-left">
                            <p className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">{lead.student_name}</p>
                            {lead.university && <p className="text-xs text-gray-400 truncate max-w-[180px]">{lead.university}</p>}
                            {lead.country && !lead.university && <p className="text-xs text-gray-400">{lead.country}</p>}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-800 dark:text-gray-200 text-xs">{lead.subject}</p>
                          <p className="text-xs text-gray-400">{SERVICE_LABELS[lead.service_type]}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[lead.status].color}`}>
                            {STATUS_CONFIG[lead.status].label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-700 dark:text-gray-300">
                          {lead.sessions_completed}
                          {lead.hourly_rate ? <span className="text-gray-400"> · ${lead.hourly_rate}/hr</span> : null}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-700 dark:text-gray-300">
                          {lead.total_earned ? `$${lead.total_earned.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            {SOURCE_ICONS[lead.source]} {lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => setDetailId(lead.id)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                  {filtered.length} lead{filtered.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `(${STATUS_CONFIG[statusFilter].label})` : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail slide-over */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDetailId(null)} />
          <div className="w-full sm:max-w-[480px] bg-white dark:bg-gray-900 flex flex-col h-full border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{detailLead.student_name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {detailLead.subject} · {SERVICE_LABELS[detailLead.service_type]}
                  {detailLead.university && ` · ${detailLead.university}`}
                </p>
              </div>
              <button onClick={() => setDetailId(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              {/* Contact */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {SOURCE_ICONS[detailLead.contact_type as LeadSource] ?? <MessageSquare size={11} />}
                    {detailLead.contact_type}:
                  </span>
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{detailLead.contact}</span>
                  <button onClick={() => copyText(detailLead.contact)} className="text-gray-400 hover:text-gray-600">
                    <Copy size={12} />
                  </button>
                  {detailLead.contact_type === 'whatsapp' && (
                    <a href={`https://wa.me/${detailLead.contact.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  {detailLead.contact_type === 'reddit' && (
                    <a href={`https://reddit.com/${detailLead.contact}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium hover:bg-orange-200 transition-colors">
                      <ExternalLink size={10} /> View on Reddit
                    </a>
                  )}
                </div>
                {detailLead.country && <p className="text-xs text-gray-400">{detailLead.country}</p>}
              </div>

              {/* Notes preview (shows scraped post content) */}
              {detailLead.notes && detailLead.source === 'reddit' && (
                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Scraped Reddit post</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{detailLead.notes}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <label className={labelCls}>Pipeline status</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(Object.keys(STATUS_CONFIG) as StudentStatus[]).map(s => (
                    <button key={s} onClick={() => setEditStatus(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        editStatus === s
                          ? STATUS_CONFIG[s].color + ' ring-2 ring-offset-1 ring-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sessions completed</label>
                  <input type="number" min={0} value={editSessions} onChange={e => setEditSessions(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Total earned ($)</label>
                  <input type="number" min={0} value={editEarned} onChange={e => setEditEarned(e.target.value)} className={inputCls} placeholder="0" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Next session date &amp; time</label>
                <input type="datetime-local" value={editNextSession} onChange={e => setEditNextSession(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className={`${inputCls} resize-y`} placeholder="Progress, payment status, follow-up notes…" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button onClick={saveDetail} disabled={savingDetail}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                    {savingDetail ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : 'Save changes'}
                  </button>
                  <button onClick={() => setDetailId(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    Cancel
                  </button>
                </div>
                <button onClick={() => { if (confirm(`Delete lead for ${detailLead.student_name}?`)) deleteLead(detailLead.id) }}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                Found via {detailLead.source} · Added {format(new Date(detailLead.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
