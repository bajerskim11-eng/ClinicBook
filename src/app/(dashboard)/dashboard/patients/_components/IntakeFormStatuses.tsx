"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

type Row = {
  id: string
  status: string
  form_type: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  submitted:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
}

export function IntakeFormStatuses({ patientId }: { patientId: string }) {
  const [forms, setForms] = useState<Row[]>([])
  const supabase = createClient()

  useEffect(() => {
    void supabase
      .from("intake_form_submissions")
      .select("id, status, form_type")
      .eq("patient_id", patientId)
      .order("assigned_at", { ascending: false })
      .then(({ data }) => setForms((data as Row[]) ?? []))
  }, [patientId, supabase])

  if (forms.length === 0) return null

  const hasPendingIntake = forms.some(
    (f) => f.status === "pending" || f.status === "in_progress"
  )

  return (
    <div className="space-y-2">
      {hasPendingIntake ? (
        <Badge variant="secondary" className="text-xs font-medium">
          Intake pending
        </Badge>
      ) : null}
      <h3 className="text-foreground text-sm font-medium">Intake forms</h3>
      {forms.map((f) => (
        <div
          key={f.id}
          className="bg-muted/50 flex items-center justify-between rounded-lg p-2 text-xs"
        >
          <span>
            {f.form_type === "physio_intake"
              ? "Physio intake"
              : f.form_type}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${STATUS_COLORS[f.status] ?? "bg-muted"}`}
          >
            {f.status === "submitted"
              ? "Submitted"
              : f.status === "in_progress"
                ? "In progress"
                : "Pending"}
          </span>
        </div>
      ))}
    </div>
  )
}
