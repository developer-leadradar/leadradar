import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  subjects:          z.array(z.string()).min(1),
  serviceTypes:      z.array(z.string()).min(1),
  subreddits:        z.array(z.string()).default([]),
  platforms:         z.array(z.string()).default(['reddit']),
  stackExchangeSites:z.array(z.string()).default([]),
  maxResults:        z.number().min(10).max(200).default(50),
})

// ── Keyword matching ───────────────────────────────────────────────────────────

const DEMAND_KEYWORDS = [
  'need tutor', 'looking for tutor', 'need a tutor', 'want a tutor',
  'hire a tutor', 'private tutor', 'online tutor', 'need tutoring',
  'need help with', 'struggling with', 'can someone help', 'need assistance',
  'looking for help', 'need coaching', 'academic help',
  'proofreading needed', 'need proofreader', 'proofread my', 'essay help',
  'assignment help', 'homework help', 'exam prep', 'exam help',
  'study coach', 'dissertation help', 'thesis help',
  'research help', 'research guidance', 'need editing', 'looking for editor',
  'need someone to check', 'can anyone help', 'would pay for',
  'willing to pay', 'paying for tutor', 'recommend a tutor',
  'anyone know a tutor', 'does anyone offer', 'need someone to teach',
  'looking for someone to help', 'struggling in', 'failing',
  'behind in my', 'really need help',
]

const SPAM_PATTERNS = [
  'offering tutoring', 'i am a tutor', 'i offer ', 'dm me for',
  'check my profile', 'upwork', 'fiverr', 'discord server', 'join my',
  '[hiring]', 'promoting', 'advertisement', 'check out my',
  'i provide', 'i can help you', 'i\'m a tutor', 'hire me',
  'my services', 'professional tutor', 'experienced tutor',
]

function isDemandPost(title: string, selftext: string): boolean {
  const text = (title + ' ' + selftext).toLowerCase()
  if (SPAM_PATTERNS.some(p => text.includes(p))) return false
  return DEMAND_KEYWORDS.some(k => text.includes(k))
}

function extractSubject(text: string, subjects: string[]): string {
  const lower = text.toLowerCase()
  for (const s of subjects) {
    if (lower.includes(s.toLowerCase().split(/[\s/]/)[0])) return s
  }
  if (lower.match(/\bmath|calculus|algebra|trigonometry\b/)) return 'Mathematics'
  if (lower.match(/\bstatistic|spss|stata|r language|regression\b/)) return 'Statistics'
  if (lower.match(/\bphysic\b/)) return 'Physics'
  if (lower.match(/\bchem/)) return 'Chemistry'
  if (lower.match(/\bbio|anatomy|physiology|microbio\b/)) return 'Biology'
  if (lower.match(/\bessay|writing|english lit\b/)) return 'Academic Writing'
  if (lower.match(/\bproof|grammar|edit|proofread\b/)) return 'Proofreading / Editing'
  if (lower.match(/\becon/)) return 'Economics'
  if (lower.match(/\baccount|cpa|acca|cima\b/)) return 'Accounting'
  if (lower.match(/\bcode|program|python|javascript|software|coding\b/)) return 'Computer Science / Programming'
  if (lower.match(/\bielts|toefl|english language test\b/)) return 'IELTS / TOEFL Prep'
  if (lower.match(/\bgmat|gre\b/)) return 'GMAT / GRE Prep'
  if (lower.match(/\bmcat\b/)) return 'Biology'
  if (lower.match(/\blsat|lpc\b/)) return 'Law'
  if (lower.match(/\blaw|legal\b/)) return 'Law'
  if (lower.match(/\bresearch|thesis|dissertation\b/)) return 'Research Methodology'
  if (lower.match(/\bhistory\b/)) return 'History'
  if (lower.match(/\bpsych\b/)) return 'Psychology'
  if (lower.match(/\bengineer\b/)) return 'Engineering'
  if (lower.match(/\bsocio\b/)) return 'Sociology'
  return subjects[0] ?? 'Other'
}

function extractServiceType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.match(/\bproof|edit|grammar|proofread\b/)) return 'proofreading'
  if (lower.match(/\bcoach|motivation|study skill|study habit\b/)) return 'coaching'
  if (lower.match(/\bexam|ielts|gmat|gre|mcat|lsat|sat\b/)) return 'exam_prep'
  if (lower.match(/\bresearch|thesis|dissertation|methodology\b/)) return 'research_guidance'
  return 'tutoring'
}

function extractCountry(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.match(/\buk\b|united kingdom|england|london|manchester|birmingham|scotland|wales|oxford|cambridge|a level|gcse|sixth form\b/)) return 'United Kingdom'
  if (lower.match(/\bus\b|united states|america|freshman|sophomore|gpa|state university\b/)) return 'United States'
  if (lower.match(/\bcanada|toronto|vancouver|ontario|ubc|mcgill|canadian\b/)) return 'Canada'
  if (lower.match(/\baustralia|sydney|melbourne|brisbane|uq|unsw|australian\b/)) return 'Australia'
  if (lower.match(/\bnigeria|nigerian|naija|abuja|lagos|unilag|unn\b/)) return 'Nigeria'
  if (lower.match(/\bindia|indian|delhi|mumbai|iit|iim\b/)) return 'India'
  if (lower.match(/\bghana|ghanaian|accra\b/)) return 'Ghana'
  if (lower.match(/\bkenya|nairobi\b/)) return 'Kenya'
  if (lower.match(/\bireland|dublin|trinity\b/)) return 'Ireland'
  if (lower.match(/\bnew zealand|nz|auckland|wellington\b/)) return 'New Zealand'
  return null
}

// ── Reddit ─────────────────────────────────────────────────────────────────────

type RedditPost = {
  id: string; title: string; selftext: string; author: string
  url: string; created_utc: number; subreddit: string; permalink: string
}

const REDDIT_UA = 'Mozilla/5.0 (compatible; LeadRadar/1.0; +https://leadradar.cim-edge.com)'

// Browse latest posts in a subreddit — more reliable from server IPs than search
async function fetchSubredditNew(subreddit: string, limit = 100): Promise<RedditPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`,
      { headers: { 'User-Agent': REDDIT_UA }, signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json?.data?.children ?? []).map((c: { data: RedditPost }) => c.data)
  } catch { return [] }
}

// Global Reddit search — catches demand posts from subreddits not in the list
async function searchRedditGlobal(query: string): Promise<RedditPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=month&limit=100`,
      { headers: { 'User-Agent': REDDIT_UA }, signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json?.data?.children ?? []).map((c: { data: RedditPost }) => c.data)
  } catch { return [] }
}

// ── Stack Exchange ─────────────────────────────────────────────────────────────

type StackQuestion = {
  question_id: number; title: string; body?: string
  link: string; owner: { display_name: string; user_id: number }
  creation_date: number; tags: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function searchStackExchange(site: string): Promise<StackQuestion[]> {
  const queries = ['need tutor', 'looking for tutor', 'need tutoring help', 'find a tutor']
  const results: StackQuestion[] = []
  for (const q of queries) {
    try {
      const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&q=${encodeURIComponent(q)}&site=${site}&filter=withbody&pagesize=50`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const json = await res.json()
      results.push(...(json.items ?? []))
    } catch { continue }
  }
  return results
}

// ── API handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { subjects, serviceTypes, subreddits, platforms, stackExchangeSites, maxResults } = parsed.data
  const useReddit = platforms.includes('reddit')
  const useStackExchange = platforms.includes('stackexchange')

  // ── Fetch from all sources in parallel ────────────────────────────────────────
  const [subredditResults, globalResults, seResults] = await Promise.all([
    // Subreddit new-posts (one fetch per subreddit)
    useReddit && subreddits.length > 0
      ? Promise.allSettled(subreddits.map(s => fetchSubredditNew(s)))
      : Promise.resolve([]),
    // Global demand search (catches posts from any subreddit)
    useReddit
      ? searchRedditGlobal('need a tutor OR looking for tutor OR need tutoring OR tutor wanted')
      : Promise.resolve([]),
    // Stack Exchange
    useStackExchange && stackExchangeSites.length > 0
      ? Promise.allSettled(stackExchangeSites.map(site => searchStackExchange(site)))
      : Promise.resolve([]),
  ])

  const allRedditPosts: RedditPost[] = [...(Array.isArray(globalResults) ? globalResults : [])]
  if (Array.isArray(subredditResults)) {
    for (const r of subredditResults) {
      if (r.status === 'fulfilled') allRedditPosts.push(...r.value)
    }
  }

  const allStackPosts: StackQuestion[] = []
  if (Array.isArray(seResults)) {
    for (const r of seResults) {
      if (r.status === 'fulfilled') allStackPosts.push(...r.value)
    }
  }

  // ── Filter Reddit posts ───────────────────────────────────────────────────────
  const seenPostIds = new Set<string>()
  const seenAuthors = new Set<string>()
  const genuineReddit = allRedditPosts.filter(p => {
    if (p.author === '[deleted]' || p.author === 'AutoModerator') return false
    if (seenPostIds.has(p.id)) return false
    if (seenAuthors.has(p.author)) return false
    if (!isDemandPost(p.title, p.selftext ?? '')) return false
    seenPostIds.add(p.id)
    seenAuthors.add(p.author)
    return true
  })

  // ── Filter Stack Exchange posts ───────────────────────────────────────────────
  const seenStackIds = new Set<number>()
  const genuineStack = allStackPosts.filter(q => {
    if (seenStackIds.has(q.question_id)) return false
    if (!isDemandPost(q.title, stripHtml(q.body ?? ''))) return false
    seenStackIds.add(q.question_id)
    return true
  })

  // ── Check existing contacts ───────────────────────────────────────────────────
  const { data: existingLeads, error: dbCheckErr } = await supabase
    .from('tutor_leads')
    .select('contact')
    .eq('user_id', user.id)

  if (dbCheckErr) {
    if (dbCheckErr.message.toLowerCase().includes('does not exist') ||
        dbCheckErr.message.toLowerCase().includes('relation')) {
      return NextResponse.json({
        error: 'Database table not set up yet. Open the SQL Editor from the TutorLeads page and run the setup SQL.'
      }, { status: 400 })
    }
    return NextResponse.json({ error: dbCheckErr.message }, { status: 500 })
  }

  const existingContacts = new Set((existingLeads ?? []).map(l => l.contact))

  // ── Build records to insert ───────────────────────────────────────────────────
  const toInsert: Array<Record<string, unknown>> = []

  const redditToAdd = genuineReddit
    .filter(p => !existingContacts.has(`u/${p.author}`))
    .slice(0, maxResults)
    .map(p => {
      const txt = `${p.title} ${p.selftext ?? ''}`
      return {
        user_id: user.id,
        student_name: `u/${p.author}`,
        contact: `u/${p.author}`,
        contact_type: 'reddit',
        university: null,
        country: extractCountry(txt),
        subject: extractSubject(txt, subjects),
        service_type: serviceTypes[0] ?? extractServiceType(txt),
        status: 'inquiry',
        source: 'reddit',
        sessions_completed: 0,
        notes: `Post: "${p.title.slice(0, 200)}"\nSubreddit: r/${p.subreddit}\nURL: https://reddit.com${p.permalink}\nPosted: ${new Date(p.created_utc * 1000).toLocaleDateString()}`,
        hourly_rate: null,
        total_earned: null,
        next_session_at: null,
      }
    })

  const stackToAdd = genuineStack
    .filter(q => !existingContacts.has(`se:${q.owner.user_id}`))
    .slice(0, Math.floor(maxResults * 0.4))
    .map(q => {
      const txt = `${q.title} ${stripHtml(q.body ?? '')}`
      return {
        user_id: user.id,
        student_name: q.owner.display_name,
        contact: `se:${q.owner.user_id}`,
        contact_type: 'other',
        university: null,
        country: extractCountry(txt),
        subject: extractSubject(txt, subjects),
        service_type: extractServiceType(txt),
        status: 'inquiry',
        source: 'other',
        sessions_completed: 0,
        notes: `Stack Exchange: "${q.title.slice(0, 200)}"\nTags: ${q.tags.join(', ')}\nURL: ${q.link}\nPosted: ${new Date(q.creation_date * 1000).toLocaleDateString()}`,
        hourly_rate: null,
        total_earned: null,
        next_session_at: null,
      }
    })

  toInsert.push(...redditToAdd, ...stackToAdd)

  // ── Insert ────────────────────────────────────────────────────────────────────
  let inserted = 0
  if (toInsert.length > 0) {
    const { data, error } = await supabase.from('tutor_leads').insert(toInsert).select()
    if (error) {
      if (error.message.toLowerCase().includes('does not exist') ||
          error.message.toLowerCase().includes('relation')) {
        return NextResponse.json({
          error: 'Database table not set up yet. Open the SQL Editor from the TutorLeads page and run the setup SQL.'
        }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    inserted = (data ?? []).length
  }

  const totalFound = genuineReddit.length + genuineStack.length

  return NextResponse.json({
    found: totalFound,
    redditFound: genuineReddit.length,
    stackExchangeFound: genuineStack.length,
    rawPostsScanned: allRedditPosts.length,
    newLeads: inserted,
    duplicatesSkipped: totalFound - inserted,
    subredditsSearched: subreddits,
    bySource: [
      ...(genuineReddit.length > 0 ? [{ source: 'Reddit', found: genuineReddit.length, added: redditToAdd.filter(r => !existingContacts.has(r.contact as string)).length }] : []),
      ...(genuineStack.length > 0 ? [{ source: 'Stack Exchange', found: genuineStack.length, added: stackToAdd.filter(s => !existingContacts.has(s.contact as string)).length }] : []),
    ],
    message: totalFound === 0
      ? `Scanned ${allRedditPosts.length} posts across ${subreddits.length} subreddit(s) — no genuine student requests matched. Try broader subjects or different subreddits.`
      : `Scanned ${allRedditPosts.length} posts across ${subreddits.length} subreddit(s)${useStackExchange ? ' + Stack Exchange' : ''}. Found ${totalFound} genuine requests, added ${inserted} new leads.`,
  })
}
