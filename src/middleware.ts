import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabasePublicKey, getSupabasePublicUrl } from "@/lib/supabase/env"

export async function middleware(request: NextRequest) {
  const url = getSupabasePublicUrl()
  const anonKey = getSupabasePublicKey()

  if (!url || !anonKey) {
    const login = new URL("/auth/login", request.url)
    login.searchParams.set("error", "supabase_env")
    return NextResponse.redirect(login)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && user) {
    const role = String(user.app_metadata?.role ?? "").toLowerCase()
    if (role === "practitioner") {
      return NextResponse.redirect(new URL("/practitioner", request.url))
    }
    if (role === "patient") {
      const patientHome = new URL("/my-account", request.url)
      patientHome.searchParams.set("error", "no_access")
      return NextResponse.redirect(patientHome)
    }

    if (user.app_metadata?.must_change_password === true) {
      return NextResponse.redirect(new URL("/auth/first-login", request.url))
    }

    const [{ data: portalRow }, { data: patientRow }] = await Promise.all([
      supabase
        .from("practitioner_accounts")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("patient_accounts")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ])

    // Practitioner users should never access the clinic admin dashboard.
    if (portalRow) {
      return NextResponse.redirect(new URL("/practitioner", request.url))
    }

    // Patient users should never access the clinic admin dashboard.
    if (patientRow) {
      const patientHome = new URL("/my-account", request.url)
      patientHome.searchParams.set("error", "no_access")
      return NextResponse.redirect(patientHome)
    }
  }

  if (request.nextUrl.pathname.startsWith("/practitioner") && !user) {
    const loginUrl = new URL("/auth/practitioner-login", request.url)
    const redirectPath =
      request.nextUrl.pathname +
      (request.nextUrl.search ? request.nextUrl.search : "")
    loginUrl.searchParams.set("redirect", redirectPath)
    return NextResponse.redirect(loginUrl)
  }

  if (request.nextUrl.pathname.startsWith("/my-account") && !user) {
    const loginUrl = new URL("/auth/patient-login", request.url)
    const redirectPath =
      request.nextUrl.pathname +
      (request.nextUrl.search ? request.nextUrl.search : "")
    loginUrl.searchParams.set("redirect", redirectPath)
    return NextResponse.redirect(loginUrl)
  }

  supabaseResponse.headers.set("X-Frame-Options", "DENY")
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  if (request.nextUrl.protocol === "https:") {
    supabaseResponse.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:;"
  )

  return supabaseResponse
}

export const config = {
  matcher: ["/dashboard/:path*", "/my-account/:path*", "/practitioner/:path*"],
}
