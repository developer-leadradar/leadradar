import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNoOpClient } from './noop'

function isPlaceholder(url: string | undefined): boolean {
  return !url || url.includes('placeholder') || url === ''
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (isPlaceholder(url)) return createNoOpClient() as unknown as ReturnType<typeof createServerClient>

  const cookieStore = await cookies()

  return createServerClient(
    url!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookie setting handled by middleware
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (isPlaceholder(url)) return createNoOpClient() as unknown as ReturnType<typeof createServerClient>

  const cookieStore = await cookies()

  return createServerClient(
    url!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )
}
