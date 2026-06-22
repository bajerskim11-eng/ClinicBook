/**
 * Supabase dashboard may show either:
 * - Legacy **anon** JWT → use NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - New **publishable** key (sb_publishable_…) → often named NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in the dashboard copy snippet
 */
export function getSupabasePublicUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
}

export function getSupabasePublicKey(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    ""
  return fromEnv
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabasePublicUrl() && getSupabasePublicKey())
}
