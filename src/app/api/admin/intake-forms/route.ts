import { NextResponse } from "next/server"
import { sendIntakeFormAssignedEmail } from "@/lib/notifications"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    patientId?: string
    clinicId?: string
    formType?: string
    appointmentId?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { patientId, clinicId, formType = "physio_intake", appointmentId } = body
  if (!patientId || !clinicId) {
    return NextResponse.json({ error: "patientId and clinicId required" }, { status: 400 })
  }

  const { data: existing } = await adminSupabase
    .from("intake_form_submissions")
    .select("id")
    .eq("patient_id", patientId)
    .eq("form_type", formType)
    .in("status", ["pending", "in_progress"])
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: "Form already assigned and pending" },
      { status: 409 }
    )
  }

  const { data, error } = await adminSupabase
    .from("intake_form_submissions")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      appointment_id: appointmentId ?? null,
      form_type: formType,
      status: "pending",
      assigned_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: patient } = await adminSupabase
    .from("patients")
    .select("email, first_name")
    .eq("id", patientId)
    .single()

  if (patient?.email) {
    void sendIntakeFormAssignedEmail({
      to: patient.email,
      firstName: patient.first_name ?? "there",
    }).catch(console.error)
  }

  return NextResponse.json(data)
}
