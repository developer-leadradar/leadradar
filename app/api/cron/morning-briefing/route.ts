import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/email'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceClient()
  const { data: users } = await supabase.from('users').select('*').eq('settings->>morning_briefing_enabled', 'true')

  if (!users?.length) return NextResponse.json({ sent: 0 })

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  for (const user of users) {
    const tz = user.settings?.timezone ?? 'UTC'
    const localHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now))
    const targetHour = parseInt((user.settings?.morning_briefing_time ?? '08:00').split(':')[0])
    if (localHour !== targetHour) continue

    const apiKeys = user.settings?.api_keys ?? {}
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const [
      { data: scheduledCalls },
      { data: overdueLeads },
      { data: staleInterested },
      { data: newHotLeads },
    ] = await Promise.all([
      supabase.from('reminders').select('*, leads(business_name, phone, city)').eq('user_id', user.id).gte('scheduled_for', `${today}T00:00:00`).lte('scheduled_for', `${today}T23:59:59`).order('scheduled_for'),
      supabase.from('leads').select('id, business_name, city, pipeline_stage, next_call_at').eq('user_id', user.id).lt('next_call_at', now.toISOString()).not('pipeline_stage', 'in', '("closed_won","closed_lost","not_interested")').order('next_call_at').limit(10),
      supabase.from('leads').select('id, business_name, city, last_contacted_at').eq('user_id', user.id).eq('pipeline_stage', 'interested').lt('last_contacted_at', fiveDaysAgo).limit(10),
      supabase.from('leads').select('id, business_name, category, lead_score').eq('user_id', user.id).gte('created_at', twoDaysAgo).gte('lead_score', 70).order('lead_score', { ascending: false }).limit(5),
    ])

    const html = `
    <div style="font-family: sans-serif; max-width: 640px; color: #111;">
      <h1 style="color: #4F46E5; margin-bottom: 4px;">Good morning! ☀️</h1>
      <p style="color: #6B7280; margin-top: 0;">Here's your LeadRadar briefing for today</p>

      <h2 style="font-size: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">📅 Scheduled calls today (${scheduledCalls?.length ?? 0})</h2>
      ${scheduledCalls?.length ? scheduledCalls.map((r: any) => `<p><strong>${(r.leads as any)?.business_name}</strong> — ${new Date(r.scheduled_for).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${(r.leads as any)?.phone ?? 'No phone'}</p>`).join('') : '<p style="color:#6B7280">No calls scheduled today</p>'}

      <h2 style="font-size: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">⏰ Overdue follow-ups (${overdueLeads?.length ?? 0})</h2>
      ${overdueLeads?.length ? overdueLeads.map((l: any) => `<p><a href="${appUrl}/dashboard?lead=${l.id}" style="color: #4F46E5;">${l.business_name}</a> — ${l.city ?? ''}</p>`).join('') : '<p style="color:#6B7280">No overdue follow-ups</p>'}

      <h2 style="font-size: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">🔥 Stale interested leads (${staleInterested?.length ?? 0})</h2>
      ${staleInterested?.length ? staleInterested.map((l: any) => `<p><a href="${appUrl}/dashboard?lead=${l.id}" style="color: #4F46E5;">${l.business_name}</a> — last contact ${l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleDateString() : 'never'}</p>`).join('') : '<p style="color:#6B7280">No stale interested leads</p>'}

      <h2 style="font-size: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">⭐ New hot leads (${newHotLeads?.length ?? 0})</h2>
      ${newHotLeads?.length ? newHotLeads.map((l: any) => `<p><a href="${appUrl}/dashboard?lead=${l.id}" style="color: #4F46E5;">${l.business_name}</a> — Score ${l.lead_score}</p>`).join('') : '<p style="color:#6B7280">No new hot leads in last 48 hours</p>'}

      <div style="margin-top: 32px; text-align: center;">
        <a href="${appUrl}/dashboard" style="padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Open Dashboard →</a>
      </div>
    </div>`

    try {
      await sendEmail({ to: user.email, subject: `☀️ LeadRadar Morning Briefing — ${today}`, html, apiKey: apiKeys.resend })
      sent++
    } catch { /* skip */ }
  }

  return NextResponse.json({ sent })
}
