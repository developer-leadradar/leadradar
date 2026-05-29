'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, ExternalLink, Save } from 'lucide-react'
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
  'Africa/Lagos', 'Africa/Accra', 'Africa/Cairo', 'Africa/Johannesburg',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'UTC',
]

interface Props { profile: User | null }

export default function SettingsClient({ profile }: Props) {
  const supabase = createClient()
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
