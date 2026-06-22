import { getAvailableDatesInMonth, getAvailableSlots } from "@/lib/availability"
import { NextResponse } from "next/server"

/** Edge uses a different fetch path; helps when Node `fetch` to Supabase fails locally. */
export const runtime = "edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const practitionerId = searchParams.get("practitionerId")
  const serviceId = searchParams.get("serviceId")
  const date = searchParams.get("date")
  const month = searchParams.get("month")

  if (!practitionerId || !serviceId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  if (month) {
    const parts = month.split("-").map(Number)
    const year = parts[0]
    const m = parts[1]
    if (!year || !m) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }
    const availableDates = await getAvailableDatesInMonth({
      practitionerId,
      serviceId,
      year,
      month: m,
    })
    return NextResponse.json({ availableDates: Array.from(availableDates) })
  }

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 })
  }

  const slots = await getAvailableSlots({ practitionerId, serviceId, date })
  return NextResponse.json({
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      available: s.available,
    })),
  })
}
