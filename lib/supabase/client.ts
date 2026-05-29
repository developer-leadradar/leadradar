import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createNoOpClient } from './noop'

function isPlaceholder(url: string | undefined): boolean {
  return !url || url.includes('placeholder') || url === ''
}

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (isPlaceholder(url) || !key) {
    return createNoOpClient() as unknown as SupabaseClient
  }

  return createBrowserClient(url!, key) as unknown as SupabaseClient
}
