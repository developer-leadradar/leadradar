import type { Lead, ScoreTier } from '@/types'

const HIGH_DEMAND_CATEGORIES = new Set([
  'restaurant', 'salon', 'hair salon', 'dentist', 'plumber', 'mechanic',
  'auto repair', 'gym', 'fitness studio', 'lawyer', 'accountant',
  'real estate', 'real estate agent', 'hotel', 'bed and breakfast',
  'photographer', 'event venue', 'caterer', 'wedding planner',
])

export function calculateLeadScore(lead: Partial<Lead>): number {
  let score = 0

  // Review count (max 30)
  const reviews = lead.review_count ?? 0
  if (reviews > 100) score += 30
  else if (reviews >= 51) score += 25
  else if (reviews >= 21) score += 15
  else if (reviews >= 10) score += 10
  else if (reviews > 0) score += 5

  // Rating (max 20)
  const rating = lead.rating ?? 0
  if (rating >= 4.5) score += 20
  else if (rating >= 4.0) score += 15
  else if (rating >= 3.5) score += 10
  else if (rating >= 3.0) score += 5

  // Platform presence (max 20)
  const platformCount = lead.platforms_found_on?.length ?? 0
  if (platformCount >= 4) score += 20
  else if (platformCount === 3) score += 15
  else if (platformCount === 2) score += 8

  // Contact data (max 20)
  if (lead.phone) score += 15
  if (lead.email) score += 5

  // Listing quality (max 18)
  if (lead.facebook_url) score += 8

  // Business category bonus (max 5)
  const category = (lead.category ?? '').toLowerCase()
  if (HIGH_DEMAND_CATEGORIES.has(category)) score += 5

  return Math.min(score, 100)
}

export function getScoreTier(score: number): ScoreTier {
  if (score >= 80) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

export function getScoreBadgeColor(score: number): string {
  const tier = getScoreTier(score)
  if (tier === 'hot') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (tier === 'warm') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export function getScoreBreakdown(lead: Partial<Lead>): Array<{ label: string; points: number }> {
  const items: Array<{ label: string; points: number }> = []

  const reviews = lead.review_count ?? 0
  let reviewPoints = 0
  if (reviews > 100) reviewPoints = 30
  else if (reviews >= 51) reviewPoints = 25
  else if (reviews >= 21) reviewPoints = 15
  else if (reviews >= 10) reviewPoints = 10
  else if (reviews > 0) reviewPoints = 5
  items.push({ label: `${reviews} reviews`, points: reviewPoints })

  const rating = lead.rating ?? 0
  let ratingPoints = 0
  if (rating >= 4.5) ratingPoints = 20
  else if (rating >= 4.0) ratingPoints = 15
  else if (rating >= 3.5) ratingPoints = 10
  else if (rating >= 3.0) ratingPoints = 5
  items.push({ label: `Rating ${rating.toFixed(1)}`, points: ratingPoints })

  const platformCount = lead.platforms_found_on?.length ?? 0
  let platformPoints = 0
  if (platformCount >= 4) platformPoints = 20
  else if (platformCount === 3) platformPoints = 15
  else if (platformCount === 2) platformPoints = 8
  items.push({ label: `Found on ${platformCount} platform${platformCount !== 1 ? 's' : ''}`, points: platformPoints })

  items.push({ label: 'Phone number present', points: lead.phone ? 15 : 0 })
  items.push({ label: 'Email address present', points: lead.email ? 5 : 0 })
  items.push({ label: 'Has Facebook/social URL', points: lead.facebook_url ? 8 : 0 })

  const category = (lead.category ?? '').toLowerCase()
  items.push({ label: 'High-demand category', points: HIGH_DEMAND_CATEGORIES.has(category) ? 5 : 0 })

  return items.filter(i => i.points > 0 || i.label.startsWith('Rating') || i.label.startsWith('Found'))
}
