import { format, endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns"
import { adminSupabase } from "@/lib/supabase/admin"
import { StatsCards } from "./_components/StatsCards"
import { TodayAppointments } from "./_components/TodayAppointments"

export default async function DashboardPage() {
  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }).toISOString()
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 }).toISOString()

  const [
    { count: todayCount },
    { count: weekCount },
    { data: todayAppointments },
    { count: totalPatients },
  ] = await Promise.all([
    adminSupabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("start_datetime", todayStart)
      .lte("start_datetime", todayEnd)
      .neq("status", "cancelled"),
    adminSupabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("start_datetime", weekStart)
      .lte("start_datetime", weekEnd)
      .neq("status", "cancelled"),
    adminSupabase
      .from("appointments")
      .select(
        "*, practitioners(name, color), services(name, duration_minutes), patients(first_name, last_name, email)"
      )
      .gte("start_datetime", todayStart)
      .lte("start_datetime", todayEnd)
      .neq("status", "cancelled")
      .order("start_datetime"),
    adminSupabase.from("patients").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      <StatsCards
        todayCount={todayCount ?? 0}
        weekCount={weekCount ?? 0}
        totalPatients={totalPatients ?? 0}
      />

      <TodayAppointments appointments={todayAppointments ?? []} />
    </div>
  )
}
