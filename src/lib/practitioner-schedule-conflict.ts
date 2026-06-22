import type { SupabaseClient } from "@supabase/supabase-js"

export type ScheduleConflictReason = "appointment" | "hold" | "time_block"

/**
 * Interval overlap: existing.start < rangeEnd && existing.end > rangeStart
 * (same pattern as availability + admin appointment create).
 */
export async function getPractitionerScheduleConflict(
  supabase: SupabaseClient,
  args: {
    practitionerId: string
    rangeStart: string
    rangeEnd: string
    excludeAppointmentId?: string
    excludeHoldId?: string
  }
): Promise<ScheduleConflictReason | null> {
  const {
    practitionerId,
    rangeStart,
    rangeEnd,
    excludeAppointmentId,
    excludeHoldId,
  } = args

  let apptQ = supabase
    .from("appointments")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .neq("status", "cancelled")
    .lt("start_datetime", rangeEnd)
    .gt("end_datetime", rangeStart)
    .limit(1)
  if (excludeAppointmentId) {
    apptQ = apptQ.neq("id", excludeAppointmentId)
  }
  const { data: appt } = await apptQ.maybeSingle()
  if (appt) return "appointment"

  let holdQ = supabase
    .from("slot_holds")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .gt("expires_at", new Date().toISOString())
    .lt("start_datetime", rangeEnd)
    .gt("end_datetime", rangeStart)
    .limit(1)
  if (excludeHoldId) {
    holdQ = holdQ.neq("id", excludeHoldId)
  }
  const { data: hold } = await holdQ.maybeSingle()
  if (hold) return "hold"

  const { data: block } = await supabase
    .from("time_blocks")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .lt("start_datetime", rangeEnd)
    .gt("end_datetime", rangeStart)
    .limit(1)
    .maybeSingle()

  if (block) return "time_block"

  return null
}
