import { subMonths } from "date-fns"
import { adminSupabase } from "@/lib/supabase/admin"
import { ReportsDashboard } from "./_components/ReportsDashboard"

export const runtime = "nodejs"

export default async function ReportsPage() {
  const now = new Date()
  const sixMonthsAgo = subMonths(now, 6)

  const [
    { data: allAppointments },
    { data: practitioners },
    { data: services },
    { data: newPatients },
  ] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select(
        "id, status, start_datetime, created_at, service_id, practitioner_id, patient_id, services(name, price_cents), practitioners(name)"
      )
      .gte("start_datetime", sixMonthsAgo.toISOString())
      .order("start_datetime"),

    adminSupabase.from("practitioners").select("id, name").eq("is_active", true),

    adminSupabase.from("services").select("id, name, price_cents").eq("is_active", true),

    adminSupabase
      .from("patients")
      .select("id, created_at")
      .gte("created_at", sixMonthsAgo.toISOString()),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">Last 6 months</p>
      </div>
      <ReportsDashboard
        appointments={allAppointments ?? []}
        practitioners={practitioners ?? []}
        services={services ?? []}
        newPatients={newPatients ?? []}
      />
    </div>
  )
}
