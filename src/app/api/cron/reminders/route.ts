import { addHours } from "date-fns"
import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { sendReminderEmail, sendSMS } from "@/lib/notifications"

export const runtime = "nodejs"

type ApptReminderRow = {
  id: string
  start_datetime: string
  patients: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
    notif_email_reminders?: boolean | null
    notif_reminder_timing?: string | null
  }
  services: { name: string }
  practitioners: { name: string } | null
}

function wants24hReminder(p: ApptReminderRow["patients"] | null | undefined) {
  if (!p?.email) return false
  if (p.notif_email_reminders === false) return false
  const t = p.notif_reminder_timing ?? "24h"
  return t === "24h" || t === "both"
}

function wants1hReminder(p: ApptReminderRow["patients"] | null | undefined) {
  if (!p?.email) return false
  if (p.notif_email_reminders === false) return false
  const t = p.notif_reminder_timing ?? "24h"
  return t === "1h" || t === "both"
}

function authorizeCron(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const in24h = addHours(now, 24)
  const in25h = addHours(now, 25)
  const in1h = addHours(now, 1)
  const in2h = addHours(now, 2)

  const { data: appointments24hRaw, error: e24 } = await adminSupabase
    .from("appointments")
    .select(
      "id, start_datetime, patients(first_name, last_name, email, phone, notif_email_reminders, notif_reminder_timing), services(name), practitioners(name)"
    )
    .eq("status", "booked")
    .is("reminder_24h_sent_at", null)
    .gte("start_datetime", in24h.toISOString())
    .lte("start_datetime", in25h.toISOString())

  const { data: appointments1hRaw, error: e1 } = await adminSupabase
    .from("appointments")
    .select(
      "id, start_datetime, patients(first_name, last_name, email, phone, notif_email_reminders, notif_reminder_timing), services(name), practitioners(name)"
    )
    .eq("status", "booked")
    .is("reminder_1h_sent_at", null)
    .gte("start_datetime", in1h.toISOString())
    .lte("start_datetime", in2h.toISOString())

  if (e24 || e1) {
    return NextResponse.json(
      { error: e24?.message ?? e1?.message ?? "Query failed" },
      { status: 500 }
    )
  }

  const { data: clinicBrandRow } = await adminSupabase
    .from("clinics")
    .select("name, logo_url, primary_color")
    .limit(1)
    .maybeSingle()
  const clinicBrand = clinicBrandRow
    ? {
        name: clinicBrandRow.name,
        logoUrl: clinicBrandRow.logo_url,
        primaryColor: clinicBrandRow.primary_color,
      }
    : undefined

  const appointments24h = ((appointments24hRaw ?? []) as unknown as ApptReminderRow[]).filter(
    (a) => wants24hReminder(a.patients)
  )
  const appointments1h = ((appointments1hRaw ?? []) as unknown as ApptReminderRow[]).filter((a) =>
    wants1hReminder(a.patients)
  )

  let sent24h = 0
  let sent1h = 0

  for (const appt of appointments24h) {
    const patient = appt.patients
    const service = appt.services
    if (!patient?.email || !service?.name) continue
    try {
      await sendReminderEmail({
        to: patient.email,
        patientName: `${patient.first_name} ${patient.last_name}`,
        serviceName: service.name,
        startDatetime: appt.start_datetime,
        appointmentId: appt.id,
        practitionerName: appt.practitioners?.name ?? undefined,
        kind: "24h",
        clinic: clinicBrand,
      })
      if (patient.phone && wants24hReminder(patient)) {
        await sendSMS(
          patient.phone,
          `Reminder: ${service.name} in 24h at ${new Date(appt.start_datetime).toLocaleString()}`
        )
      }
      await adminSupabase
        .from("appointments")
        .update({ reminder_24h_sent_at: now.toISOString() })
        .eq("id", appt.id)
      sent24h++
    } catch (e) {
      console.error("Failed 24h reminder", appt.id, e)
    }
  }

  for (const appt of appointments1h) {
    const patient = appt.patients
    const service = appt.services
    if (!patient?.email || !service?.name) continue
    try {
      await sendReminderEmail({
        to: patient.email,
        patientName: `${patient.first_name} ${patient.last_name}`,
        serviceName: service.name,
        startDatetime: appt.start_datetime,
        appointmentId: appt.id,
        practitionerName: appt.practitioners?.name ?? undefined,
        kind: "1h",
        clinic: clinicBrand,
      })
      await adminSupabase
        .from("appointments")
        .update({ reminder_1h_sent_at: now.toISOString() })
        .eq("id", appt.id)
      sent1h++
    } catch (e) {
      console.error("Failed 1h reminder", appt.id, e)
    }
  }

  return NextResponse.json({
    sent24h,
    sent1h,
    timestamp: now.toISOString(),
  })
}
