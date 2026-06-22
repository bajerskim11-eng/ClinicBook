import {
  addMinutes,
  areIntervalsOverlapping,
  format,
  parseISO,
} from "date-fns"
import { adminSupabase } from "@/lib/supabase/admin"
import type { TimeSlot } from "@/types"

/** Used by public booking (slots, holds) to respect inactive practitioners or “closed” online booking. */
export async function getPractitionerBookingGate(practitionerId: string): Promise<{
  clinicId: string | null
  canBook: boolean
}> {
  const { data } = await adminSupabase
    .from("practitioners")
    .select("clinic_id, is_active, accepts_online_bookings")
    .eq("id", practitionerId)
    .maybeSingle()
  if (!data) return { clinicId: null, canBook: false }
  const acceptsOnline = data.accepts_online_bookings !== false
  const canBook = Boolean(data.is_active) && acceptsOnline
  return { clinicId: data.clinic_id ?? null, canBook }
}

function parseTimeOnDate(timeStr: string, targetDate: Date): Date {
  const parts = timeStr.split(":").map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const d = new Date(targetDate)
  d.setHours(h, m, 0, 0)
  return d
}

export async function getAvailableSlots({
  practitionerId,
  serviceId,
  date,
}: {
  practitionerId: string
  serviceId: string
  date: string
}): Promise<TimeSlot[]> {
  const { clinicId, canBook } = await getPractitionerBookingGate(practitionerId)
  if (!canBook) return []

  const targetDate = new Date(`${date}T12:00:00`)
  const dayOfWeek = targetDate.getDay()

  const { data: service } = await adminSupabase
    .from("services")
    .select("duration_minutes, buffer_minutes")
    .eq("id", serviceId)
    .single()

  if (!service) return []

  const totalMinutes = service.duration_minutes + service.buffer_minutes

  const { data: schedule } = await adminSupabase
    .from("schedules")
    .select("start_time, end_time")
    .eq("practitioner_id", practitionerId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .maybeSingle()

  if (!schedule) return []

  if (clinicId) {
    const { data: holiday } = await adminSupabase
      .from("clinic_holidays")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("date", date)
      .maybeSingle()
    if (holiday) return []
  }

  const startStr =
    typeof schedule.start_time === "string"
      ? schedule.start_time
      : String(schedule.start_time)
  const endStr =
    typeof schedule.end_time === "string"
      ? schedule.end_time
      : String(schedule.end_time)

  const dayStart = parseTimeOnDate(startStr, targetDate)
  const dayEnd = parseTimeOnDate(endStr, targetDate)

  const allSlots: TimeSlot[] = []
  let cursor = new Date(dayStart)

  while (addMinutes(cursor, totalMinutes) <= dayEnd) {
    allSlots.push({
      start: new Date(cursor),
      end: addMinutes(cursor, service.duration_minutes),
      available: true,
    })
    cursor = addMinutes(cursor, totalMinutes)
  }

  const dayStartISO = dayStart.toISOString()
  const dayEndISO = dayEnd.toISOString()

  const { data: appointments } = await adminSupabase
    .from("appointments")
    .select("start_datetime, end_datetime")
    .eq("practitioner_id", practitionerId)
    .neq("status", "cancelled")
    .gte("start_datetime", dayStartISO)
    .lte("start_datetime", dayEndISO)

  const { data: holds } = await adminSupabase
    .from("slot_holds")
    .select("start_datetime, end_datetime")
    .eq("practitioner_id", practitionerId)
    .gt("expires_at", new Date().toISOString())
    .gte("start_datetime", dayStartISO)
    .lte("start_datetime", dayEndISO)

  const { data: blocks } = await adminSupabase
    .from("time_blocks")
    .select("start_datetime, end_datetime")
    .eq("practitioner_id", practitionerId)
    .lte("start_datetime", dayEndISO)
    .gte("end_datetime", dayStartISO)

  const blockedIntervals = [
    ...(appointments ?? []).map((a) => ({
      start: parseISO(a.start_datetime),
      end: parseISO(a.end_datetime),
    })),
    ...(holds ?? []).map((h) => ({
      start: parseISO(h.start_datetime),
      end: parseISO(h.end_datetime),
    })),
    ...(blocks ?? []).map((b) => ({
      start: parseISO(b.start_datetime),
      end: parseISO(b.end_datetime),
    })),
  ]

  const now = new Date()
  return allSlots.map((slot) => ({
    ...slot,
    available:
      slot.start > now &&
      !blockedIntervals.some((blocked) =>
        areIntervalsOverlapping(
          { start: slot.start, end: slot.end },
          { start: blocked.start, end: blocked.end }
        )
      ),
  }))
}

export async function getNextAvailableDate({
  practitionerId,
  serviceId,
  fromDate = new Date(),
  daysAhead = 60,
}: {
  practitionerId: string
  serviceId: string
  fromDate?: Date
  daysAhead?: number
}): Promise<Date | null> {
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(fromDate)
    d.setDate(d.getDate() + i)
    const dateStr = format(d, "yyyy-MM-dd")
    const slots = await getAvailableSlots({ practitionerId, serviceId, date: dateStr })
    if (slots.some((s) => s.available)) return d
  }
  return null
}

export async function getAvailableDatesInMonth({
  practitionerId,
  serviceId,
  year,
  month,
}: {
  practitionerId: string
  serviceId: string
  year: number
  month: number
}): Promise<Set<string>> {
  const available = new Set<string>()
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const slots = await getAvailableSlots({ practitionerId, serviceId, date: dateStr })
    if (slots.some((s) => s.available)) available.add(dateStr)
  }

  return available
}
