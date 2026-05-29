import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/email'
import { sendSMS } from '@/lib/notifications/sms'
import { getLocalTime } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceClient()
  const now = new Date()
  const in35min = new Date(now.getTime() + 35 * 60 * 1000)

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, leads(*), users(*)')
    .lte('scheduled_for', in35min.toISOString())
    .gte('scheduled_for', now.toISOString())
    .eq('sent_email', false)

  if (!reminders?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const reminder of reminders) {
    const lead = reminder.leads as any
    const user = reminder.users as any
    if (!user?.email || !lead) continue

    const apiKeys = user.settings?.api_keys ?? {}
    const localTime = lead.timezone ? getLocalTime(lead.timezone) : 'unknown'

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 24px;">
        <h2 style="color: #4F46E5;">Reminder: Call ${lead.business_name} in ~30 minutes</h2>
        <p><strong>Phone:</strong> <span style="font-family: monospace; font-size: 18px;">${lead.phone ?? 'No phone'}</span></p>
        <p><strong>Category:</strong> ${lead.category ?? '—'}</p>
        <p><strong>Location:</strong> ${[lead.city, lead.country].filter(Boolean).join(', ')}</p>
        <p><strong>Their local time:</strong> ${localTime}</p>
        ${user.settings?.call_script ? `<details><summary>Call script</summary><pre style="white-space: pre-wrap; font-size: 12px;">${user.settings.call_script}</pre></details>` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard?lead=${lead.id}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px;">Open in LeadRadar</a>
      </div>`

    try {
      await sendEmail({
        to: user.email,
        subject: `Reminder: Call ${lead.business_name} in 30 minutes`,
        html: emailHtml,
        apiKey: apiKeys.resend,
      })

      if (user.settings?.sms_enabled && user.settings?.sms_phone && apiKeys.twilio_sid) {
        await sendSMS({
          to: user.settings.sms_phone,
          body: `LeadRadar: Call ${lead.business_name} (${lead.phone ?? 'no phone'}) in 30 min. ${lead.city} time: ${localTime}`,
          accountSid: apiKeys.twilio_sid,
          authToken: apiKeys.twilio_token,
          from: apiKeys.twilio_phone,
        }).catch(() => {}) // SMS failure shouldn't stop email
      }

      await supabase.from('reminders').update({ sent_email: true, sent_sms: true }).eq('id', reminder.id)
      sent++
    } catch { /* continue with next */ }
  }

  return NextResponse.json({ sent })
}
