import { Badge } from "@/components/ui/badge"
import { formatTime } from "@/lib/utils"

const statusColors: Record<string, string> = {
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
}

type Row = {
  id: string
  start_datetime: string
  status: string
  practitioners?: { name: string; color: string } | null
  services?: { name: string; duration_minutes: number } | null
  patients?: { first_name: string; last_name: string; email: string } | null
}

export function TodayAppointments({ appointments }: { appointments: Row[] }) {
  if (appointments.length === 0) {
    return (
      <div className="border-border bg-card rounded-xl border p-8 text-center shadow-sm">
        <p className="text-muted-foreground">No appointments today</p>
      </div>
    )
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border border-b p-4">
        <h2 className="text-foreground font-semibold">Today&apos;s appointments</h2>
      </div>
      <div className="divide-y">
        {appointments.map((appt) => (
          <div key={appt.id} className="flex items-center gap-4 p-4">
            <div className="text-muted-foreground w-16 shrink-0 text-sm font-medium">
              {formatTime(appt.start_datetime)}
            </div>
            <div
              className="h-10 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: appt.practitioners?.color ?? "#3b82f6" }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate font-medium">
                {appt.patients?.first_name} {appt.patients?.last_name}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {appt.services?.name} · {appt.practitioners?.name}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={statusColors[appt.status] ?? "bg-muted"}
            >
              {appt.status.replace("_", " ")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
