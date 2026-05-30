'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  X, Phone, Copy, ExternalLink, Mail, Bell, AlertTriangle,
  ChevronDown, ChevronUp, Clock, Star, CheckCircle, Plus, Trash2
} from 'lucide-react'
import PipelineStageBadge, { ALL_STAGES } from './PipelineStageBadge'
import LocalTimeClock from './LocalTimeClock'
import { getBusinessHoursStatus, getLocalDateTime } from '@/lib/timezone'
import { getScoreBreakdown } from '@/lib/scoring'
import type { Lead, CallLog, Reminder, PipelineStage, CallOutcome, ReminderType } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'

const CALL_OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'no_answer',      label: 'No answer' },
  { value: 'voicemail',      label: 'Voicemail' },
  { value: 'interested',     label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'call_back',      label: 'Call back' },
  { value: 'wrong_number',   label: 'Wrong number' },
  { value: 'disconnected',   label: 'Disconnected' },
  { value: 'closed',         label: 'Closed' },
]

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  interested:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed:         'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  voicemail:      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  call_back:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  no_answer:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  not_interested: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  wrong_number:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  disconnected:   'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
}

const EMAIL_TEMPLATES = {
  intro: {
    label: 'Introduction',
    subject: "Quick question about {business_name}'s online presence",
    body: `Hi there,\n\nI came across {business_name} while searching for {category} businesses in {city} and noticed you may not have a website yet.\n\nI build professional websites for local businesses and would love to show you what I could create specifically for {business_name} — completely free to see, no commitment required.\n\nWould you be open to a quick 5-minute conversation this week?\n\nBest regards,\n[Your Name]`,
  },
  followup: {
    label: 'Follow-up',
    subject: "Following up — {business_name}'s website",
    body: `Hi again,\n\nI reached out a few days ago about building a website for {business_name}. I wanted to follow up in case my last message got buried.\n\nI genuinely think a professional website could make a real difference for your business in {city}. I'd love to show you a quick demo — no cost, no pressure.\n\nWould this week work for a brief chat?\n\nBest regards,\n[Your Name]`,
  },
  demo: {
    label: 'Demo Invitation',
    subject: 'I built a demo website for {business_name}',
    body: `Hi there,\n\nI took the liberty of building a quick demo website for {business_name} — it only takes 30 seconds to look at and I think you'll like what you see.\n\nYou can view it here: {demo_url}\n\nIf you love it, we can talk about turning it into your live website. If it's not quite right, I can adjust it to match your vision exactly.\n\nWhat do you think?\n\nBest regards,\n[Your Name]`,
  },
} as const

function replaceTokens(text: string, lead: { business_name?: string; category?: string | null; city?: string | null; demo_url?: string | null }): string {
  return text
    .replace(/{business_name}/g, lead.business_name ?? '')
    .replace(/{category}/g, lead.category ?? '')
    .replace(/{city}/g, lead.city ?? '')
    .replace(/{demo_url}/g, lead.demo_url ?? '[demo URL not set — add it in Demo & Proposal]')
}

interface Props { leadId: string; userId: string; onClose: () => void }

export default function LeadDetailPanel({ leadId, userId, onClose }: Props) {
  const supabase = createClient()
  const [lead, setLead] = useState<Lead | null>(null)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  // Call log form
  const [logOpen, setLogOpen] = useState(false)
  const [logOutcome, setLogOutcome] = useState<CallOutcome>('no_answer')
  const [logDuration, setLogDuration] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logFollowUp, setLogFollowUp] = useState(false)
  const [logFollowUpDate, setLogFollowUpDate] = useState('')
  const [savingLog, setSavingLog] = useState(false)

  // Stage
  const [stageOpen, setStageOpen] = useState(false)

  // Notes auto-save
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Demo & proposal
  const [demoUrl, setDemoUrl] = useState('')
  const [demoStatus, setDemoStatus] = useState(0)
  const [proposalPackage, setProposalPackage] = useState('')
  const [proposalPrice, setProposalPrice] = useState('')
  const [proposalSent, setProposalSent] = useState(false)
  const [commitmentFee, setCommitmentFee] = useState(false)
  const [commitmentAmount, setCommitmentAmount] = useState('')

  // Reminders
  const [reminderOpen, setReminderOpen] = useState(false)
  const [remType, setRemType] = useState<ReminderType>('call')
  const [remDate, setRemDate] = useState('')
  const [remMessage, setRemMessage] = useState('')

  // Call action
  const [callPrepOpen, setCallPrepOpen] = useState(false)
  const [dncModalOpen, setDncModalOpen] = useState(false)
  const [enriching, setEnriching] = useState(false)

  // Email outreach
  const [emailLogs, setEmailLogs] = useState<Array<{ id: string; sent_at: string; subject: string; template: string; to_email: string; status: string }>>([])
  const [emailPanelOpen, setEmailPanelOpen] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState<'intro' | 'followup' | 'demo'>('intro')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Score breakdown
  const [scoreOpen, setScoreOpen] = useState(false)

  async function fetchData() {
    const [{ data: l }, { data: cl }, { data: rem }, { data: el }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('call_logs').select('*').eq('lead_id', leadId).order('called_at', { ascending: false }),
      supabase.from('reminders').select('*').eq('lead_id', leadId).order('scheduled_for'),
      supabase.from('email_logs').select('id,sent_at,subject,template,to_email,status').eq('lead_id', leadId).order('sent_at', { ascending: false }),
    ])
    if (l) {
      setLead(l as Lead)
      setNotes(l.notes ?? '')
      setDemoUrl(l.demo_url ?? '')
      setProposalPackage(l.proposal_package ?? '')
      setProposalPrice(l.proposal_price?.toString() ?? '')
      setProposalSent(!!l.proposal_sent_at)
      setCommitmentFee(l.commitment_fee_received ?? false)
      setCommitmentAmount(l.commitment_fee_amount?.toString() ?? '')
      const demoIdx = [null, 'built', 'sent', 'reviewed'].indexOf(
        l.demo_built_at ? (l.demo_sent_at ? (l.demo_reviewed_by_client ? 'reviewed' : 'sent') : 'built') : null
      )
      setDemoStatus(demoIdx < 0 ? 0 : demoIdx)
    }
    setCallLogs((cl ?? []) as CallLog[])
    setReminders((rem ?? []) as Reminder[])
    setEmailLogs((el ?? []) as Array<{ id: string; sent_at: string; subject: string; template: string; to_email: string; status: string }>)
    if (l?.email && !emailTo) setEmailTo(l.email)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [leadId])

  async function changeStage(stage: PipelineStage) {
    await supabase.from('leads').update({
      pipeline_stage: stage,
      stage_updated_at: new Date().toISOString(),
    }).eq('id', leadId)
    await supabase.from('audit_log').insert({
      user_id: userId, action: 'stage_changed', entity_type: 'lead', entity_id: leadId,
      metadata: { from: lead?.pipeline_stage, to: stage },
    })
    setStageOpen(false)
    fetchData()
  }

  async function saveCallLog() {
    setSavingLog(true)
    const now = new Date().toISOString()
    await supabase.from('call_logs').insert({
      lead_id: leadId, user_id: userId,
      outcome: logOutcome,
      duration_seconds: logDuration ? parseInt(logDuration) * 60 : null,
      notes: logNotes || null,
      follow_up_at: logFollowUp && logFollowUpDate ? new Date(logFollowUpDate).toISOString() : null,
    })
    await supabase.from('leads').update({ last_contacted_at: now }).eq('id', leadId)
    await supabase.from('audit_log').insert({ user_id: userId, action: 'call_logged', entity_type: 'lead', entity_id: leadId })
    if (logFollowUp && logFollowUpDate) {
      await supabase.from('reminders').insert({
        lead_id: leadId, user_id: userId,
        scheduled_for: new Date(logFollowUpDate).toISOString(),
        reminder_type: 'call',
        message: `Follow up with ${lead?.business_name}`,
      })
    }
    setSavingLog(false)
    setLogOpen(false); setLogOutcome('no_answer'); setLogDuration(''); setLogNotes(''); setLogFollowUp(false); setLogFollowUpDate('')
    toast.success('Call logged')
    fetchData()
  }

  function handleNotesChange(v: string) {
    setNotes(v)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      await supabase.from('leads').update({ notes: v }).eq('id', leadId)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }, 800)
  }

  async function saveDemoProposal() {
    const demoStatusMap = ['', 'built', 'sent', 'reviewed']
    const updates: Partial<Lead> = {
      demo_url: demoUrl || null,
      proposal_package: proposalPackage || null,
      proposal_price: proposalPrice ? parseFloat(proposalPrice) : null,
      proposal_sent_at: proposalSent ? (lead?.proposal_sent_at ?? new Date().toISOString()) : null,
      commitment_fee_received: commitmentFee,
      commitment_fee_amount: commitmentAmount ? parseFloat(commitmentAmount) : null,
    }
    if (demoStatus >= 1) updates.demo_built_at = lead?.demo_built_at ?? new Date().toISOString()
    if (demoStatus >= 2) updates.demo_sent_at = lead?.demo_sent_at ?? new Date().toISOString()
    if (demoStatus >= 3) updates.demo_reviewed_by_client = true
    if (commitmentFee && lead?.pipeline_stage !== 'committed') {
      updates.pipeline_stage = 'committed'
      updates.stage_updated_at = new Date().toISOString()
    }
    await supabase.from('leads').update(updates).eq('id', leadId)
    toast.success('Saved')
    fetchData()
  }

  async function saveReminder() {
    if (!remDate) { toast.error('Select a date/time'); return }
    await supabase.from('reminders').insert({
      lead_id: leadId, user_id: userId,
      scheduled_for: new Date(remDate).toISOString(),
      reminder_type: remType,
      message: remMessage || null,
    })
    setReminderOpen(false); setRemDate(''); setRemMessage('')
    toast.success('Reminder set')
    fetchData()
  }

  async function deleteReminder(id: string) {
    await supabase.from('reminders').delete().eq('id', id)
    fetchData()
  }

  async function handleCallAction() {
    if (!lead) return
    if (lead.dnc_status === 'flagged') { setDncModalOpen(true); return }
    setCallPrepOpen(true)
    if (lead.phone) {
      await navigator.clipboard.writeText(lead.phone).catch(() => {})
      toast.success('Phone number copied to clipboard')
    }
  }

  async function proceedDespiteDNC() {
    await supabase.from('audit_log').insert({
      user_id: userId, action: 'dnc_override', entity_type: 'lead', entity_id: leadId,
      metadata: { phone: lead?.phone },
    })
    setDncModalOpen(false); setCallPrepOpen(true)
    if (lead?.phone) {
      await navigator.clipboard.writeText(lead.phone).catch(() => {})
      toast.success('Phone number copied to clipboard')
    }
  }

  async function enrichPhone() {
    setEnriching(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich-phone`, { method: 'POST' })
      const data = await res.json()
      if (data.phone) { toast.success(`Found: ${data.phone}`); fetchData() }
      else toast.info('Phone not found after searching all sources')
    } catch { toast.error('Enrichment failed') }
    setEnriching(false)
  }

  async function checkDNCNow() {
    const res = await fetch(`/api/leads/${leadId}/check-dnc`, { method: 'POST' })
    const data = await res.json()
    if (data.status) { toast.success(`DNC status: ${data.status}`); fetchData() }
    else toast.error('DNC check failed')
  }

  // Populate email subject/body when template or panel changes
  useEffect(() => {
    if (!emailPanelOpen || !lead) return
    const tpl = EMAIL_TEMPLATES[emailTemplate]
    setEmailSubject(replaceTokens(tpl.subject, lead))
    setEmailBody(replaceTokens(tpl.body, lead))
  }, [emailTemplate, emailPanelOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendEmailOutreach() {
    if (!emailTo) { toast.error('Enter a recipient email address'); return }
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          template: emailTemplate,
          customSubject: emailSubject,
          customBody: emailBody,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      toast.success('Email sent ✓')
      setEmailPanelOpen(false)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email')
    }
    setSendingEmail(false)
  }

  if (loading || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full sm:max-w-[600px] bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const bhoursStatus = lead.timezone ? getBusinessHoursStatus(lead.timezone) : 'closed'
  const localDateTime = lead.timezone ? getLocalDateTime(lead.timezone) : ''
  const scoreBreakdown = getScoreBreakdown(lead)

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <div className="w-full sm:max-w-[600px] bg-white dark:bg-gray-900 flex flex-col h-full overflow-hidden border-l border-gray-200 dark:border-gray-800 shadow-2xl">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{lead.business_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {[lead.category, lead.city, lead.state_province, lead.country].filter(Boolean).join(' · ')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {/* Score badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  lead.lead_score >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : lead.lead_score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  Score {lead.lead_score}
                </span>
                {/* DNC badge */}
                {lead.dnc_status === 'clear' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle size={11} /> DNC Clear
                  </span>
                )}
                {lead.dnc_status === 'flagged' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle size={11} /> DNC Flagged
                  </span>
                )}
                {(!lead.dnc_checked || lead.dnc_status === 'unknown') && (
                  <button onClick={checkDNCNow}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    Unchecked · Check now
                  </button>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Contact info */}
            <Card title="Contact Information">
              {lead.phone ? (
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{lead.phone}</span>
                    <CopyBtn value={lead.phone} />
                    {lead.dnc_status === 'flagged' && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> DNC Registry
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-sm text-gray-400">No phone number found</span>
                  <button onClick={enrichPhone} disabled={enriching}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
                    {enriching ? 'Searching…' : 'Find phone number'}
                  </button>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{lead.email}</span>
                  <CopyBtn value={lead.email} />
                </div>
              )}
              {lead.address && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{lead.address}</p>}
              {lead.timezone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock size={13} />
                  <span>{lead.city} local time: {localDateTime}</span>
                  <span className={`text-xs font-medium ${
                    bhoursStatus === 'good' ? 'text-green-600' : bhoursStatus === 'early_late' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {bhoursStatus === 'good' ? '✓ Good time to call' : bhoursStatus === 'early_late' ? '⚠ Early/late' : '✕ Outside hours'}
                  </span>
                </div>
              )}
            </Card>

            {/* Platform profiles */}
            {Object.keys(lead.platform_profile_urls ?? {}).length > 0 && (
              <Card title={`Found on ${(lead.platforms_found_on ?? []).length} platform${(lead.platforms_found_on ?? []).length !== 1 ? 's' : ''}`}>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(lead.platform_profile_urls ?? {}).map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {platform} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Pipeline stage */}
            <Card title="Pipeline Stage">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <button onClick={() => setStageOpen(o => !o)}>
                    <PipelineStageBadge stage={lead.pipeline_stage} className="text-sm px-3 py-1" />
                  </button>
                  {stageOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStageOpen(false)} />
                      <div className="absolute left-0 top-8 z-20 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg py-1">
                        {ALL_STAGES.map(s => (
                          <button key={s} onClick={() => changeStage(s)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${lead.pipeline_stage === s ? 'font-semibold' : ''}`}>
                            <PipelineStageBadge stage={s} />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {lead.stage_updated_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                    In this stage {formatDistanceToNow(new Date(lead.stage_updated_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </Card>

            {/* Call action */}
            <Card title="Call Action">
              <button onClick={handleCallAction}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-3">
                <Phone size={20} /> CALL {lead.business_name}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                Copies number to clipboard — dial from your phone app
              </p>
              {callPrepOpen && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Number copied ✓ — dial <span className="font-mono font-bold">{lead.phone ?? 'no phone'}</span>
                  </p>
                  <LocalTimeClock timezone={lead.timezone} />
                  <details className="text-xs text-gray-600 dark:text-gray-400">
                    <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">View call script</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Script pulled from user settings — shown at runtime */}
                      [Your call script will appear here — set it in Settings → Call Script]
                    </pre>
                  </details>
                </div>
              )}
            </Card>

            {/* Call history */}
            <Card title="Call History" action={
              <button onClick={() => setLogOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus size={12} /> Log call
              </button>
            }>
              {logOpen && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Outcome *</label>
                      <select value={logOutcome} onChange={e => setLogOutcome(e.target.value as CallOutcome)} className={inputCls}>
                        {CALL_OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Duration (mins)</label>
                      <input type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)} min={0} className={inputCls} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Notes</label>
                    <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} rows={3} className={inputCls} placeholder="Call notes…" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={logFollowUp} onChange={e => setLogFollowUp(e.target.checked)} className="rounded" />
                    Schedule follow-up call
                  </label>
                  {logFollowUp && (
                    <input type="datetime-local" value={logFollowUpDate} onChange={e => setLogFollowUpDate(e.target.value)} className={inputCls} />
                  )}
                  <div className="flex gap-2">
                    <button onClick={saveCallLog} disabled={savingLog}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                      {savingLog ? 'Saving…' : 'Save call log'}
                    </button>
                    <button onClick={() => setLogOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {callLogs.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No calls logged yet</p>
              ) : (
                <div className="space-y-2">
                  {callLogs.map(log => (
                    <div key={log.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[log.outcome]}`}>
                          {CALL_OUTCOMES.find(o => o.value === log.outcome)?.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.called_at), 'MMM d, h:mm a')}
                          {log.duration_seconds && ` · ${Math.round(log.duration_seconds / 60)}m`}
                        </span>
                      </div>
                      {log.notes && <p className="text-xs text-gray-600 dark:text-gray-400">{log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Demo & Proposal */}
            <Card title="Demo & Proposal">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Demo URL</label>
                  <input value={demoUrl} onChange={e => setDemoUrl(e.target.value)} className={inputCls} placeholder="https://demo.example.com/business-name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Demo status</label>
                  <div className="flex gap-2">
                    {['Not built', 'Built', 'Sent', 'Client reviewed'].map((label, i) => (
                      <button key={i} onClick={() => setDemoStatus(i)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          demoStatus === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Package</label>
                    <input value={proposalPackage} onChange={e => setProposalPackage(e.target.value)} className={inputCls} placeholder="Standard — 5 pages" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Price ($)</label>
                    <input type="number" value={proposalPrice} onChange={e => setProposalPrice(e.target.value)} className={inputCls} placeholder="1500" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={proposalSent} onChange={e => setProposalSent(e.target.checked)} className="rounded" />
                  Proposal sent
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={commitmentFee} onChange={e => setCommitmentFee(e.target.checked)} className="rounded" />
                  10% commitment fee received
                </label>
                {commitmentFee && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Fee amount ($)</label>
                    <input type="number" value={commitmentAmount} onChange={e => setCommitmentAmount(e.target.value)} className={inputCls} placeholder="150" />
                  </div>
                )}
                <button onClick={saveDemoProposal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                  Save
                </button>
              </div>
            </Card>

            {/* Email Outreach */}
            <Card title="Email Outreach" action={
              <button onClick={() => setEmailPanelOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                <Mail size={12} /> Compose email
              </button>
            }>
              {emailPanelOpen ? (
                <div className="space-y-3">
                  {/* Template selector */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Template</label>
                    <div className="flex gap-2">
                      {(Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>).map(key => (
                        <button key={key} onClick={() => setEmailTemplate(key)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            emailTemplate === key
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}>
                          {EMAIL_TEMPLATES[key].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* To */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">To (email address)</label>
                    <input
                      type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                      className={inputCls} placeholder="owner@business.com"
                    />
                  </div>
                  {/* Subject */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subject</label>
                    <input
                      type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  {/* Body */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Message</label>
                    <textarea
                      value={emailBody} onChange={e => setEmailBody(e.target.value)}
                      rows={8} className={`${inputCls} resize-y`}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Tokens like <span className="font-mono">{'{business_name}'}</span> are already replaced above. Edit freely.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={sendEmailOutreach} disabled={sendingEmail || !emailTo}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2">
                      {sendingEmail ? (
                        <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Sending…</>
                      ) : (
                        <><Mail size={13} /> Send email</>
                      )}
                    </button>
                    <button onClick={() => setEmailPanelOpen(false)}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {emailLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No emails sent yet</p>
                  ) : (
                    <div className="space-y-2">
                      {emailLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between gap-2 text-xs border border-gray-100 dark:border-gray-800 rounded-lg p-2.5">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{log.subject}</p>
                            <p className="text-gray-400 mt-0.5">To: {log.to_email} · {log.template}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded-full font-medium ${log.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {log.status}
                            </span>
                            <span className="text-gray-400">{format(new Date(log.sent_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Reminders */}
            <Card title="Reminders" action={
              <button onClick={() => setReminderOpen(o => !o)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus size={12} /> Add reminder
              </button>
            }>
              {reminderOpen && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Type</label>
                      <select value={remType} onChange={e => setRemType(e.target.value as ReminderType)} className={inputCls}>
                        <option value="call">Call</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="demo_review">Demo review</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date & time</label>
                      <input type="datetime-local" value={remDate} onChange={e => setRemDate(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Message (optional)</label>
                    <input value={remMessage} onChange={e => setRemMessage(e.target.value)} className={inputCls} placeholder="Optional reminder note" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveReminder} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Save</button>
                    <button onClick={() => setReminderOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
              {reminders.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No reminders set</p>
              ) : (
                <div className="space-y-2">
                  {reminders.map(r => {
                    const past = new Date(r.scheduled_for) < new Date()
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${past ? 'opacity-50 border-gray-100 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <Bell size={12} className="text-gray-400" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{r.reminder_type.replace('_', ' ')}</span>
                            <span className="text-xs text-gray-400">{format(new Date(r.scheduled_for), 'MMM d, h:mm a')}</span>
                          </div>
                          {r.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">{r.message}</p>}
                        </div>
                        <button onClick={() => deleteReminder(r.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card title={<span className="flex items-center gap-2">Notes {notesSaved && <span className="text-xs text-green-600 font-normal">Saved</span>}</span>}>
              <textarea
                value={notes} onChange={e => handleNotesChange(e.target.value)}
                rows={5} className={`${inputCls} resize-y`}
                placeholder="Add notes about this lead…"
              />
            </Card>

            {/* Score breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button onClick={() => setScoreOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                Score breakdown
                {scoreOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {scoreOpen && (
                <div className="px-5 pb-4 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {scoreBreakdown.map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className={`font-medium ${item.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        +{item.points} pts
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-semibold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                    <span className="text-gray-900 dark:text-white">Total score</span>
                    <span className="text-indigo-600">{lead.lead_score} / 100</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* DNC override modal */}
      {dncModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDncModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Do Not Call Registry Warning</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This phone number is registered on the Federal Do Not Call Registry. Calling registered numbers without a valid exemption may violate FTC regulations and result in significant fines.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setDncModalOpen(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm">
                Cancel — do not call
              </button>
              <button onClick={proceedDespiteDNC}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm">
                I understand the risk — proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Card({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
      {copied ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}
