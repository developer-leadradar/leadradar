import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/email'

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceClient()
  const { data: users } = await supabase.from('users').select('*').eq('settings->>weekly_digest_enabled', 'true')
  if (!users?.length) return NextResponse.json({ sent: 0 })

  const now = new Date()
  const todayDayName = DAYS[now.getDay()]
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0

  for (const user of users) {
    const digestDay = user.settings?.weekly_digest_day ?? 'sunday'
    if (digestDay !== todayDayName) continue

    const apiKeys = user.settings?.api_keys ?? {}
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const [
      { count: totalCalls },
      { data: wonDeals },
      { data: lostDeals },
      { count: newLeads },
      { data: stageData },
      { data: categoryData },
      { data: platformData },
    ] = await Promise.all([
      supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('called_at', sevenDaysAgo),
      supabase.from('leads').select('deal_value').eq('user_id', user.id).eq('pipeline_stage', 'closed_won').gte('stage_updated_at', sevenDaysAgo),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('pipeline_stage', 'closed_lost'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', sevenDaysAgo),
      supabase.from('leads').select('pipeline_stage').eq('user_id', user.id),
      supabase.from('leads').select('category, pipeline_stage').eq('user_id', user.id).in('pipeline_stage', ['interested', 'demo_sent', 'proposal_made', 'committed', 'building', 'closed_won']),
      supabase.from('leads').select('platforms_found_on').eq('user_id', user.id).in('pipeline_stage', ['interested', 'demo_sent', 'proposal_made', 'committed', 'building', 'closed_won']),
    ])

    const revenue = (wonDeals ?? []).reduce((s, l) => s + (l.deal_value ?? 0), 0)
    const totalWon = (wonDeals ?? []).length
    const totalLost = (lostDeals as any)?.length ?? 0
    const winRate = totalWon + totalLost > 0 ? Math.round(totalWon / (totalWon + totalLost) * 100) : 0

    // Best category
    const catCounts: Record<string, number> = {}
    ;(categoryData ?? []).forEach((l: any) => { if (l.category) catCounts[l.category] = (catCounts[l.category] ?? 0) + 1 })
    const bestCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Best platform
    const platCounts: Record<string, number> = {}
    ;(platformData ?? []).forEach((l: any) => { (l.platforms_found_on ?? []).forEach((p: string) => { platCounts[p] = (platCounts[p] ?? 0) + 1 }) })
    const bestPlatform = Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    const html = `
    <div style="font-family: sans-serif; max-width: 640px; color: #111;">
      <h1 style="color: #4F46E5;">Your Weekly LeadRadar Digest</h1>
      <p style="color: #6B7280;">Week ending ${now.toLocaleDateString()}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        ${[
          ['📞 Calls logged', totalCalls ?? 0],
          ['🆕 New leads added', newLeads ?? 0],
          ['🏆 Deals closed', totalWon],
          ['💰 Revenue this week', `$${revenue.toLocaleString()}`],
          ['📈 Lifetime win rate', `${winRate}%`],
          ['🔥 Best niche', bestCategory],
          ['🏅 Best platform source', bestPlatform],
        ].map(([label, value]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280;">${label}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-weight: 600; color: #111;">${value}</td>
          </tr>`).join('')}
      </table>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${appUrl}/analytics" style="padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Full Analytics →</a>
      </div>
    </div>`

    try {
      await sendEmail({ to: user.email, subject: `📊 Your LeadRadar Weekly Digest`, html, apiKey: apiKeys.resend })
      sent++
    } catch { /* skip */ }
  }

  return NextResponse.json({ sent })
}
