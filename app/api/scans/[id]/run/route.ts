import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateLeadScore } from '@/lib/scoring'
import { checkAndMergeDuplicate } from '@/lib/duplicates'
import { checkDNC } from '@/lib/dnc'
import { getTimezoneForLead } from '@/lib/timezone'
import type { ScanFilters, Lead } from '@/types'

export const maxDuration = 300 // 5 minutes (Vercel Pro/Hobby allows up to 60s on hobby)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scanId } = await params
  const supabase = await createServiceClient()

  // Verify scan exists and get user/filters
  const { data: scan, error: scanErr } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single()

  if (scanErr || !scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
  }

  const userId = scan.user_id
  const filters: ScanFilters = scan.filters

  // Get user API keys
  const { data: profile } = await supabase.from('users').select('settings').eq('id', userId).single()
  const apiKeys = profile?.settings?.api_keys ?? {}
  const googleKey = apiKeys.google || process.env.GOOGLE_PLACES_API_KEY || ''
  const yelpKey = apiKeys.yelp || process.env.YELP_API_KEY || ''
  const apifyKey = apiKeys.apify || process.env.APIFY_API_TOKEN || ''

  let totalFound = 0
  let duplicatesMerged = 0
  const platformsComplete: string[] = []
  const platformsError: string[] = []

  // Broadcast helper
  async function broadcast(payload: object) {
    await supabase.channel(`scan:${scanId}`).send({
      type: 'broadcast',
      event: 'progress',
      payload,
    })
  }

  const cities = (filters.cities ?? '').split(',').map(c => c.trim()).filter(Boolean)
  const country = filters.countries[0] ?? 'United States'

  // Helper: insert or merge a lead
  async function processLead(leadData: Partial<Lead>) {
    leadData.user_id = userId
    leadData.scan_id = scanId
    leadData.lead_score = calculateLeadScore(leadData)
    leadData.timezone = getTimezoneForLead(leadData.city ?? null, leadData.country_code ?? null)

    // Duplicate detection
    const dupResult = await checkAndMergeDuplicate(supabase, userId, leadData)
    if (dupResult.isDuplicate) {
      duplicatesMerged++
      return
    }

    // DNC check
    if (leadData.phone) {
      const dncResult = await checkDNC(leadData.phone)
      leadData.dnc_status = dncResult.status
      leadData.dnc_checked = true
    }

    if (filters.min_lead_score && (leadData.lead_score ?? 0) < filters.min_lead_score) return
    if (filters.must_have_phone && !leadData.phone) return
    if (filters.no_website && leadData.has_website) return

    await supabase.from('leads').insert(leadData)
    totalFound++
  }

  // ── Google Maps via Apify scraper (primary — returns real Google Maps URLs) ─
  if (filters.platforms.includes('google') && apifyKey) {
    const searchCities = cities.length ? cities : [country]
    for (const city of searchCities) {
      try {
        const limit = Math.min(
          Math.ceil(filters.result_count / Math.max(searchCities.length, 1)),
          100
        )
        const input = {
          searchStringsArray: [`${filters.category} in ${city}, ${country}`],
          maxCrawledPlacesPerSearch: limit,
          language: 'en',
          exportPlaceUrls: true,
          includeWebsiteContents: false,
          skipClosedPlaces: false,
        }

        const runResp = await fetch(
          `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(30000),
          }
        )

        if (!runResp.ok) { platformsError.push('google'); continue }
        const run = await runResp.json()
        const runId = run.data?.id
        if (!runId) { platformsError.push('google'); continue }

        // Poll for completion — Google Maps scraper can take 1-3 minutes
        let status = 'RUNNING'
        for (let i = 0; i < 48 && status === 'RUNNING'; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const statusResp = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyKey}`,
            { signal: AbortSignal.timeout(10000) }
          )
          if (statusResp.ok) {
            const s = await statusResp.json()
            status = s.data?.status ?? 'RUNNING'
          }
          await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
        }

        if (status !== 'SUCCEEDED') { platformsError.push('google'); continue }

        const dataResp = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyKey}&limit=500`,
          { signal: AbortSignal.timeout(30000) }
        )
        if (!dataResp.ok) { platformsError.push('google'); continue }
        const items = await dataResp.json()

        for (const item of items) {
          const hasWebsite = !!(item.website)
          if (filters.no_website && hasWebsite) continue

          const phone = item.phone || item.phoneUnformatted || null
          const googleMapsUrl = item.url || null        // real Google Maps URL
          const placeId = item.placeId || null

          await processLead({
            business_name: item.title || item.name || 'Unknown',
            category: filters.category,
            phone,
            address: item.address || null,
            city: item.city || city,
            state_province: item.state || null,
            country,
            country_code: countryToCode(country),
            rating: typeof item.totalScore === 'number' ? item.totalScore : null,
            review_count: item.reviewsCount ?? 0,
            has_website: hasWebsite,
            website_url: item.website || null,
            platforms_found_on: ['google'],
            platform_profile_urls: googleMapsUrl ? { google: googleMapsUrl } : {},
            google_place_id: placeId,
          })
        }

        platformsComplete.push('google')
      } catch {
        platformsError.push('google')
      }
    }
    await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
  }

  // ── Google Places API (official — only used if Apify unavailable) ────────
  if (filters.platforms.includes('google') && googleKey && !platformsComplete.includes('google') && !platformsError.includes('google')) {
    const searchCities = cities.length ? cities : [country]
    for (const city of searchCities) {
      try {
        let nextPageToken: string | undefined
        let fetched = 0
        const limit = Math.ceil(filters.result_count / Math.max(filters.platforms.length, 1))

        do {
          const body: Record<string, unknown> = {
            textQuery: `${filters.category} in ${city}, ${country}`,
            languageCode: 'en',
          }
          if (nextPageToken) body.pageToken = nextPageToken

          const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleKey,
              'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress,places.businessStatus,places.googleMapsUri,places.id',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          })

          if (!resp.ok) { platformsError.push('google'); break }
          const data = await resp.json()
          if (data.error) { platformsError.push('google'); break }
          const places = data.places ?? []
          nextPageToken = data.nextPageToken

          for (const p of places) {
            if (fetched >= limit) break
            const hasWebsite = !!(p.websiteUri)
            if (filters.no_website && hasWebsite) continue

            await processLead({
              business_name: p.displayName?.text ?? 'Unknown',
              category: filters.category,
              phone: p.nationalPhoneNumber ?? null,
              address: p.formattedAddress ?? null,
              city,
              country,
              country_code: countryToCode(country),
              rating: p.rating ?? null,
              review_count: p.userRatingCount ?? 0,
              has_website: hasWebsite,
              website_url: p.websiteUri ?? null,
              platforms_found_on: ['google'],
              platform_profile_urls: p.googleMapsUri ? { google: p.googleMapsUri } : {},
              google_place_id: p.id ?? null,
            })
            fetched++
          }

          await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
          if (!nextPageToken || fetched >= limit) break
        } while (true)

        if (!platformsError.includes('google')) platformsComplete.push('google')
      } catch {
        platformsError.push('google')
      }
    }
  }

  // ── Yelp ────────────────────────────────────────────────────────────────
  if (filters.platforms.includes('yelp') && yelpKey) {
    const searchCities = cities.length ? cities : [country]
    for (const city of searchCities) {
      try {
        let offset = 0
        const limit = Math.min(50, Math.ceil(filters.result_count / Math.max(filters.platforms.length, 1)))

        while (offset < limit) {
          const params = new URLSearchParams({
            term: filters.category,
            location: `${city}, ${country}`,
            limit: String(Math.min(50, limit - offset)),
            offset: String(offset),
          })

          const resp = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
            headers: { Authorization: `Bearer ${yelpKey}` },
            signal: AbortSignal.timeout(15000),
          })

          if (!resp.ok) { await new Promise(r => setTimeout(r, 2000)); break }
          const data = await resp.json()
          const businesses = data.businesses ?? []
          if (businesses.length === 0) break

          for (const b of businesses) {
            const hasWebsite = !!(b.url && !b.url.includes('yelp.com'))
            if (filters.no_website && hasWebsite) continue

            await processLead({
              business_name: b.name ?? 'Unknown',
              category: filters.category,
              phone: b.phone || null,
              address: [b.location?.address1, b.location?.city, b.location?.state].filter(Boolean).join(', '),
              city: b.location?.city ?? city,
              state_province: b.location?.state ?? null,
              country: country,
              country_code: countryToCode(country),
              rating: b.rating ?? null,
              review_count: b.review_count ?? 0,
              has_website: hasWebsite,
              platforms_found_on: ['yelp'],
              platform_profile_urls: b.url ? { yelp: b.url } : {},
              yelp_id: b.id ?? null,
            })
          }

          offset += businesses.length
          await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
          if (businesses.length < 50) break
        }

        platformsComplete.push('yelp')
      } catch {
        platformsError.push('yelp')
      }
    }
  }

  // ── OpenStreetMap / Overpass API (free Yelp alternative, no API key needed) ─
  if (filters.platforms.includes('openstreetmap') || filters.platforms.includes('yelp')) {
    const osmCities = cities.length ? cities : [country]
    const osmCategoryMap: Record<string, string[]> = {
      restaurant: ['restaurant', 'cafe', 'fast_food', 'food_court'],
      cafe: ['cafe', 'coffee_shop'],
      bar: ['bar', 'pub', 'nightclub'],
      hotel: ['hotel', 'motel', 'guest_house'],
      salon: ['hairdresser', 'beauty_salon', 'nail_salon'],
      gym: ['gym', 'fitness_centre', 'sports_centre'],
      dentist: ['dentist'],
      doctor: ['doctors', 'clinic'],
      pharmacy: ['pharmacy'],
      plumber: ['plumber'],
      electrician: ['electrician'],
      mechanic: ['car_repair', 'vehicle_inspection'],
      lawyer: ['lawyer', 'notary'],
      accountant: ['accountant'],
      photographer: ['photographer'],
      florist: ['florist'],
      bakery: ['bakery'],
      grocery: ['supermarket', 'convenience'],
      optician: ['optician'],
      tattoo: ['tattoo'],
      cleaning: ['cleaning'],
      locksmith: ['locksmith'],
    }
    const cat = filters.category.toLowerCase()
    const osmTags = osmCategoryMap[cat] ?? [cat.replace(/\s+/g, '_')]
    const tagQuery = osmTags.map(t => `node["amenity"="${t}"];way["amenity"="${t}"];`).join('')

    for (const city of osmCities) {
      try {
        const overpassQuery = `[out:json][timeout:25];area[name="${city}"]->.searchArea;(${tagQuery});out body center 100;`
        const resp = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: AbortSignal.timeout(30000),
        })
        if (!resp.ok) { platformsComplete.push('openstreetmap'); continue }
        const osmData = await resp.json()
        const elements = osmData.elements ?? []

        for (const el of elements) {
          const tags = el.tags ?? {}
          const hasWebsite = !!(tags.website || tags['contact:website'] || tags.url)
          if (filters.no_website && hasWebsite) continue
          if (!tags.name) continue

          const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null
          const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
          const address = [street, tags['addr:city'] || city, tags['addr:postcode']].filter(Boolean).join(', ')

          await processLead({
            business_name: tags.name,
            category: filters.category,
            phone,
            address: address || null,
            city: tags['addr:city'] || city,
            country,
            country_code: countryToCode(country),
            rating: null,
            review_count: 0,
            has_website: hasWebsite,
            website_url: tags.website || tags['contact:website'] || null,
            platforms_found_on: ['openstreetmap'],
            platform_profile_urls: {},
          })
        }
        platformsComplete.push('openstreetmap')
      } catch {
        platformsError.push('openstreetmap')
      }
    }
    await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
  }

  // ── Apify (for all other platforms) ─────────────────────────────────────
  const apifyPlatforms = filters.platforms.filter(p => !['google', 'google_maps', 'yelp', 'openstreetmap'].includes(p))
  if (apifyPlatforms.length > 0 && apifyKey) {
    for (const platform of apifyPlatforms) {
      try {
        const actorId = getApifyActor(platform)
        if (!actorId) { platformsError.push(platform); continue }

        const searchCity = cities[0] ?? country
        const input = buildApifyInput(platform, actorId, filters.category, searchCity, country, filters.result_count)

        const runResp = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(30000),
        })

        if (!runResp.ok) { platformsError.push(platform); continue }
        const run = await runResp.json()
        const runId = run.data?.id
        if (!runId) { platformsError.push(platform); continue }

        // Poll for completion (max 3 minutes)
        let status = 'RUNNING'
        for (let i = 0; i < 36 && status === 'RUNNING'; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const statusResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyKey}`, {
            signal: AbortSignal.timeout(10000),
          })
          if (statusResp.ok) {
            const statusData = await statusResp.json()
            status = statusData.data?.status ?? 'RUNNING'
          }
        }

        if (status !== 'SUCCEEDED') { platformsError.push(platform); continue }

        // Fetch dataset
        const dataResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyKey}&limit=500`, {
          signal: AbortSignal.timeout(30000),
        })
        if (!dataResp.ok) { platformsError.push(platform); continue }
        const items = await dataResp.json()

        for (const item of items) {
          const hasWebsite = !!(item.website || item.websiteUrl)
          if (filters.no_website && hasWebsite) continue

          await processLead({
            business_name: item.name || item.title || item.businessName || 'Unknown',
            category: filters.category,
            phone: item.phone || item.phoneNumber || null,
            address: item.address || item.fullAddress || null,
            city: item.city || cities[0] || null,
            country: country,
            country_code: countryToCode(country),
            rating: parseFloat(item.rating || item.stars || '0') || null,
            review_count: parseInt(item.reviewCount || item.reviews || '0') || 0,
            has_website: hasWebsite,
            website_url: item.website || null,
            platforms_found_on: [platform],
            platform_profile_urls: item.url ? { [platform]: item.url } : {},
          })
        }

        platformsComplete.push(platform)
        await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError })
      } catch {
        platformsError.push(platform)
      }
    }
  }

  // ── Finalize ─────────────────────────────────────────────────────────────
  await supabase.from('scans').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    total_found: totalFound,
    duplicates_merged: duplicatesMerged,
    platforms_searched: [...platformsComplete, ...platformsError],
  }).eq('id', scanId)

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'scan_completed',
    entity_type: 'scan',
    entity_id: scanId,
    metadata: { total_found: totalFound, duplicates_merged: duplicatesMerged },
  })

  await broadcast({ leadsFound: totalFound, duplicatesMerged, platformsComplete, platformsError, status: 'completed' })

  return NextResponse.json({ success: true, totalFound, duplicatesMerged })
}

function countryToCode(country: string): string {
  const map: Record<string, string> = {
    'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA',
    'Australia': 'AU', 'New Zealand': 'NZ', 'Ireland': 'IE',
  }
  return map[country] ?? 'US'
}

function getApifyActor(platform: string): string | null {
  const actors: Record<string, string> = {
    tripadvisor: 'maxcopell/tripadvisor-scraper',
    yellowpages_us: 'petr_cermak/yellow-pages-scraper',
    yellowpages_ca: 'petr_cermak/yellow-pages-scraper',
    yellowpages_au: 'petr_cermak/yellow-pages-scraper',
    yelp: 'petr_cermak/yelp-scraper',
    facebook: 'apify/facebook-pages-scraper',
    yell: 'petr_cermak/yell-scraper',
    foursquare: 'apify/foursquare-scraper',
    bbb: 'apify/bbb-scraper',
  }
  return actors[platform] ?? 'apify/google-maps-scraper'
}

function buildApifyInput(platform: string, actorId: string, category: string, city: string, country: string, limit: number) {
  if (actorId.includes('google-maps')) {
    return {
      searchStringsArray: [`${category} in ${city}, ${country}`],
      maxCrawledPlacesPerSearch: limit,
      language: 'en',
    }
  }
  return {
    searchTerms: [`${category} ${city}`],
    maxItems: limit,
  }
}
