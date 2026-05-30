'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  GraduationCap, Plus, Search, X, ExternalLink, Copy,
  CheckCircle, Trash2, ChevronDown, ChevronUp, BookOpen,
  MessageSquare, Instagram, Linkedin, Globe, Users, DollarSign,
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

const SERVICE_LABELS: Record<ServiceType, string> = {
  tutoring: 'Tutoring',
  proofreading: 'Proofreading',
  coaching: 'Study Coaching',
  exam_prep: 'Exam Prep',
  research_guidance: 'Research Guidance',
}

const STATUS_CONFIG: Record<StudentStatus, { label: string; color: string }> = {
  inquiry:   { label: 'Inquiry',   color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  trial:     { label: 'Trial',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ongoing:   { label: 'Ongoing',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  lost:      { label: 'Lost',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  reddit:   <span className="text-orange-500">r/</span>,
  linkedin: <Linkedin size={12} className="text-blue-600" />,
  facebook: <Users size={12} className="text-blue-500" />,
  instagram:<Instagram size={12} className="text-pink-500" />,
  tiktok:   <span className="text-xs">♪</span>,
  referral: <span className="text-xs">👥</span>,
  direct:   <Globe size={12} className="text-gray-500" />,
  other:    <Globe size={12} className="text-gray-400" />,
}

// Lead-finding resources
const FINDING_SOURCES = [
  {
    category: 'Reddit',
    icon: <span className="text-orange-500 font-bold text-sm">r/</span>,
    color: 'orange',
    tips: [
      { label: 'r/UniUK', desc: 'UK university students asking for help', url: 'https://reddit.com/r/UniUK' },
      { label: 'r/college', desc: 'US college students, massive audience', url: 'https://reddit.com/r/college' },
      { label: 'r/learnmath', desc: 'Math help seekers worldwide', url: 'https://reddit.com/r/learnmath' },
      { label: 'r/HomeworkHelp', desc: 'Students needing subject guidance', url: 'https://reddit.com/r/HomeworkHelp' },
      { label: 'r/proofreading', desc: 'Direct proofreading requests', url: 'https://reddit.com/r/proofreading' },
    ],
  },
  {
    category: 'Facebook Groups',
    icon: <Users size={14} className="text-blue-500" />,
    color: 'blue',
    tips: [
      { label: 'Nigerian Students UK', desc: 'Nigerian students at UK universities', url: null },
      { label: 'International Students London', desc: 'Pan-university intl. student group', url: null },
      { label: 'University Study Groups', desc: 'Search "[University name] students"', url: null },
      { label: 'IELTS Preparation Groups', desc: 'Students preparing for IELTS', url: null },
    ],
  },
  {
    category: 'LinkedIn',
    icon: <Linkedin size={14} className="text-blue-600" />,
    color: 'sky',
    tips: [
      { label: 'Search: "Looking for tutor"', desc: 'Filter by university, degree level', url: null },
      { label: 'University alumni groups', desc: 'Students and recent graduates', url: null },
      { label: 'Post: "I offer tutoring for..."', desc: 'Inbound inquiries come to you', url: null },
    ],
  },
  {
    category: 'Instagram & TikTok',
    icon: <Instagram size={14} className="text-pink-500" />,
    color: 'pink',
    tips: [
      { label: '#studyabroad', desc: 'International students posting study content', url: null },
      { label: '#NigerianStudentsUK', desc: 'Nigerian diaspora student community', url: null },
      { label: '#unilife', desc: 'UK/US/AU university students', url: null },
      { label: 'Comment on study videos', desc: 'Offer free trial session in comments', url: null },
    ],
  },
]

const SQL_SETUP = `-- Run this in your Supabase SQL Editor to enable TutorLeads
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function TutorLeadsClient({ userId, initialLeads, tableExists }: Props) {
  const supabase = createClient()
  const [leads, setLeads] = useState<TutorLead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSqlSetup, setShowSqlSetup] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    student_name: '',
    contact: '',
    contact_type: 'email' as ContactType,
    university: '',
    country: '',
    subject: 'Mathematics',
    service_type: 'tutoring' as ServiceType,
    source: 'reddit' as LeadSource,
    hourly_rate: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Detail editing
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
  }, [detailId])

  const filtered = leads.filter(l => {
    const matchSearch = search === '' ||
      l.student_name.toLowerCase().includes(search.toLowerCase()) ||
      l.subject.toLowerCase().includes(search.toLowerCase()) ||
      (l.university ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const totalEarned = leads.reduce((s, l) => s + (l.total_earned ?? 0), 0)
  const activeLeads = leads.filter(l => ['trial', 'ongoing'].includes(l.status)).length
  const totalSessions = leads.reduce((s, l) => s + l.sessions_completed, 0)

  async function addLead() {
    if (!form.student_name.trim() || !form.contact.trim() || !form.subject) {
      toast.error('Name, contact, and subject are required')
      return
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
    setShowAddForm(false)
    setForm({ student_name: '', contact: '', contact_type: 'email', university: '', country: '', subject: 'Mathematics', service_type: 'tutoring', source: 'reddit', hourly_rate: '', notes: '' })
    toast.success('Student lead added')
  }

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
    toast.success('Lead deleted')
  }

  async function copyContact(val: string) {
    await navigator.clipboard.writeText(val)
    toast.success('Copied to clipboard')
  }

  function buildWhatsAppUrl(contact: string, name: string) {
    const digits = contact.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi ${name}, I saw you were looking for academic support. I offer ${form.service_type} sessions — would you like to discuss how I can help?`)
    return `https://wa.me/${digits}?text=${msg}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">TutorLeads</h1>
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full">Beta</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Find and manage students seeking tutoring, proofreading &amp; coaching</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSourcesOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <BookOpen size={14} /> Where to find students
          </button>
          <button onClick={() => setShowAddForm(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <Plus size={14} /> Add student lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* DB setup banner */}
        {!tableExists && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">One-time database setup required</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  The <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">tutor_leads</code> table doesn't exist yet.
                  Run this SQL in your Supabase dashboard to enable TutorLeads.
                </p>
                <button onClick={() => setShowSqlSetup(o => !o)}
                  className="text-xs font-medium text-amber-700 dark:text-amber-400 underline mb-3">
                  {showSqlSetup ? 'Hide SQL' : 'Show SQL to run'}
                </button>
                {showSqlSetup && (
                  <div className="relative">
                    <pre className="text-xs font-mono bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg p-4 overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {SQL_SETUP}
                    </pre>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(SQL_SETUP)
                        setCopiedSql(true); setTimeout(() => setCopiedSql(false), 2000)
                      }}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center gap-1">
                      {copiedSql ? <><CheckCircle size={11} /> Copied!</> : <><Copy size={11} /> Copy SQL</>}
                    </button>
                  </div>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Go to{' '}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">
                    supabase.com/dashboard
                  </a>{' '}
                  → SQL Editor → paste and run.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats bar */}
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

        {/* Where to find students panel */}
        {sourcesOpen && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Where to find students looking for academic support</h2>
              <button onClick={() => setSourcesOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FINDING_SOURCES.map(src => (
                <div key={src.category} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
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
                          <a href={tip.url} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">✓ What works best</p>
              <p className="text-xs text-green-700 dark:text-green-400">
                Search Reddit/Facebook for posts like "looking for tutor", "need help with essay", "study coaching",
                "proofreading needed". Reply with a short, helpful comment and a DM offer. Nigerian students in UK/US/AU
                universities are a particularly active group — search by their student communities.
                Post your own "I offer tutoring" content on LinkedIn and Instagram weekly.
              </p>
            </div>
          </div>
        )}

        {/* Add lead form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add student lead</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Student name *</label>
                <input value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} className={inputCls} placeholder="e.g. James Adeyemi" />
              </div>
              <div>
                <label className={labelCls}>Subject needed *</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputCls}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Service type *</label>
                <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value as ServiceType }))} className={inputCls}>
                  {Object.entries(SERVICE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lead source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))} className={inputCls}>
                  {(['reddit','linkedin','facebook','instagram','tiktok','referral','direct','other'] as LeadSource[]).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Contact *</label>
                <div className="flex gap-2">
                  <select value={form.contact_type} onChange={e => setForm(f => ({ ...f, contact_type: e.target.value as ContactType }))} className={inputCls + ' w-36 flex-shrink-0'}>
                    {(['email','whatsapp','instagram','reddit','linkedin','other'] as ContactType[]).map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} placeholder="Email, phone, @handle…" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Hourly rate ($)</label>
                <input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} className={inputCls} placeholder="25" min={0} />
              </div>
              <div>
                <label className={labelCls}>University / Institution</label>
                <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} className={inputCls} placeholder="e.g. University of Manchester" />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputCls} placeholder="e.g. United Kingdom" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={`${inputCls} resize-y`} placeholder="What are they struggling with? Deadlines? Budget?" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addLead} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : <><Plus size={14} /> Add lead</>}
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' pl-9'} placeholder="Search by name, subject, university…" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'inquiry', 'contacted', 'trial', 'ongoing', 'completed', 'lost'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Leads table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No student leads yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click "Where to find students" above to get started, then add leads manually.
            </p>
            <button onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
              <Plus size={14} /> Add first lead
            </button>
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
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-800 dark:text-gray-200">{lead.subject}</p>
                      <p className="text-xs text-gray-400">{SERVICE_LABELS[lead.service_type]}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[lead.status].color}`}>
                        {STATUS_CONFIG[lead.status].label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {lead.sessions_completed}
                      {lead.hourly_rate && <span className="text-xs text-gray-400"> · ${lead.hourly_rate}/hr</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
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
                      <button onClick={() => setDetailId(lead.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / edit slide-over */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDetailId(null)} />
          <div className="w-full sm:max-w-[480px] bg-white dark:bg-gray-900 flex flex-col h-full border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
            {/* Panel header */}
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
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {SOURCE_ICONS[detailLead.contact_type as LeadSource] ?? <MessageSquare size={12} />}
                    {detailLead.contact_type}:
                  </span>
                  <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{detailLead.contact}</span>
                  <button onClick={() => copyContact(detailLead.contact)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <Copy size={12} />
                  </button>
                  {detailLead.contact_type === 'whatsapp' && (
                    <a href={buildWhatsAppUrl(detailLead.contact, detailLead.student_name)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                </div>
                {detailLead.country && <p className="text-xs text-gray-400">{detailLead.country}</p>}
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Pipeline status</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(Object.keys(STATUS_CONFIG) as StudentStatus[]).map(s => (
                    <button key={s} onClick={() => setEditStatus(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        editStatus === s ? STATUS_CONFIG[s].color + ' ring-2 ring-offset-1 ring-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sessions & earnings */}
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

              {/* Next session */}
              <div>
                <label className={labelCls}>Next session date &amp; time</label>
                <input type="datetime-local" value={editNextSession} onChange={e => setEditNextSession(e.target.value)} className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className={`${inputCls} resize-y`} placeholder="Progress, needs, payment status…" />
              </div>

              {/* Actions */}
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
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Source & meta */}
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
