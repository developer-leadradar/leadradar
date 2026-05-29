import type { BusinessHoursStatus } from '@/types'

// Mapping of major cities to IANA timezones for leads without coordinates
const CITY_TIMEZONE_MAP: Record<string, string> = {
  // US
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'houston': 'America/Chicago',
  'phoenix': 'America/Phoenix',
  'philadelphia': 'America/New_York',
  'san antonio': 'America/Chicago',
  'san diego': 'America/Los_Angeles',
  'dallas': 'America/Chicago',
  'san jose': 'America/Los_Angeles',
  'austin': 'America/Chicago',
  'jacksonville': 'America/New_York',
  'fort worth': 'America/Chicago',
  'columbus': 'America/New_York',
  'charlotte': 'America/New_York',
  'san francisco': 'America/Los_Angeles',
  'indianapolis': 'America/Indiana/Indianapolis',
  'seattle': 'America/Los_Angeles',
  'denver': 'America/Denver',
  'washington': 'America/New_York',
  'nashville': 'America/Chicago',
  'oklahoma city': 'America/Chicago',
  'el paso': 'America/Denver',
  'boston': 'America/New_York',
  'portland': 'America/Los_Angeles',
  'las vegas': 'America/Los_Angeles',
  'miami': 'America/New_York',
  'atlanta': 'America/New_York',
  'minneapolis': 'America/Chicago',
  'tampa': 'America/New_York',
  'new orleans': 'America/Chicago',
  'cleveland': 'America/New_York',
  'orlando': 'America/New_York',
  'pittsburgh': 'America/New_York',
  'kansas city': 'America/Chicago',
  'st. louis': 'America/Chicago',
  'salt lake city': 'America/Denver',
  // UK
  'london': 'Europe/London',
  'birmingham': 'Europe/London',
  'manchester': 'Europe/London',
  'glasgow': 'Europe/London',
  'liverpool': 'Europe/London',
  'leeds': 'Europe/London',
  'edinburgh': 'Europe/London',
  'bristol': 'Europe/London',
  'sheffield': 'Europe/London',
  'cardiff': 'Europe/London',
  // Canada
  'toronto': 'America/Toronto',
  'montreal': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'calgary': 'America/Edmonton',
  'edmonton': 'America/Edmonton',
  'ottawa': 'America/Toronto',
  'winnipeg': 'America/Winnipeg',
  // Australia
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'brisbane': 'Australia/Brisbane',
  'perth': 'Australia/Perth',
  'adelaide': 'Australia/Adelaide',
  'gold coast': 'Australia/Brisbane',
  'canberra': 'Australia/Sydney',
  // New Zealand
  'auckland': 'Pacific/Auckland',
  'wellington': 'Pacific/Auckland',
  'christchurch': 'Pacific/Auckland',
  // Ireland
  'dublin': 'Europe/Dublin',
  'cork': 'Europe/Dublin',
  'galway': 'Europe/Dublin',
}

const COUNTRY_CODE_TIMEZONE: Record<string, string> = {
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  NZ: 'Pacific/Auckland',
}

export function getTimezoneForLead(city: string | null, countryCode: string | null): string {
  if (city) {
    const tz = CITY_TIMEZONE_MAP[city.toLowerCase()]
    if (tz) return tz
  }
  if (countryCode && COUNTRY_CODE_TIMEZONE[countryCode]) {
    return COUNTRY_CODE_TIMEZONE[countryCode]
  }
  return 'UTC'
}

export function getBusinessHoursStatus(timezone: string): BusinessHoursStatus {
  try {
    const now = new Date()
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const hours = localTime.getHours()
    const minutes = localTime.getMinutes()
    const totalMinutes = hours * 60 + minutes

    const nineAM = 9 * 60
    const fiveThirtyPM = 17 * 60 + 30

    if (totalMinutes >= nineAM && totalMinutes < fiveThirtyPM) return 'good'
    if (totalMinutes >= 8 * 60 && totalMinutes < nineAM) return 'early_late'
    if (totalMinutes >= fiveThirtyPM && totalMinutes < 18 * 60) return 'early_late'
    return 'closed'
  } catch {
    return 'closed'
  }
}

export function getLocalTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return '--:--'
  }
}

export function getLocalDateTime(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return ''
  }
}

// Calling windows: for a given user timezone, compute when 9am-5pm in each target market maps to
export interface CallingWindow {
  market: string
  marketTimezone: string
  startLocal: string
  endLocal: string
  marketHours: string
  yourCallTime: string
  isActiveNow: boolean
}

const TARGET_MARKETS = [
  { market: 'US Eastern (EST/EDT)', timezone: 'America/New_York' },
  { market: 'US Central (CST/CDT)', timezone: 'America/Chicago' },
  { market: 'US Mountain (MST/MDT)', timezone: 'America/Denver' },
  { market: 'US Pacific (PST/PDT)', timezone: 'America/Los_Angeles' },
  { market: 'United Kingdom', timezone: 'Europe/London' },
  { market: 'Canada Eastern', timezone: 'America/Toronto' },
  { market: 'Canada Pacific', timezone: 'America/Vancouver' },
  { market: 'Australia Sydney', timezone: 'Australia/Sydney' },
  { market: 'Australia Melbourne', timezone: 'Australia/Melbourne' },
  { market: 'New Zealand', timezone: 'Pacific/Auckland' },
  { market: 'Ireland', timezone: 'Europe/Dublin' },
]

export function getCallingWindows(userTimezone: string): CallingWindow[] {
  return getCallingWindowsCalculated(userTimezone)
}

function convertTimeToUserTimezone(date: Date, fromTz: string, toTz: string): Date {
  // Get the UTC time of the specified local date/time in fromTz
  const fromStr = date.toLocaleString('en-US', { timeZone: fromTz })
  const fromDate = new Date(fromStr)
  const utcOffset = fromDate.getTime() - date.getTime()
  const utcTime = new Date(date.getTime() - utcOffset)

  // Then format in toTz
  const toStr = utcTime.toLocaleString('en-US', { timeZone: toTz })
  return new Date(toStr)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function getCallingWindowsCalculated(userTimezone: string): CallingWindow[] {
  const now = new Date()

  return TARGET_MARKETS.map(({ market, timezone }) => {
    // Get current hour in target market to determine if it's 9am-5pm there
    const marketHour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(now)
    )
    const isActiveNow = marketHour >= 9 && marketHour < 17

    // Express 9am–5pm market hours in user's timezone
    // We use a reference date to compute the offset
    const refDate = new Date(now)
    refDate.setSeconds(0, 0)

    // Get a UTC time that corresponds to 9am in the market timezone
    function marketLocalToUTC(hour: number): Date {
      // We create an ISO-like string in the market timezone and use Intl to compute offset
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(now)
      // dateStr is YYYY-MM-DD in market timezone
      const [y, m, d] = dateStr.split('-').map(Number)
      // Create a date that represents that day at the given hour in UTC first,
      // then adjust by the market offset
      const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0))
      // Get offset: what hour does UTC midnight appear in market tz?
      const marketOffset = new Date(candidate.toLocaleString('en-US', { timeZone: timezone })).getTime() - candidate.getTime()
      return new Date(candidate.getTime() - marketOffset)
    }

    const open9UTC = marketLocalToUTC(9)
    const close5UTC = marketLocalToUTC(17)

    const fmt = (d: Date) => d.toLocaleTimeString('en-US', {
      timeZone: userTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const startLocal = fmt(open9UTC)
    const endLocal = fmt(close5UTC)

    return {
      market,
      marketTimezone: timezone,
      startLocal,
      endLocal,
      marketHours: '9:00 AM – 5:00 PM',
      yourCallTime: `${startLocal} – ${endLocal}`,
      isActiveNow,
    }
  })
}
