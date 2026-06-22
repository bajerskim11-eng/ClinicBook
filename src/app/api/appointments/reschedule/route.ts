import { differenceInHours, parseISO } from "date-fns"
import { NextResponse } from "next/server"
import { sendConfirmationEmail } from "@/lib/notifications"
import { adminSupabase } from "@/lib/supabase/admin"
import { getPractitionerScheduleConflict } from "@/lib/practitioner-schedule-conflict"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const RESCHEDULE_CUTOFF_HOURS = 24

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    originalAppointmentId?: string
    newStartDatetime?: string
    newEndDatetime?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { originalAppointmentId, newStartDatetime, newEndDatetime } = body
  if (!originalAppointmentId || !newStartDatetime || !newEndDatetime) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id, clinic_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!account?.patient_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: original, error: origErr } = await adminSupabase
    .from("appointments")
    .select(
      "id, clinic_id, patient_id, practitioner_id, service_id, start_datetime, end_datetime, status, notes, patients(first_name, last_name, email), services(name), practitioners(name)"
    )
    .eq("id", originalAppointmentId)
    .single()

  if (origErr || !original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (
    original.patient_id !== account.patient_id ||
    original.clinic_id !== account.clinic_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const hoursUntil = differenceInHours(
    parseISO(original.start_datetime as string),
    new Date()
  )
  if (hoursUntil < RESCHEDULE_CUTOFF_HOURS) {
    return NextResponse.json(
      { error: "Reschedule cutoff passed" },
      { status: 422 }
    )
  }

  const conflict = await getPractitionerScheduleConflict(adminSupabase, {
    practitionerId: original.practitioner_id as string,
    rangeStart: newStartDatetime,
    rangeEnd: newEndDatetime,
    excludeAppointmentId: originalAppointmentId,
  })
  if (conflict) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 })
  }

  const previousStatus = original.status as string

  const { error: cancelErr } = await adminSupabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", originalAppointmentId)

  if (cancelErr) {
    return NextResponse.json({ error: cancelErr.message }, { status: 500 })
  }

  const { data: newAppt, error: insertErr } = await adminSupabase
    .from("appointments")
    .insert({
      clinic_id: original.clinic_id,
      practitioner_id: original.practitioner_id,
      service_id: original.service_id,
      patient_id: original.patient_id,
      start_datetime: newStartDatetime,
      end_datetime: newEndDatetime,
      status: "booked",
      notes: original.notes,
    })
    .select("id")
    .single()

  if (insertErr || !newAppt) {
    await adminSupabase
      .from("appointments")
      .update({ status: previousStatus })
      .eq("id", originalAppointmentId)

    if (insertErr?.code === "23505") {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 })
    }
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to create appointment" },
      { status: 500 }
    )
  }

  const patient = embedOne(
    original.patients as
      | { first_name: string; last_name: string; email: string }
      | { first_name: string; last_name: string; email: string }[]
      | null
  )
  const svc = embedOne(
    original.services as { name: string } | { name: string }[] | null
  )
  const pract = embedOne(
    original.practitioners as { name: string } | { name: string }[] | null
  )

  if (patient?.email) {
    void sendConfirmationEmail({
      to: patient.email,
      patientName: `${patient.first_name} ${patient.last_name}`,
      serviceName: svc?.name ?? "Appointment",
      practitionerName: pract?.name ?? "Your practitioner",
      startDatetime: newStartDatetime,
      appointmentId: newAppt.id,
    }).catch(console.error)
  }

  return NextResponse.json({ appointmentId: newAppt.id })
}
