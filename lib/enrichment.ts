// Phone enrichment logic — used by /api/leads/[id]/enrich-phone

export const PHONE_REGEX = /\+?[\d\s\-().]{10,}/g

export function extractPhoneFromText(text: string): string | null {
  const matches = text.match(PHONE_REGEX)
  if (!matches) return null
  // Return the first one that's at least 10 digits
  for (const match of matches) {
    const digits = match.replace(/\D/g, '')
    if (digits.length >= 10) return match.trim()
  }
  return null
}

export async function searchGooglePlacesForPhone(
  businessName: string,
  city: string,
  apiKey: string
): Promise<string | null> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.nationalPhoneNumber,places.displayName',
      },
      body: JSON.stringify({ textQuery: `${businessName} ${city}`, languageCode: 'en' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    const data = await response.json()
    const place = data.places?.[0]
    return place?.nationalPhoneNumber ?? null
  } catch {
    return null
  }
}

export async function searchYelpForPhone(
  businessName: string,
  location: string,
  apiKey: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ term: businessName, location, limit: '1' })
    const response = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.businesses?.[0]?.phone ?? null
  } catch {
    return null
  }
}
