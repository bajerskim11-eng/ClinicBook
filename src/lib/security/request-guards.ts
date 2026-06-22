import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit"

function parseAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const extra = process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return [appUrl, ...(extra ?? [])].filter(Boolean) as string[]
}

export function rejectIfOriginNotAllowed(request: Request): NextResponse | null {
  const origin = request.headers.get("origin")
  if (!origin) return null
  const allowed = parseAllowedOrigins()
  if (allowed.length === 0) return null
  if (!allowed.includes(origin)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
  }
  return null
}

export function rejectIfRateLimited(input: {
  request: Request
  scope: string
  limit: number
  windowMs: number
}): NextResponse | null {
  const ip = getClientIp(input.request)
  const rl = checkRateLimit({
    key: `${input.scope}:${ip}`,
    limit: input.limit,
    windowMs: input.windowMs,
  })
  if (rl.allowed) return null
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfterSec),
      },
    }
  )
}

/** Per-email rate limit, complementing the IP-based one above (catches one
 * email used across rotating IPs/proxies). */
export function rejectIfEmailRateLimited(input: {
  email: string
  scope: string
  limit: number
  windowMs: number
}): NextResponse | null {
  const rl = checkRateLimit({
    key: `${input.scope}:${input.email.trim().toLowerCase()}`,
    limit: input.limit,
    windowMs: input.windowMs,
  })
  if (rl.allowed) return null
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfterSec),
      },
    }
  )
}

export async function verifyCaptchaToken(token?: string): Promise<boolean> {
  const secret = process.env.CAPTCHA_SECRET_KEY?.trim()
  if (!secret) return true
  if (!token) return false

  const body = new URLSearchParams()
  body.set("secret", secret)
  body.set("response", token)

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { success?: boolean }
  return data.success === true
}
