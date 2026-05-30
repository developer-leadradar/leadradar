import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  subjects: z.array(z.string()).min(1),
  serviceTypes: z.array(z.string()).min(1),
  subreddits: z.array(z.string()).min(1),
  countries: z.array(z.string()).default([]),
  maxResults: z.number().min(10).max(200).default(50),
})

// Keywords that indicate a genuine student request
const DEMAND_KEYWORDS = [
  'need tutor', 'looking for tutor', 'need a tutor', 'want a tutor',
  'need help with', 'struggling with', 'can someone help', 'need assistance',
  'looking for help', 'need tutoring', 'need coaching', 'study help',
  'proofreading needed', 'need proofreader', 'proofread my', 'essay help',
  'assignment help', 'homework help', 'exam prep', 'exam help',
  'study coach', 'academic help', 'dissertation help', 'thesis help',
  'research help', 'research guidance', 'ielts tutor', 'gmat tutor',
  'gre tutor', 'need someone to', 'paying for tutor', 'hire a tutor',
  'private tutor', 'online tutor', 'need coaching', 'academic coaching',
]

// Spam / non-genuine patterns to skip
const SPAM_PATTERNS = [
  'offering tutoring', 'i am a tutor', 'i offer', 'dm me for',
  'check my profile', 'upwork', 'fiverr', 'discord server', 'join my',
  '[hiring]', 'promoting', 'advertisement', 'check out my',
]

function isDemandPost(title: string, selftext: string): boolean {
  const text = (title + ' ' + selftext).toLowerCase()
  const isSpam = SPAM_PATTERNS.some(p => text.includes(p))
  if (isSpam) return false
  return DEMAND_KEYWORDS.some(k => text.includes(k))
}

function extractSubjectFromText(text: string, subjects: string[]): string {
  const lower = text.toLowerCase()
  for (const subject of subjects) {
    if (lower.includes(subject.toLowerCase().split(' ')[0])) return subject
  }
  // fallback guesses from common keywords
  if (lower.includes('math') || lower.includes('calculus') || lower.includes('algebra')) return 'Mathematics'
  if (lower.includes('physics')) return 'Physics'
  if (lower.includes('chem')) return 'Chemistry'
  if (lower.includes('bio')) return 'Biology'
  if (lower.includes('essay') || lower.includes('writing') || lower.includes('english')) return 'Academic Writing'
  if (lower.includes('proof')) return 'Proofreading / Editing'
  if (lower.includes('econ')) return 'Economics'
  if (lower.includes('code') || lower.includes('program') || lower.includes('python') || lower.includes('javascript')) return 'Computer Science / Programming'
  if (lower.includes('ielts') || lower.includes('toefl')) return 'IELTS / TOEFL Prep'
  if (lower.includes('gmat') || lower.includes('gre')) return 'GMAT / GRE Prep'
  if (lower.includes('law')) return 'Law'
  if (lower.includes('account')) return 'Accounting'
  if (lower.includes('statistic')) return 'Statistics'
  if (lower.includes('research') || lower.includes('thesis') || lower.includes('dissertation')) return 'Research Methodology'
  return subjects[0] ?? 'Other'
}

function extractServiceType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('proof') || lower.includes('edit') || lower.includes('grammar')) return 'proofreading'
  if (lower.includes('coach') || lower.includes('motivation') || lower.includes('study skill')) return 'coaching'
  if (lower.includes('exam') || lower.includes('ielts') || lower.includes('gmat') || lower.includes('gre')) return 'exam_prep'
  if (lower.includes('research') || lower.includes('thesis') || lower.includes('dissertation')) return 'research_guidance'
  return 'tutoring'
}

function extractCountryHint(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes(' uk') || lower.includes('united kingdom') || lower.includes('england') || lower.includes('london') || lower.includes('manchester') || lower.includes('birmingham')) return 'United Kingdom'
  if (lower.includes(' us ') || lower.includes('united states') || lower.includes('america') || lower.includes('college') || lower.includes('university in the u')) return 'United States'
  if (lower.includes('canada') || lower.includes('toronto') || lower.includes('vancouver') || lower.includes('ontario')) return 'Canada'
  if (lower.includes('australia') || lower.includes('sydney') || lower.includes('melbourne') || lower.includes('brisbane')) return 'Australia'
  if (lower.includes('nigeria') || lower.includes('nigerian') || lower.includes('naija') || lower.includes('abuja') || lower.includes('lagos')) return 'Nigeria'
  return null
}

async function searchRedditSubreddit(
  subreddit: string,
  query: string,
  maxResults: number
): Promise<Array<{
  id: string; title: string; selftext: string; author: string;
  url: string; created_utc: number; subreddit: string; permalink: string
}>> {
  const encodedQuery = encodeURIComponent(query)
  const apiUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodedQuery}&restrict_sr=1&sort=new&limit=${Math.min(maxResults, 100)}&t=month`

  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'LeadRadar/1.0 (academic tutor lead finder)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json?.data?.children ?? []).map((child: { data: Record<string, unknown> }) => child.data) as Array<{
      id: string; title: string; selftext: string; author: string;
      url: string; created_utc: number; subreddit: string; permalink: string
    }>
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { subjects, serviceTypes, subreddits, countries, maxResults } = parsed.data

  // Build search query from subjects + demand keywords
  const subjectQuery = subjects.slice(0, 3).join(' OR ')
  const demandQuery = `(${subjectQuery}) AND (tutor OR help OR struggling OR proofreading OR coaching)`

  const results: typeof fetchedPosts = []
  const fetchedPosts: Array<{
    id: string; title: string; selftext: string; author: string;
    url: string; created_utc: number; subreddit: string; permalink: string
  }> = []

  // Fetch from each subreddit in parallel
  const fetches = await Promise.all(
    subreddits.map(sub => searchRedditSubreddit(sub, demandQuery, Math.ceil(maxResults / subreddits.length) + 20))
  )

  for (const posts of fetches) {
    fetchedPosts.push(...posts)
  }

  // Filter to genuine demand posts
  const genuine = fetchedPosts.filter(p =>
    isDemandPost(p.title, p.selftext ?? '') &&
    p.author !== '[deleted]' &&
    p.author !== 'AutoModerator'
  )

  // Deduplicate by author (don't add same Reddit user twice)
  const seenAuthors = new Set<string>()
  const unique = genuine.filter(p => {
    if (seenAuthors.has(p.author)) return false
    seenAuthors.add(p.author)
    return true
  })

  // Check for existing leads to avoid duplicates
  const { data: existingLeads } = await supabase
    .from('tutor_leads')
    .select('contact')
    .eq('user_id', user.id)

  const existingContacts = new Set((existingLeads ?? []).map(l => l.contact))

  // Build lead records
  const toInsert = unique
    .filter(p => !existingContacts.has(`u/${p.author}`))
    .slice(0, maxResults)
    .map(p => {
      const fullText = p.title + ' ' + (p.selftext ?? '')
      return {
        user_id: user.id,
        student_name: `u/${p.author}`,
        contact: `u/${p.author}`,
        contact_type: 'reddit',
        university: null,
        country: countries.length > 0 ? countries[0] : extractCountryHint(fullText),
        subject: extractSubjectFromText(fullText, subjects),
        service_type: serviceTypes[0] ?? extractServiceType(fullText),
        status: 'inquiry',
        source: 'reddit',
        sessions_completed: 0,
        notes: `Post: "${p.title.slice(0, 200)}"\nSubreddit: r/${p.subreddit}\nURL: https://reddit.com${p.permalink}\nPosted: ${new Date(p.created_utc * 1000).toLocaleDateString()}`,
        hourly_rate: null,
        total_earned: null,
        next_session_at: null,
      }
    })

  let inserted = 0
  let errorCount = 0

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('tutor_leads')
      .insert(toInsert)
      .select()
    if (error) {
      // Table may not exist
      if (error.message.includes('does not exist')) {
        return NextResponse.json({ error: 'tutor_leads table not set up yet. Copy the SQL from the TutorLeads page and run it in Supabase.' }, { status: 400 })
      }
      errorCount++
    } else {
      inserted = (data ?? []).length
    }
  }

  return NextResponse.json({
    found: genuine.length,
    newLeads: inserted,
    duplicatesSkipped: unique.length - inserted,
    errorCount,
    subredditsSearched: subreddits,
    message: `Searched ${subreddits.length} subreddit${subreddits.length !== 1 ? 's' : ''}. Found ${genuine.length} genuine requests, added ${inserted} new leads.`,
  })
}
