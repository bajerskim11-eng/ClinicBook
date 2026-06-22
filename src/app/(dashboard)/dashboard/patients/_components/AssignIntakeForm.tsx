"use client"

import { useState } from "react"
import { ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FORM_TEMPLATES = [
  { value: "physio_intake", label: "Physiotherapy intake form" },
]

export function AssignIntakeForm({
  patientId,
  clinicId,
  appointmentId,
  buttonLabel = "Assign form",
  onAssigned,
}: {
  patientId: string
  clinicId: string
  /** When set, stored on intake_form_submissions.appointment_id for traceability. */
  appointmentId?: string | null
  buttonLabel?: string
  onAssigned?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [formType, setFormType] = useState("physio_intake")
  const [loading, setLoading] = useState(false)

  async function assign() {
    setLoading(true)
    const res = await fetch("/api/admin/intake-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        clinicId,
        formType,
        appointmentId: appointmentId ?? null,
      }),
    })
    const data = (await res.json()) as { error?: string }
    if (res.ok) {
      toast.success("Intake form assigned", {
        description: "The patient will see it in their portal.",
      })
      setOpen(false)
      onAssigned?.()
    } else {
      toast.error(data.error ?? "Failed to assign form")
    }
    setLoading(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ClipboardList className="mr-2 size-4" /> {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign intake form</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-sm">
              The patient will see this form in their portal and receive an
              email when email is configured.
            </p>
            <Select
              value={formType}
              onValueChange={(v) => setFormType(v ?? "physio_intake")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void assign()} disabled={loading}>
              {loading ? "Assigning…" : "Assign form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
