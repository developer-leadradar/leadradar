import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

  const isPublicRoute = pathname === '/' || isAuthRoute
  const isCronRoute = pathname.startsWith('/api/cron')

  // DEV_PREVIEW: skip all auth logic when using placeholder credentials
  // Check this FIRST to avoid slow/failing Supabase network calls
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isPlaceholderEnv = supabaseUrl.includes('placeholder') || supabaseUrl === ''
  if (isPlaceholderEnv) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect cron routes with secret
  if (isCronRoute) {
    const cronSecret = request.headers.get('x-cron-secret') ||
      request.nextUrl.searchParams.get('secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return supabaseResponse
  }

  // Check inactivity timeout
  if (user && !isAuthRoute) {
    const lastActivity = request.cookies.get('last_activity')?.value
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10)
      if (timeSinceActivity > INACTIVITY_TIMEOUT_MS) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('expired', '1')
        const expiredResponse = NextResponse.redirect(url)
        // CRITICAL: delete the stale last_activity cookie so re-login works
        expiredResponse.cookies.delete('last_activity')
        return expiredResponse
      }
    }
    // Update last activity timestamp
    supabaseResponse.cookies.set('last_activity', Date.now().toString(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // Fresh login: user just authenticated and is being redirected to dashboard —
  // stamp a fresh last_activity so the inactivity check starts from now
  if (user && isAuthRoute) {
    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
    redirectResponse.cookies.set('last_activity', Date.now().toString(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return redirectResponse
  }

  if (!user && !isPublicRoute && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
