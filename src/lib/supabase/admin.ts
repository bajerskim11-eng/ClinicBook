import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabasePublicUrl } from "@/lib/supabase/env"

// Lazily constructed so importing this module has no side effects — Next.js
// build-time page-data collection imports route handlers without invoking
// them, and SUPABASE_SERVICE_ROLE_KEY is a runtime-only secret that's
// intentionally absent from the Docker build stage.
let client: SupabaseClient | undefined

function getAdminClient(): SupabaseClient {
  if (!client) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""
    client = createClient(getSupabasePublicUrl(), serviceKey)
  }
  return client
}

export const adminSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminClient(), prop, receiver)
  },
})
