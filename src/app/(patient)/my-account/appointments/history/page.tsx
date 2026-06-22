import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"
import { Clock } from "lucide-react"

export default async function AppointmentHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, practitioners(name, color), services(name, duration_minutes)")
    .eq("patient_id", account?.patient_id ?? "")
    .or("status.eq.completed,status.eq.cancelled,status.eq.no_show")
    .order("start_datetime", { ascending: false })
    .limit(50)

  const list = appointments ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Appointment history</h2>
      {!list.length && (
        <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center">
          <Clock className="mx-auto mb-2 size-8 opacity-50" />
          <p>No past appointments yet.</p>
        </div>
      )}
      {list.length > 0 ? (
        <div className="bg-card overflow-hidden rounded-xl border">
          {list.map((appt, i) => {
            const pract = appt.practitioners as {
              name?: string
              color?: string
            } | null
            const svc = appt.services as { name?: string } | null
            return (
              <div
                key={appt.id}
                className={`flex items-center gap-4 p-4 ${
                  i < list.length - 1 ? "border-b" : ""
                }`}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{
                    backgroundColor: pract?.color ?? "var(--muted-foreground)",
                  }}
                >
                  {pract?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">
                    {svc?.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {pract?.name} ·{" "}
                    {format(new Date(appt.start_datetime), "MMM d, yyyy")}
                  </p>
                </div>
                <span
                  className={
                    appt.status === "completed"
                      ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-950 dark:text-green-200"
                      : appt.status === "cancelled"
                        ? "bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs"
                        : "rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800 dark:bg-orange-950 dark:text-orange-200"
                  }
                >
                  {appt.status}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
