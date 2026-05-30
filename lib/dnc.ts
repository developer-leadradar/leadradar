import type { DncStatus } from '@/types'

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function isUSNumber(phone: string): boolean {
  const digits = normalizePhone(phone)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

export function isUKNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '')
  return cleaned.startsWith('+44') || cleaned.startsWith('044') || cleaned.startsWith('44')
}

export function isNigerianNumber(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '')
  return cleaned.startsWith('+234') || cleaned.startsWith('0234') ||
    cleaned.startsWith('234') || (cleaned.startsWith('0') && cleaned.length === 11 && /^0[7-9]/.test(cleaned))
}

export async function checkDNC(phone: string): Promise<{ status: DncStatus; message: string }> {
  if (isUSNumber(phone)) {
    return checkFTCDNC(phone)
  }
  if (isUKNumber(phone)) {
    return {
      status: 'unknown',
      message: 'TPS check not automated — verify manually at tpsonline.org.uk before calling',
    }
  }
  if (isNigerianNumber(phone)) {
    return {
      status: 'unknown',
      message: 'Nigeria does not have a centralised Do Not Call registry. Cold calling is generally permitted for business-to-business outreach under NITDA guidelines.',
    }
  }
  return {
    status: 'unknown',
    message: 'Manual compliance check recommended for this country',
  }
}

async function checkFTCDNC(phone: string): Promise<{ status: DncStatus; message: string }> {
  const digits = normalizePhone(phone)
  try {
    const response = await fetch(`https://api.donotcall.gov/rest/donotcall/${digits}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (response.ok) {
      const data = await response.json()
      // The FTC API returns registered: true/false
      if (data.registered === true || data.complain === true) {
        return { status: 'flagged', message: 'This number is registered on the Federal Do Not Call Registry' }
      }
      return { status: 'clear', message: 'Number is not on the Do Not Call Registry' }
    }
    // If API is unavailable, treat as unknown
    return { status: 'unknown', message: 'DNC check could not be completed — verify manually' }
  } catch {
    return { status: 'unknown', message: 'DNC check could not be completed — verify manually' }
  }
}
