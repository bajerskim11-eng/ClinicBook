import nodemailer from "nodemailer"
import { NextResponse } from "next/server"
import {
  getSupabasePublicKey,
  getSupabasePublicUrl,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/env"
import { adminSupabase } from "@/lib/supabase/admin"

type CheckStatus = "ok" | "warning" | "error" | "missing"

type Check = {
  id: string
  label: string
  status: CheckStatus
  message: string
}

async function checkSupabaseConnection(): Promise<Check> {
  if (!isSupabaseBrowserConfigured()) {
    return {
      id: "supabase-url",
      label: "Supabase URL & public key",
      status: "missing",
      message:
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or the publishable key variant).",
    }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      id: "supabase-url",
      label: "Supabase URL & public key",
      status: "warning",
      message:
        "URL/public key are set, but SUPABASE_SERVICE_ROLE_KEY is missing — server routes won't be able to read/write data.",
    }
  }
  return {
    id: "supabase-url",
    label: "Supabase URL & public key",
    status: "ok",
    message: getSupabasePublicUrl(),
  }
}

async function checkSupabaseSchema(): Promise<Check> {
  if (!getSupabasePublicUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      id: "supabase-schema",
      label: "Database schema & service role key",
      status: "missing",
      message: "Configure the Supabase URL and service role key first.",
    }
  }
  try {
    const { error } = await adminSupabase.from("clinics").select("id").limit(1)
    if (error) {
      const isMissingTable = /relation .* does not exist/i.test(error.message)
      return {
        id: "supabase-schema",
        label: "Database schema & service role key",
        status: "error",
        message: isMissingTable
          ? "Connected to Supabase, but the schema isn't applied yet — run `supabase db push`."
          : `Could not query Supabase — check your URL and service role key (${error.message}).`,
      }
    }
    return {
      id: "supabase-schema",
      label: "Database schema & service role key",
      status: "ok",
      message: "Connected and schema is reachable.",
    }
  } catch (err) {
    return {
      id: "supabase-schema",
      label: "Database schema & service role key",
      status: "error",
      message: err instanceof Error ? err.message : "Could not reach Supabase.",
    }
  }
}

async function checkEmail(): Promise<Check> {
  const provider = process.env.EMAIL_PROVIDER ?? "ethereal"

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) {
      return {
        id: "email",
        label: "Email (Resend)",
        status: "missing",
        message: "Set RESEND_API_KEY to send booking confirmations and reminders.",
      }
    }
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: apiKey },
      })
      await transporter.verify()
      return {
        id: "email",
        label: "Email (Resend)",
        status: "ok",
        message: "Resend SMTP credentials verified.",
      }
    } catch (err) {
      return {
        id: "email",
        label: "Email (Resend)",
        status: "error",
        message:
          err instanceof Error
            ? `Resend verification failed: ${err.message}`
            : "Resend verification failed.",
      }
    }
  }

  if (provider === "ethereal") {
    return {
      id: "email",
      label: "Email (Ethereal — dev only)",
      status: "warning",
      message:
        "Using Ethereal test inbox. Switch EMAIL_PROVIDER to \"resend\" before going live.",
    }
  }

  return {
    id: "email",
    label: "Email",
    status: "error",
    message: `Unknown EMAIL_PROVIDER "${provider}" — use "resend" or "ethereal".`,
  }
}

function checkCaptcha(): Check {
  if (!process.env.CAPTCHA_SECRET_KEY?.trim()) {
    return {
      id: "captcha",
      label: "Spam protection (Cloudflare Turnstile)",
      status: "warning",
      message:
        "CAPTCHA_SECRET_KEY is not set — bookings are accepted without a CAPTCHA challenge. Recommended for production.",
    }
  }
  return {
    id: "captcha",
    label: "Spam protection (Cloudflare Turnstile)",
    status: "ok",
    message: "CAPTCHA secret key is configured.",
  }
}

function checkCronSecret(): Check {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return {
      id: "cron-secret",
      label: "Reminder cron secret",
      status: "missing",
      message: "Set CRON_SECRET to a long random string to authorize /api/cron/* requests.",
    }
  }
  if (secret === "change-me-to-a-long-random-string") {
    return {
      id: "cron-secret",
      label: "Reminder cron secret",
      status: "warning",
      message: "CRON_SECRET is still the example placeholder — generate a real random value.",
    }
  }
  return {
    id: "cron-secret",
    label: "Reminder cron secret",
    status: "ok",
    message: "Set.",
  }
}

function checkAppUrl(): Check {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!url) {
    return {
      id: "app-url",
      label: "App URL",
      status: "missing",
      message: "Set NEXT_PUBLIC_APP_URL to your deployment's public URL (used in emails and auth redirects).",
    }
  }
  return {
    id: "app-url",
    label: "App URL",
    status: "ok",
    message: url,
  }
}

export async function GET() {
  const [supabaseConnection, supabaseSchema, email] = await Promise.all([
    checkSupabaseConnection(),
    checkSupabaseSchema(),
    checkEmail(),
  ])

  const checks: Check[] = [
    supabaseConnection,
    supabaseSchema,
    email,
    checkCaptcha(),
    checkCronSecret(),
    checkAppUrl(),
  ]

  return NextResponse.json({
    publicSupabaseKey: getSupabasePublicKey() ? "configured" : "missing",
    checks,
  })
}
