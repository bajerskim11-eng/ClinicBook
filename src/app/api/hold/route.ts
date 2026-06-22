import { getPractitionerBookingGate } from "@/lib/availability"
import {
  rejectIfOriginNotAllowed,
  rejectIfRateLimited,
  verifyCaptchaToken,
} from "@/lib/security/request-guards"
import { adminSupabase } from "@/lib/supabase/admin"
import { getPractitionerScheduleConflict } from "@/lib/practitioner-schedule-conflict"
import { generateSessionToken } from "@/lib/utils"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(request: Request) {
  const blockedOrigin = rejectIfOriginNotAllowed(request)
  if (blockedOrigin) return blockedOrigin
  const blockedRate = rejectIfRateLimited({
    request,
    scope: "booking-hold",
    limit: 20,
    windowMs: 60_000,
  })
  if (blockedRate) return blockedRate

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const captchaOk = await verifyCaptchaToken(
    typeof body.captchaToken === "string" ? body.captchaToken : undefined
  )
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 })
  }

  const practitionerId = body.practitionerId as string | undefined
  const serviceId = body.serviceId as string | undefined
  const startDatetime = body.startDatetime as string | undefined
  const endDatetime = body.endDatetime as string | undefined

  if (!practitionerId || !serviceId || !startDatetime || !endDatetime) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const { canBook } = await getPractitionerBookingGate(practitionerId)
  if (!canBook) {
    return NextResponse.json(
      { error: "This practitioner is not accepting online bookings right now." },
      { status: 403 }
    )
  }

  const conflict = await getPractitionerScheduleConflict(adminSupabase, {
    practitionerId,
    rangeStart: startDatetime,
    rangeEnd: endDatetime,
  })
  if (conflict) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 })
  }

  const sessionToken = generateSessionToken()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  const { data, error } = await adminSupabase
    .from("slot_holds")
    .insert({
      practitioner_id: practitionerId,
      service_id: serviceId,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create hold" }, { status: 500 })
  }

  return NextResponse.json({
    holdId: data.id,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  })
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const holdId = body.holdId as string | undefined
  const sessionToken = body.sessionToken as string | undefined

  if (!holdId || !sessionToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await adminSupabase
    .from("slot_holds")
    .delete()
    .eq("id", holdId)
    .eq("session_token", sessionToken)

  return NextResponse.json({ ok: true })
}
