import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lead } from '@/types'

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingLeadId?: string
}

export async function checkAndMergeDuplicate(
  supabase: SupabaseClient,
  userId: string,
  incoming: Partial<Lead>
): Promise<DuplicateCheckResult> {
  if (!incoming.business_name || !incoming.city || !incoming.country_code) {
    return { isDuplicate: false }
  }

  // Use fuzzy matching via pg_trgm similarity
  const { data: matches, error } = await supabase
    .rpc('find_similar_lead', {
      p_user_id: userId,
      p_business_name: incoming.business_name,
      p_city: incoming.city,
      p_country_code: incoming.country_code,
      p_threshold: 0.75,
    })

  if (error || !matches || matches.length === 0) {
    return { isDuplicate: false }
  }

  const existing = matches[0] as Lead

  // Merge data: prefer non-null/better values
  const mergedPlatformUrls = {
    ...existing.platform_profile_urls,
    ...(incoming.platform_profile_urls ?? {}),
  }

  const mergedPlatforms = Array.from(new Set([
    ...(existing.platforms_found_on ?? []),
    ...(incoming.platforms_found_on ?? []),
  ]))

  const updates: Partial<Lead> = {
    platform_profile_urls: mergedPlatformUrls,
    platforms_found_on: mergedPlatforms,
  }

  // Take phone if existing is null
  if (!existing.phone && incoming.phone) {
    updates.phone = incoming.phone
    updates.phone_source = incoming.phone_source
  }

  // Take email if existing is null
  if (!existing.email && incoming.email) {
    updates.email = incoming.email
  }

  // Update rating/reviews to highest values (more data = more accurate)
  if (incoming.review_count && incoming.review_count > (existing.review_count ?? 0)) {
    updates.review_count = incoming.review_count
  }
  if (incoming.rating && incoming.rating > (existing.rating ?? 0)) {
    updates.rating = incoming.rating
  }

  // Recalculate score with merged data
  const { calculateLeadScore } = await import('./scoring')
  updates.lead_score = calculateLeadScore({ ...existing, ...updates })

  await supabase
    .from('leads')
    .update(updates)
    .eq('id', existing.id)
    .eq('user_id', userId)

  return { isDuplicate: true, existingLeadId: existing.id }
}
