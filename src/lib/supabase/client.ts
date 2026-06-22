import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicKey, getSupabasePublicUrl } from "@/lib/supabase/env"

export function createClient() {
  const url = getSupabasePublicUrl()
  const key = getSupabasePublicKey()
  return createBrowserClient(url, key)
}
