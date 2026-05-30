'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, ExternalLink, Save, Trash2, Download, AlertTriangle, CheckCircle2, Copy, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { User, UserSettings, EmailTemplate } from '@/types'

const DEFAULT_CALL_SCRIPT = `Hi, is this [Business Name]?

Great! My name is [Your Name] and I'm reaching out because I noticed [Business Name] doesn't have a website yet.

I build professional websites specifically for local businesses like yours, and I'd love to show you what I could create for [Business Name] — completely free to look at, no commitment required.

I've helped many [category] businesses in [city] get online and attract more customers. A website can really make a difference.

Would you be open to a quick 5-minute call this week so I can show you what I have in mind?`

const DEFAULT_TEMPLATES = {
  intro: {
    subject: "Quick question about {business_name}'s online presence",
    body: `Hi there,

I came across {business_name} while searching for {category} businesses in {city} and noticed you may not have a website yet.

I build professional websites for local businesses and would love to show you what I could create specifically for {business_name} — completely free to see, no commitment required.

Would you be open to a quick 5-minute conversation this week?

Best regards,
{sender_name}`,
  },
  followup: {
    subject: "Following up — {business_name}'s website",
    body: `Hi again,

I reached out a few days ago about building a website for {business_name}. I wanted to follow up in case my last message got buried.

I genuinely think a professional website could make a real difference for your business in {city}. I'd love to show you a quick demo — no cost, no pressure.

Would this week work for a brief chat?

Best regards,
{sender_name}`,
  },
  demo: {
    subject: 'I built a demo website for {business_name}',
    body: `Hi there,

I took the liberty of building a quick demo website for {business_name} — it only takes 30 seconds to look at and I think you'll like what you see.

You can view it here: {demo_url}

If you love it, we can talk about turning it into your live website. If it's not quite right, I can adjust it to match your vision exactly.

What do you think?

Best regards,
{sender_name}`,
  },
}

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Abuja', 'Africa/Accra', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'UTC',
]

interface Props { profile: User | null }

type FilterPreset = { id: string; name: string; created_at: string; filters: Record<string, unknown> }

export default function SettingsClient({ profile }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const settings: UserSettings = profile?.settings ?? {}

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  // Notifications
  const [morningEnabled, setMorningEnabled] = useState(settings.morning_briefing_enabled ?? false)
  const [morningTime, setMorningTime] = useState(settings.morning_briefing_time ?? '08:00')
  const [weeklyEnabled, setWeeklyEnabled] = useState(settings.weekly_digest_enabled ?? false)
  const [weeklyDay, setWeeklyDay] = useState(settings.weekly_digest_day ?? 'sunday')
  const [smsEnabled, setSmsEnabled] = useState(settings.sms_enabled ?? false)
  const [smsPhone, setSmsPhone] = useState(settings.sms_phone ?? '')
  const [timezone, setTimezone] = useState(settings.timezone ?? 'Africa/Lagos')

  // Call script
  const [callScript, setCallScript] = useState(settings.call_script ?? DEFAULT_CALL_SCRIPT)

  // Email templates
  const [introTemplate, setIntroTemplate] = useState<EmailTemplate>(
    settings.email_template_intro ?? DEFAULT_TEMPLATES.intro
  )
  const [followupTemplate, setFollowupTemplate] = useState<EmailTemplate>(
    settings.email_template_followup ?? DEFAULT_TEMPLATES.followup
  )
  const [demoTemplate, setDemoTemplate] = useState<EmailTemplate>(
    settings.email_template_demo ?? DEFAULT_TEMPLATES.demo
  )

  // API Keys
  const [apiKeys, setApiKeys] = useState({
    google: '',
    yelp: '',
    apify: '',
    resend: '',
    twilio_sid: '',
    twilio_token: '',
    twilio_phone: '',
    hunter: '',
  })
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setSaving2] = useState(false)

  // Filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([])
  const [presetsLoading, setPresetsLoading] = useState(true)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editingPresetName, setEditingPresetName] = useState('')

  // Data management
  const [exportingData, setExportingData] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 2FA / TOTP
  type MfaFactor = { id: string; status: string; friendly_name?: string }
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([])
  const [mfaEnrolling, setMfaEnrolling] = useState(false)
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(true)

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile saved')
  }

  async function saveNotifications() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        settings: {
          ...settings,
          morning_briefing_enabled: morningEnabled,
          morning_briefing_time: morningTime,
          weekly_digest_enabled: weeklyEnabled,
          weekly_digest_day: weeklyDay,
          sms_enabled: smsEnabled,
          sms_phone: smsPhone,
          timezone,
        },
      })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Notification settings saved')
  }

  async function saveCallScript() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ settings: { ...settings, call_script: callScript } })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Call script saved')
  }

  async function saveEmailTemplates() {
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        settings: {
          ...settings,
          email_template_intro: introTemplate,
          email_template_followup: followupTemplate,
          email_template_demo: demoTemplate,
        },
      })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Email templates saved')
  }

  async function saveApiKeys() {
    setSaving(true)
    // Only update keys that were actually filled in (don't overwrite with empty)
    const keysToSave: Record<string, string> = {}
    Object.entries(apiKeys).forEach(([k, v]) => {
      if (v.trim()) keysToSave[k] = v.trim()
    })
    const { error } = await supabase
      .from('users')
      .update({
        settings: {
          ...settings,
          api_keys: { ...(settings.api_keys ?? {}), ...keysToSave },
        },
      })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else {
      toast.success('API keys saved securely')
      setApiKeys({ google: '', yelp: '', apify: '', resend: '', twilio_sid: '', twilio_token: '', twilio_phone: '', hunter: '' })
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving2(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving2(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
  }

  const toggleKey = (k: string) => setShowKeys(prev => ({ ...prev, [k]: !prev[k] }))

  // Load filter presets
  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('filter_presets')
      .select('id, name, created_at, filters')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFilterPresets((data ?? []) as FilterPreset[])
        setPresetsLoading(false)
      })
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteFilterPreset(id: string) {
    const { error } = await supabase.from('filter_presets').delete().eq('id', id)
    if (error) { toast.error('Failed to delete preset'); return }
    setFilterPresets(prev => prev.filter(p => p.id !== id))
    toast.success('Preset deleted')
  }

  async function renameFilterPreset(id: string, name: string) {
    if (!name.trim()) { toast.error('Name cannot be empty'); return }
    const { error } = await supabase.from('filter_presets').update({ name: name.trim() }).eq('id', id)
    if (error) { toast.error('Failed to rename preset'); return }
    setFilterPresets(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p))
    setEditingPresetId(null)
    toast.success('Preset renamed')
  }

  async function exportAllData() {
    if (!profile?.id) return
    setExportingData(true)
    try {
      const [{ data: leads }, { data: calls }, { data: reminders }] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', profile.id).order('created_at'),
        supabase.from('call_logs').select('*').eq('user_id', profile.id).order('called_at'),
        supabase.from('reminders').select('*').eq('user_id', profile.id).order('created_at'),
      ])

      // Build CSV for leads
      const leadHeaders = ['business_name','category','city','state_province','country','phone','email','rating','review_count','lead_score','pipeline_stage','has_website','demo_url','proposal_package','proposal_price','deal_value','last_contacted_at','next_call_at','created_at','notes']
      const leadRows = (leads ?? []).map(l =>
        leadHeaders.map(h => {
          const v = l[h]
          if (v == null) return ''
          const s = String(v).replace(/"/g, '""')
          return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
        }).join(',')
      )
      const leadsCsv = [leadHeaders.join(','), ...leadRows].join('\n')

      // Build CSV for call logs
      const callHeaders = ['called_at','outcome','duration_seconds','notes','follow_up_at']
      const callRows = (calls ?? []).map(c =>
        callHeaders.map(h => {
          const v = c[h]
          if (v == null) return ''
          const s = String(v).replace(/"/g, '""')
          return s.includes(',') || s.includes('"') ? `"${s}"` : s
        }).join(',')
      )
      const callsCsv = [callHeaders.join(','), ...callRows].join('\n')

      // Create a combined text file download (browser can't zip natively without a lib)
      const combined = `=== LEADS (${(leads ?? []).length} records) ===\n${leadsCsv}\n\n=== CALL LOGS (${(calls ?? []).length} records) ===\n${callsCsv}\n\n=== REMINDERS (${(reminders ?? []).length} records) ===\n${['scheduled_for','reminder_type','message','sent_email','sent_sms'].join(',')}\n${(reminders ?? []).map(r => [r.scheduled_for,r.reminder_type,r.message,r.sent_email,r.sent_sms].join(',')).join('\n')}`

      const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leadradar-export-${format(new Date(), 'yyyy-MM-dd')}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    }
    setExportingData(false)
  }

  // 2FA helpers
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaFactors((data?.totp ?? []) as unknown as MfaFactor[])
      setMfaLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startEnrollMfa() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'LeadRadar' })
    if (error || !data) { toast.error(error?.message ?? 'Failed to start 2FA setup'); return }
    setMfaQrCode(data.totp.qr_code)
    setMfaSecret(data.totp.secret)
    setMfaFactorId(data.id)
    setMfaEnrolling(true)
  }

  async function verifyMfa() {
    if (mfaCode.length !== 6) { toast.error('Enter the 6-digit code from your authenticator app'); return }
    setMfaVerifying(true)
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challengeErr || !challengeData) { toast.error(challengeErr?.message ?? 'Challenge failed'); setMfaVerifying(false); return }
    const { error: verifyErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaCode })
    if (verifyErr) { toast.error('Invalid code — please try again'); setMfaVerifying(false); return }
    toast.success('Two-factor authentication enabled!')
    setMfaEnrolling(false); setMfaCode(''); setMfaQrCode(''); setMfaSecret('')
    const { data } = await supabase.auth.mfa.listFactors()
    setMfaFactors((data?.totp ?? []) as unknown as MfaFactor[])
    setMfaVerifying(false)
  }

  async function unenrollMfa(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) { toast.error(error.message); return }
    toast.success('Two-factor authentication disabled')
    setMfaFactors(prev => prev.filter(f => f.id !== factorId))
  }

  async function deleteAccount() {
    if (deleteConfirmEmail !== profile?.email) {
      toast.error('Email does not match')
      return
    }
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Account deleted. Goodbye!')
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Account deletion failed — please contact support')
    }
    setDeletingAccount(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account, notifications, and integrations</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div className="space-y-4">
          <Field label="Full name">
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className={inputCls} placeholder="Your name" />
          </Field>
          <Field label="Email">
            <input value={profile?.email ?? ''} readOnly className={inputCls + ' opacity-60 cursor-default'} />
          </Field>
          <Btn onClick={saveProfile} loading={saving}>Save profile</Btn>
        </div>
      </Section>

      {/* Two-Factor Authentication */}
      <Section title="Two-Factor Authentication (2FA)">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Add an extra layer of security. You'll need a TOTP authenticator app like Google Authenticator, Authy, or 1Password.
        </p>
        {mfaLoading ? (
          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse w-48" />
        ) : mfaFactors.filter(f => f.status === 'verified').length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 size={16} /> 2FA is enabled
            </div>
            {mfaFactors.filter(f => f.status === 'verified').map(factor => (
              <div key={factor.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Authenticator app</p>
                  <p className="text-xs text-gray-400">TOTP</p>
                </div>
                <button
                  onClick={() => { if (confirm('Disable two-factor authentication? This will make your account less secure.')) unenrollMfa(factor.id) }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : mfaEnrolling ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Step 1 — Scan this QR code</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Open your authenticator app and scan the QR code below.
              </p>
              {mfaQrCode && (
                <div className="flex justify-start">
                  <img src={mfaQrCode} alt="2FA QR Code" className="w-48 h-48 border border-gray-200 dark:border-gray-700 rounded-xl bg-white p-2" />
                </div>
              )}
              {mfaSecret && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Or enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-gray-800 dark:text-gray-200 break-all">
                      {mfaSecret}
                    </code>
                    <CopySecretBtn value={mfaSecret} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Step 2 — Enter the 6-digit code</p>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" className={inputCls + ' font-mono text-lg tracking-widest text-center max-w-[200px]'}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={verifyMfa} disabled={mfaVerifying || mfaCode.length !== 6}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                {mfaVerifying ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</> : 'Verify and enable 2FA'}
              </button>
              <button onClick={() => { setMfaEnrolling(false); setMfaCode(''); setMfaQrCode(''); setMfaSecret('') }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={startEnrollMfa}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Enable two-factor authentication
          </button>
        )}
      </Section>

      {/* Password */}
      <Section title="Change Password">
        <div className="space-y-4">
          <Field label="New password">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className={inputCls} placeholder="At least 8 characters" />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className={inputCls} placeholder="••••••••" />
          </Field>
          <Btn onClick={handleChangePassword} loading={changingPassword}>Update password</Btn>
        </div>
      </Section>

      {/* Timezone */}
      <Section title="My Timezone">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Used for calling windows calculator and briefing email timing</p>
        <Field label="Timezone">
          <select value={timezone} onChange={e => setTimezone(e.target.value)} className={selectCls}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
        <div className="mt-4">
          <Btn onClick={saveNotifications} loading={saving}>Save timezone</Btn>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="space-y-4">
          <ToggleRow label="Morning briefing email" description="Daily summary of calls, overdue leads, and new high-score leads"
            checked={morningEnabled} onChange={setMorningEnabled} />
          {morningEnabled && (
            <Field label="Briefing time (24hr)">
              <input type="time" value={morningTime} onChange={e => setMorningTime(e.target.value)} className={inputCls} />
            </Field>
          )}
          <ToggleRow label="Weekly digest email" description="Week-in-review: calls, pipeline moves, revenue, win rate"
            checked={weeklyEnabled} onChange={setWeeklyEnabled} />
          {weeklyEnabled && (
            <Field label="Digest day">
              <select value={weeklyDay} onChange={e => setWeeklyDay(e.target.value)} className={selectCls}>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d =>
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                )}
              </select>
            </Field>
          )}
          <ToggleRow label="SMS call reminders" description="Twilio SMS alerts 30 minutes before scheduled calls (requires Twilio API key)"
            checked={smsEnabled} onChange={setSmsEnabled} />
          {smsEnabled && (
            <Field label="Your mobile number for SMS">
              <input value={smsPhone} onChange={e => setSmsPhone(e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
            </Field>
          )}
          <Btn onClick={saveNotifications} loading={saving}>Save notification settings</Btn>
        </div>
      </Section>

      {/* Call Script */}
      <Section title="Call Script">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Shown during call preparation as a reference guide. Use [brackets] for placeholders.</p>
        <textarea
          value={callScript}
          onChange={e => setCallScript(e.target.value)}
          rows={12}
          className={`${inputCls} resize-y font-mono text-xs`}
        />
        <div className="mt-3">
          <Btn onClick={saveCallScript} loading={saving}>Save script</Btn>
        </div>
      </Section>

      {/* Email Templates */}
      <Section title="Email Templates">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Use tokens: {'{business_name}'} {'{category}'} {'{city}'} {'{sender_name}'} {'{demo_url}'}
        </p>
        <div className="space-y-6">
          {[
            { key: 'intro', label: 'Introduction', state: introTemplate, setState: setIntroTemplate, defaultVal: DEFAULT_TEMPLATES.intro },
            { key: 'followup', label: 'Follow-up', state: followupTemplate, setState: setFollowupTemplate, defaultVal: DEFAULT_TEMPLATES.followup },
            { key: 'demo', label: 'Demo Invitation', state: demoTemplate, setState: setDemoTemplate, defaultVal: DEFAULT_TEMPLATES.demo },
          ].map(({ key, label, state, setState, defaultVal }) => (
            <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h3>
                <button onClick={() => setState(defaultVal)} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  Reset to default
                </button>
              </div>
              <Field label="Subject">
                <input value={state.subject} onChange={e => setState({ ...state, subject: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Body">
                <textarea value={state.body} onChange={e => setState({ ...state, body: e.target.value })}
                  rows={8} className={`${inputCls} resize-y font-mono text-xs`} />
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Btn onClick={saveEmailTemplates} loading={saving}>Save all templates</Btn>
        </div>
      </Section>

      {/* API Keys */}
      <Section title="API Keys">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Keys are saved securely and never exposed to the browser after saving. Leave blank to keep existing key.
        </p>
        <div className="space-y-3">
          {[
            { key: 'google', label: 'Google Places API Key', href: 'https://console.cloud.google.com', desc: 'Primary lead source — covers ~4,000–8,000 searches/month on free credit' },
            { key: 'yelp', label: 'Yelp Fusion API Key', href: 'https://fusion.yelp.com', desc: '500 free API calls/day' },
            { key: 'apify', label: 'Apify API Token', href: 'https://console.apify.com', desc: '$5/month free credit for Yellow Pages, TripAdvisor, etc.' },
            { key: 'resend', label: 'Resend API Key', href: 'https://resend.com/api-keys', desc: '3,000 emails/month free — powers all email outreach' },
            { key: 'twilio_sid', label: 'Twilio Account SID', href: 'https://twilio.com/console', desc: 'For SMS call reminders (optional)' },
            { key: 'twilio_token', label: 'Twilio Auth Token', href: 'https://twilio.com/console', desc: 'For SMS call reminders (optional)' },
            { key: 'twilio_phone', label: 'Twilio Phone Number', href: 'https://twilio.com/console', desc: 'Your purchased Twilio number (e.g. +1 555 000 0000)' },
            { key: 'hunter', label: 'Hunter.io API Key', href: 'https://hunter.io/api-keys', desc: '25 free searches/month — used only when you click "Find Phone Number"' },
          ].map(({ key, label, href, desc }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Get key <ExternalLink size={11} />
                </a>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{desc}</p>
              <div className="relative">
                <input
                  type={showKeys[key] ? 'text' : 'password'}
                  value={apiKeys[key as keyof typeof apiKeys]}
                  onChange={e => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={settings.api_keys?.[key as keyof typeof settings.api_keys] ? '••••••••••••••••' : 'Paste your key here'}
                  className={inputCls + ' pr-10 font-mono'}
                />
                <button onClick={() => toggleKey(key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {showKeys[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {settings.api_keys?.[key as keyof typeof settings.api_keys] && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Key saved</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Btn onClick={saveApiKeys} loading={saving}>
            <Save size={14} /> Save API keys
          </Btn>
        </div>
      </Section>

      {/* Filter Presets */}
      <Section title="Saved Filter Presets">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Presets are saved from the New Scan page. Manage them here.
        </p>
        {presetsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : filterPresets.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No saved presets yet. Save a preset from the New Scan page to see it here.</p>
        ) : (
          <div className="space-y-2">
            {filterPresets.map(preset => (
              <div key={preset.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                {editingPresetId === preset.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editingPresetName}
                      onChange={e => setEditingPresetName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameFilterPreset(preset.id, editingPresetName)
                        if (e.key === 'Escape') setEditingPresetId(null)
                      }}
                      autoFocus
                      className={inputCls}
                    />
                    <button onClick={() => renameFilterPreset(preset.id, editingPresetName)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                      Save
                    </button>
                    <button onClick={() => setEditingPresetId(null)}
                      className="px-3 py-1.5 text-gray-500 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{preset.name}</p>
                      <p className="text-xs text-gray-400">Saved {format(new Date(preset.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingPresetId(preset.id); setEditingPresetName(preset.name) }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                        Rename
                      </button>
                      <button onClick={() => deleteFilterPreset(preset.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div className="space-y-6">
          {/* User Guide Download */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">User Guide</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Download the complete LeadRadar PDF guide — covers every feature from first scan to closing a deal.
            </p>
            <a
              href="/api/guide"
              download="LeadRadar-User-Guide.pdf"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Download size={14} /> Download PDF Guide
            </a>
          </div>

          {/* Export */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Export my data</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Download all your leads, call logs, and reminders as a text file (CSV format, opens in Excel/Sheets).
            </p>
            <button
              onClick={exportAllData}
              disabled={exportingData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {exportingData
                ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> Preparing export…</>
                : <><Download size={14} /> Download all data</>
              }
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
            <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Delete account
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Permanently deletes your account and all data including leads, call history, reminders, and settings. This cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Delete my account
              </button>
            ) : (
              <div className="p-4 border border-red-200 dark:border-red-800 rounded-xl bg-red-50 dark:bg-red-900/10 space-y-3">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Type your email address <span className="font-mono">{profile?.email}</span> to confirm deletion:
                </p>
                <input
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={e => setDeleteConfirmEmail(e.target.value)}
                  placeholder={profile?.email ?? 'your@email.com'}
                  className={inputCls + ' border-red-300 dark:border-red-700'}
                />
                <div className="flex gap-2">
                  <button
                    onClick={deleteAccount}
                    disabled={deletingAccount || deleteConfirmEmail !== profile?.email}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2">
                    {deletingAccount
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                      : 'Permanently delete account'}
                  </button>
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmEmail('') }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

// ── Small helper components ─────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const selectCls = inputCls

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <span className={`block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function Btn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
      {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}

function CopySecretBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Copy secret">
      {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}
