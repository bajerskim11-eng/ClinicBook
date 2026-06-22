import { NextResponse } from "next/server"
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
  const role = String(user.app_metadata?.role ?? "").toLowerCase()
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const confirm =
    typeof json === "object" && json !== null && "confirm" in json
      ? String((json as { confirm?: unknown }).confirm ?? "")
      : ""
  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Type "DELETE" to confirm wiping demo data.' },
      { status: 400 }
    )
  }

  const { data: clinic, error: clinicErr } = await adminSupabase
    .from("clinics")
    .select("id, is_demo_data")
    .limit(1)
    .maybeSingle()

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
  }
  if (!clinic.is_demo_data) {
    return NextResponse.json(
      { error: "This clinic is not marked as demo data." },
      { status: 400 }
    )
  }

  const clinicId = clinic.id as string

  const { data: practitionerRows } = await adminSupabase
    .from("practitioners")
    .select("id")
    .eq("clinic_id", clinicId)
  const practitionerIds = (practitionerRows ?? []).map((p) => p.id as string)

  const { data: practitionerAccountRows } = await adminSupabase
    .from("practitioner_accounts")
    .select("user_id")
    .eq("clinic_id", clinicId)
  const { data: patientAccountRows } = await adminSupabase
    .from("patient_accounts")
    .select("user_id")
    .eq("clinic_id", clinicId)
  const portalUserIds = [
    ...(practitionerAccountRows ?? []).map((r) => r.user_id as string),
    ...(patientAccountRows ?? []).map((r) => r.user_id as string),
  ]

  await adminSupabase.from("intake_form_submissions").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("appointments").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("patient_documents").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("intake_forms").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("messages").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("patient_notes").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("practitioner_reviews").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("patient_accounts").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("patients").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("practitioner_accounts").delete().eq("clinic_id", clinicId)

  if (practitionerIds.length > 0) {
    await adminSupabase
      .from("practitioner_service_pricing")
      .delete()
      .in("practitioner_id", practitionerIds)
    await adminSupabase.from("practitioner_services").delete().in("practitioner_id", practitionerIds)
    await adminSupabase.from("schedules").delete().in("practitioner_id", practitionerIds)
    await adminSupabase.from("slot_holds").delete().in("practitioner_id", practitionerIds)
    await adminSupabase.from("time_blocks").delete().in("practitioner_id", practitionerIds)
  }

  await adminSupabase.from("clinic_holidays").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("practitioners").delete().eq("clinic_id", clinicId)
  await adminSupabase.from("services").delete().eq("clinic_id", clinicId)

  for (const userId of portalUserIds) {
    if (userId === user.id) continue
    await adminSupabase.auth.admin.deleteUser(userId).catch(() => {})
  }

  await adminSupabase.from("clinics").update({ is_demo_data: false }).eq("id", clinicId)

  return NextResponse.json({ ok: true })
}
