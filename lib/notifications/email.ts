import { Resend } from 'resend'

export function getResend(apiKey?: string) {
  return new Resend(apiKey || process.env.RESEND_API_KEY)
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'LeadRadar <noreply@cim-edge.com>',
  apiKey,
}: {
  to: string
  subject: string
  html: string
  from?: string
  apiKey?: string
}) {
  const resend = getResend(apiKey)
  return resend.emails.send({ from, to, subject, html })
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value ?? ''),
    template
  )
}
