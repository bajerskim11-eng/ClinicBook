import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSupabasePublicKey, getSupabasePublicUrl } from "@/lib/supabase/env"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || origin
  const safeNext = next.startsWith("/") ? next : "/dashboard"

  const url = getSupabasePublicUrl()
  const anonKey = getSupabasePublicKey()
  if (!url || !anonKey) {
    return NextResponse.redirect(`${appOrigin}/auth/login?error=supabase_env`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${appOrigin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${appOrigin}/auth/login?error=auth`)
}
