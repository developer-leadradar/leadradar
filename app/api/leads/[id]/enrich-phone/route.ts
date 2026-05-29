import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPhoneFromText, searchGooglePlacesForPhone, searchYelpForPhone } from '@/lib/enrichment'
import { checkDNC } from '@/lib/dnc'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead } = await supabase
    .from('leads').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: profile } = await supabase.from('users').select('settings').eq('id', user.id).single()
  const apiKeys = profile?.settings?.api_keys ?? {}
  const googleKey = apiKeys.google || process.env.GOOGLE_PLACES_API_KEY || ''
  const yelpKey = apiKeys.yelp || process.env.YELP_API_KEY || ''

  let phone: string | null = null
  let source: string | null = null

  // Step 1: Check stored platform profile URLs
  if (!phone) {
    for (const url of Object.values(lead.platform_profile_urls ?? {})) {
      try {
        const res = await fetch(url as string, { signal: AbortSignal.timeout(8000) })
        const html = await res.text()
        const found = extractPhoneFromText(html)
        if (found) { phone = found; source = 'platform_profile'; break }
      } catch { /* skip */ }
    }
  }

  // Step 2: Google Places API
  if (!phone && googleKey && lead.business_name && lead.city) {
    phone = await searchGooglePlacesForPhone(lead.business_name, lead.city, googleKey)
    if (phone) source = 'google_places'
  }

  // Step 3: Yelp API
  if (!phone && yelpKey && lead.business_name) {
    const location = [lead.city, lead.country].filter(Boolean).join(', ')
    phone = await searchYelpForPhone(lead.business_name, location, yelpKey)
    if (phone) source = 'yelp'
  }

  // Step 4: Hunter.io (email/phone finder)
  if (!phone && apiKeys.hunter && lead.business_name) {
    try {
      const domain = lead.website_url ? new URL(lead.website_url).hostname : null
      if (domain) {
        const res = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKeys.hunter}`,
          { signal: AbortSignal.timeout(10000) }
        )
        if (res.ok) {
          const data = await res.json()
          const phones = data.data?.phones
          if (phones && phones.length > 0) {
            phone = phones[0].number; source = 'hunter'
          }
        }
      }
    } catch { /* skip */ }
  }

  if (phone) {
    const dncResult = await checkDNC(phone)
    await supabase.from('leads').update({
      phone, phone_source: source,
      dnc_status: dncResult.status, dnc_checked: true,
    }).eq('id', id)
    return NextResponse.json({ phone, source, dnc: dncResult })
  }

  return NextResponse.json({ phone: null, source: null })
}
