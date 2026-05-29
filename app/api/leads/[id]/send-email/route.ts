import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, renderTemplate } from '@/lib/notifications/email'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
  template: z.enum(['intro', 'followup', 'demo']),
  customSubject: z.string().optional(),
  customBody: z.string().optional(),
})

const DEFAULT_TEMPLATES = {
  intro: {
    subject: "Quick question about {business_name}'s online presence",
    body: `Hi there,\n\nI came across {business_name} while searching for {category} businesses in {city} and noticed you may not have a website yet.\n\nI build professional websites for local businesses and would love to show you what I could create specifically for {business_name} — completely free to see, no commitment required.\n\nWould you be open to a quick 5-minute conversation this week?\n\nBest regards,\n{sender_name}`,
  },
  followup: {
    subject: "Following up — {business_name}'s website",
    body: `Hi again,\n\nI reached out a few days ago about building a website for {business_name}. I wanted to follow up in case my last message got buried.\n\nI genuinely think a professional website could make a real difference for your business in {city}. I'd love to show you a quick demo — no cost, no pressure.\n\nWould this week work for a brief chat?\n\nBest regards,\n{sender_name}`,
  },
  demo: {
    subject: 'I built a demo website for {business_name}',
    body: `Hi there,\n\nI took the liberty of building a quick demo website for {business_name} — it only takes 30 seconds to look at and I think you'll like what you see.\n\nYou can view it here: {demo_url}\n\nIf you love it, we can talk about turning it into your live website.\n\nWhat do you think?\n\nBest regards,\n{sender_name}`,
  },
}

// Rate limit: simple in-memory store (fine for single-instance; use Redis for multi-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const window = rateLimitMap.get(userId)
  if (!window || now > window.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (window.count >= 50) return false
  window.count++
  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit: max 50 emails/hour' }, { status: 429 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { to, template, customSubject, customBody } = parsed.data

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const apiKeys = profile?.settings?.api_keys ?? {}

  const templateKey = `email_template_${template}` as keyof typeof profile.settings
  const savedTemplate = profile?.settings?.[templateKey] as { subject: string; body: string } | undefined

  const templateData = savedTemplate ?? DEFAULT_TEMPLATES[template]
  const subject = customSubject ?? templateData.subject
  const bodyText = customBody ?? templateData.body

  const vars: Record<string, string> = {
    business_name: lead.business_name,
    category: lead.category ?? '',
    city: lead.city ?? '',
    sender_name: profile?.full_name ?? 'Your name',
    demo_url: lead.demo_url ?? '',
  }

  const finalSubject = renderTemplate(subject, vars)
  const finalBody = renderTemplate(bodyText, vars)
  const htmlBody = finalBody.replace(/\n/g, '<br />')

  try {
    await sendEmail({
      to, subject: finalSubject,
      html: `<div style="font-family: Inter, sans-serif; max-width: 600px; line-height: 1.6;">${htmlBody}</div>`,
      apiKey: apiKeys.resend,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Email send failed'
    await supabase.from('email_logs').insert({
      lead_id: id, user_id: user.id, subject: finalSubject, template, to_email: to, status: 'failed',
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  await Promise.all([
    supabase.from('email_logs').insert({
      lead_id: id, user_id: user.id, subject: finalSubject, template, to_email: to, status: 'sent',
    }),
    supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', id),
    supabase.from('audit_log').insert({
      user_id: user.id, action: 'email_sent', entity_type: 'lead', entity_id: id,
      metadata: { template, to },
    }),
  ])

  return NextResponse.json({ success: true })
}
