import { NextResponse } from "next/server"
import { sendConfirmationEmail } from "@/lib/notifications"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getPractitionerScheduleConflict } from "@/lib/practitioner-schedule-conflict"
import { adminCreateAppointmentSchema } from "@/lib/validation"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = adminCreateAppointmentSchema.safeParse(json)
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const {
    clinicId,
    practitionerId,
    serviceId,
    startDatetime,
    endDatetime,
    patientFirstName,
    patientLastName,
    patientEmail,
    patientPhone,
    notes,
  } = parsed.data

  const conflict = await getPractitionerScheduleConflict(adminSupabase, {
    practitionerId,
    rangeStart: startDatetime,
    rangeEnd: endDatetime,
  })
  if (conflict) {
    return NextResponse.json({ error: "slot_conflict" }, { status: 409 })
  }

  const { data: patient, error: patientErr } = await adminSupabase
    .from("patients")
    .upsert(
      {
        clinic_id: clinicId,
        first_name: patientFirstName,
        last_name: patientLastName,
        email: patientEmail,
        phone: patientPhone ?? null,
      },
      { onConflict: "clinic_id,email" }
    )
    .select()
    .single()

  if (patientErr || !patient) {
    return NextResponse.json(
      { error: patientErr?.message ?? "Could not save patient" },
      { status: 500 }
    )
  }

  const { data: appt, error } = await adminSupabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      practitioner_id: practitionerId,
      service_id: serviceId,
      patient_id: patient.id,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      status: "confirmed",
      notes: notes ?? null,
    })
    .select("*, services(name), practitioners(name)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "slot_conflict" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const svc = appt.services as { name: string } | null
  const pract = appt.practitioners as { name: string } | null

  void sendConfirmationEmail({
    to: patientEmail,
    patientName: `${patientFirstName} ${patientLastName}`,
    serviceName: svc?.name ?? "Appointment",
    practitionerName: pract?.name ?? "Your practitioner",
    startDatetime,
    appointmentId: appt.id,
  }).catch(console.error)

  return NextResponse.json(appt)
}
