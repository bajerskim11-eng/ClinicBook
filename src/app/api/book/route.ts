import { getPractitionerBookingGate } from "@/lib/availability"
import {
  rejectIfEmailRateLimited,
  rejectIfOriginNotAllowed,
  rejectIfRateLimited,
  verifyCaptchaToken,
} from "@/lib/security/request-guards"
import { adminSupabase } from "@/lib/supabase/admin"
import { sendConfirmationEmail, sendSMS } from "@/lib/notifications"
import { getPractitionerScheduleConflict } from "@/lib/practitioner-schedule-conflict"
import { bookRequestSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

type HoldRow = {
  practitioner_id: string
  service_id: string
  start_datetime: string
  end_datetime: string
  services: { name: string } | null
  practitioners: { name: string } | null
}

export async function POST(request: Request) {
  const blockedOrigin = rejectIfOriginNotAllowed(request)
  if (blockedOrigin) return blockedOrigin
  const blockedRate = rejectIfRateLimited({
    request,
    scope: "booking-book",
    limit: 15,
    windowMs: 60_000,
  })
  if (blockedRate) return blockedRate

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const captchaToken =
    typeof json === "object" && json !== null && "captchaToken" in json
      ? String((json as { captchaToken?: unknown }).captchaToken ?? "")
      : undefined
  const captchaOk = await verifyCaptchaToken(captchaToken)
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 })
  }

  const parsed = bookRequestSchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
    const first =
      Object.values(msg).flat()[0] ?? "Invalid or missing fields"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const {
    holdId,
    sessionToken,
    firstName,
    lastName,
    email,
    phone,
    notes,
    honeypot,
  } = parsed.data

  if (honeypot && honeypot.trim().length > 0) {
    // Bot filled a field that's hidden from real users — pretend success
    // without creating anything, so the bot doesn't learn it was caught.
    return NextResponse.json({ appointmentId: crypto.randomUUID() })
  }

  const blockedEmailRate = rejectIfEmailRateLimited({
    email,
    scope: "booking-book-email",
    limit: 5,
    windowMs: 3_600_000,
  })
  if (blockedEmailRate) return blockedEmailRate

  const { data: holdRaw, error: holdErr } = await adminSupabase
    .from("slot_holds")
    .select(
      `
      practitioner_id,
      service_id,
      start_datetime,
      end_datetime,
      services ( name ),
      practitioners ( name )
    `
    )
    .eq("id", holdId)
    .eq("session_token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (holdErr) {
    return NextResponse.json({ error: "hold_expired" }, { status: 410 })
  }
  if (!holdRaw) {
    return NextResponse.json({ error: "hold_expired" }, { status: 410 })
  }

  const hold = holdRaw as unknown as HoldRow

  const { clinicId, canBook } = await getPractitionerBookingGate(
    hold.practitioner_id
  )
  if (!clinicId) {
    return NextResponse.json({ error: "Invalid hold" }, { status: 400 })
  }
  if (!canBook) {
    return NextResponse.json(
      { error: "This practitioner is not accepting online bookings right now." },
      { status: 403 }
    )
  }

  const { data: patient, error: patientError } = await adminSupabase
    .from("patients")
    .upsert(
      {
        clinic_id: clinicId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone ?? null,
      },
      { onConflict: "clinic_id,email" }
    )
    .select()
    .single()

  if (patientError || !patient) {
    return NextResponse.json({ error: "Failed to save patient" }, { status: 500 })
  }

  const conflict = await getPractitionerScheduleConflict(adminSupabase, {
    practitionerId: hold.practitioner_id,
    rangeStart: hold.start_datetime,
    rangeEnd: hold.end_datetime,
    excludeHoldId: holdId,
  })
  if (conflict) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 })
  }

  const { data: appointment, error: apptError } = await adminSupabase
    .from("appointments")
    .insert({
      clinic_id: patient.clinic_id,
      practitioner_id: hold.practitioner_id,
      service_id: hold.service_id,
      patient_id: patient.id,
      start_datetime: hold.start_datetime,
      end_datetime: hold.end_datetime,
      notes: notes ?? null,
      status: "booked",
    })
    .select()
    .single()

  if (apptError?.code === "23505") {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 })
  }
  if (apptError || !appointment) {
    return NextResponse.json({ error: "Booking failed" }, { status: 500 })
  }

  await adminSupabase.from("slot_holds").delete().eq("id", holdId)

  const serviceName = hold.services?.name ?? "Appointment"
  const practitionerName = hold.practitioners?.name ?? "Your practitioner"

  const pRow = patient as { notif_confirmations?: boolean | null }
  if (pRow.notif_confirmations !== false) {
    const { data: clinicBrand } = await adminSupabase
      .from("clinics")
      .select("name, logo_url, primary_color")
      .eq("id", clinicId)
      .maybeSingle()

    sendConfirmationEmail({
      to: email,
      patientName: `${firstName} ${lastName}`,
      serviceName,
      practitionerName,
      startDatetime: hold.start_datetime,
      appointmentId: appointment.id,
      clinic: clinicBrand
        ? {
            name: clinicBrand.name,
            logoUrl: clinicBrand.logo_url,
            primaryColor: clinicBrand.primary_color,
          }
        : undefined,
    }).catch(console.error)
  }

  if (phone && pRow.notif_confirmations !== false) {
    sendSMS(
      phone,
      `Booking confirmed: ${serviceName} — ${new Date(hold.start_datetime).toLocaleString()}`
    ).catch(console.error)
  }

  return NextResponse.json({ appointmentId: appointment.id })
}
