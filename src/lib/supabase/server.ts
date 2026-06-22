import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabasePublicKey, getSupabasePublicUrl } from "@/lib/supabase/env"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getSupabasePublicUrl(),
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* Server Component — cookies may be read-only */
          }
        },
      },
    }
  );
}
