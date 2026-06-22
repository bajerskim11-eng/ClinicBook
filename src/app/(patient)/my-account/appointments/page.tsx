import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime, formatDuration } from "@/lib/utils"
import { Calendar, Clock, MapPin } from "lucide-react"
import { CancelAppointmentButton } from "./_components/CancelAppointmentButton"
import { RescheduleButton } from "./_components/RescheduleButton"

export default async function UpcomingAppointmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id, clinic_id, clinics(slug)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const clinicEmbed = account?.clinics as unknown
  const clinicSlug = Array.isArray(clinicEmbed)
    ? (clinicEmbed[0] as { slug?: string } | undefined)?.slug
    : (clinicEmbed as { slug?: string } | null | undefined)?.slug

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      practitioners(name, bio, avatar_url, color),
      services(name, duration_minutes),
      clinics(name, address)
    `
    )
    .eq("patient_id", account?.patient_id ?? "")
    .in("status", ["booked", "confirmed"])
    .gte("start_datetime", new Date().toISOString())
    .order("start_datetime")

  const list = appointments ?? []

  if (!list.length) {
    return (
      <div className="bg-card rounded-xl border p-10 text-center">
        <Calendar className="text-muted-foreground mx-auto mb-3 size-10" />
        <h3 className="text-foreground font-medium">No upcoming appointments</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Book an appointment to get started.
        </p>
        {clinicSlug ? (
          <Link
            href={`/book/${clinicSlug}`}
            className="text-primary mt-4 inline-block text-sm font-medium hover:underline"
          >
            Book now
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Upcoming appointments</h2>
      {list.map((appt) => {
        const pract = appt.practitioners as {
          name?: string
          color?: string
        } | null
        const svc = appt.services as { name?: string; duration_minutes?: number } | null
        const clin = appt.clinics as { name?: string; address?: string } | null
        return (
          <div key={appt.id} className="bg-card rounded-xl border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{
                    backgroundColor: pract?.color ?? "var(--primary)",
                  }}
                >
                  {pract?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) ?? "?"}
                </div>
                <div>
                  <p className="text-foreground font-semibold">{svc?.name}</p>
                  <p className="text-muted-foreground text-sm">
                    with {pract?.name}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Calendar className="size-3.5" />
                      {formatDateTime(appt.start_datetime)}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Clock className="size-3.5" />
                      {formatDuration(svc?.duration_minutes ?? 0)}
                    </div>
                    {clin?.address ? (
                      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <MapPin className="size-3.5" />
                        {clin.address}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={
                    appt.status === "confirmed"
                      ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium"
                  }
                >
                  {appt.status}
                </span>
                <RescheduleButton appointment={appt} />
                <CancelAppointmentButton appointmentId={appt.id} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
