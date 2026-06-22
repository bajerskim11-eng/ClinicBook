import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ClipboardCheck, ClipboardList, Clock } from "lucide-react"

/** Matches default `sm` button styling without importing client `buttonVariants`. */
const intakeFormLinkClass =
  "bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:ring-ring/50 inline-flex h-7 shrink-0 items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3"

const STATUS_CONFIG = {
  pending: {
    label: "Not started",
    color:
      "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
    icon: Clock,
  },
  in_progress: {
    label: "In progress",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    icon: ClipboardList,
  },
  submitted: {
    label: "Submitted",
    color:
      "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    icon: ClipboardCheck,
  },
} as const

export default async function IntakeFormsPage() {
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

  const { data: forms } = await supabase
    .from("intake_form_submissions")
    .select("*")
    .eq("patient_id", account?.patient_id ?? "")
    .order("assigned_at", { ascending: false })

  const list = forms ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-foreground font-semibold">Intake forms</h2>
      {!list.length ? (
        <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center">
          <ClipboardList className="mx-auto mb-2 size-8 opacity-50" />
          <p>No intake forms assigned yet.</p>
          <p className="mt-1 text-sm">
            Your clinic will assign forms here before your appointment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((f) => {
            const status = f.status as keyof typeof STATUS_CONFIG
            const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
            const Icon = config.icon
            const isActionable = f.status !== "submitted"
            return (
              <div
                key={f.id}
                className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                    <Icon className="text-primary size-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {f.form_type === "physio_intake"
                        ? "Physiotherapy intake form"
                        : f.form_type}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Assigned{" "}
                      {new Date(f.assigned_at as string).toLocaleDateString()}
                      {f.submitted_at
                        ? ` · Submitted ${new Date(f.submitted_at as string).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
                  >
                    {config.label}
                  </span>
                  {isActionable ? (
                    <Link
                      href={`/my-account/intake-forms/${f.id}`}
                      className={intakeFormLinkClass}
                    >
                      {f.status === "in_progress" ? "Continue" : "Start form"}
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
