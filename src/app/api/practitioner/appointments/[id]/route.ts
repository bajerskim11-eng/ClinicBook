import { getPractitionerPortalContext } from "@/lib/practitioner-portal"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { practitionerAppointmentStatusSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ctx = await getPractitionerPortalContext(user.id)
  if (!ctx) {
    return NextResponse.json({ error: "No practitioner portal access" }, { status: 403 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = practitionerAppointmentStatusSchema.safeParse(json)
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const { status: nextStatus } = parsed.data

  const { data: existing, error: fetchErr } = await adminSupabase
    .from("appointments")
    .select("id, status, practitioner_id")
    .eq("id", appointmentId)
    .maybeSingle()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }
  if (existing.practitioner_id !== ctx.practitionerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const current = existing.status as string
  if (current === "cancelled") {
    return NextResponse.json({ error: "Appointment is already cancelled" }, { status: 400 })
  }

  const allowedFromBooked = ["confirmed", "cancelled", "completed", "no_show"]
  const allowedFromConfirmed = ["cancelled", "completed", "no_show"]
  const allowed =
    current === "booked"
      ? allowedFromBooked
      : current === "confirmed"
        ? allowedFromConfirmed
        : []

  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: "That status change is not allowed for this appointment" },
      { status: 400 }
    )
  }

  const { data, error } = await adminSupabase
    .from("appointments")
    .update({ status: nextStatus })
    .eq("id", appointmentId)
    .eq("practitioner_id", ctx.practitionerId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ appointment: data })
}
