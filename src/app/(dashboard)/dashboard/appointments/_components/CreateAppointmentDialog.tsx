"use client"

import { useEffect, useState } from "react"
import { addMinutes, format } from "date-fns"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { adminCreateAppointmentSchema } from "@/lib/validation"
import type { Practitioner, Service } from "@/types"

export function CreateAppointmentDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false)
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patient_first_name: "",
    patient_last_name: "",
    patient_email: "",
    patient_phone: "",
    practitioner_id: "",
    service_id: "",
    date: "",
    time: "",
    notes: "",
  })
  const supabase = createClient()

  useEffect(() => {
    if (!clinicId || !open) return
    void Promise.all([
      supabase
        .from("practitioners")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("services")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("name"),
    ]).then(([{ data: ps }, { data: ss }]) => {
      setPractitioners((ps as Practitioner[]) || [])
      setServices((ss as Service[]) || [])
    })
  }, [clinicId, open, supabase])

  function setField(key: keyof typeof form, val: string) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function create() {
    if (
      !form.practitioner_id ||
      !form.service_id ||
      !form.date ||
      !form.time ||
      !clinicId
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    const service = services.find((s) => s.id === form.service_id)
    const startDatetime = new Date(`${form.date}T${form.time}:00`)
    const endDatetime = addMinutes(
      startDatetime,
      service?.duration_minutes ?? 60
    )

    const payload = {
      clinicId,
      practitionerId: form.practitioner_id,
      serviceId: form.service_id,
      startDatetime: startDatetime.toISOString(),
      endDatetime: endDatetime.toISOString(),
      patientFirstName: form.patient_first_name,
      patientLastName: form.patient_last_name,
      patientEmail: form.patient_email,
      patientPhone: form.patient_phone,
      notes: form.notes,
    }
    const parsed = adminCreateAppointmentSchema.safeParse(payload)
    if (!parsed.success) {
      const msg =
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
        "Check patient name and email"
      toast.error(msg)
      return
    }

    setLoading(true)
    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    })

    const data = (await res.json()) as { error?: string }
    if (!res.ok) {
      toast.error(
        data.error === "slot_conflict"
          ? "That time slot is already booked"
          : "Failed to create appointment"
      )
    } else {
      toast.success("Appointment created", {
        description: "Confirmation email sent when email is configured.",
      })
      setOpen(false)
      setForm({
        patient_first_name: "",
        patient_last_name: "",
        patient_email: "",
        patient_phone: "",
        practitioner_id: "",
        service_id: "",
        date: "",
        time: "",
        notes: "",
      })
    }
    setLoading(false)
  }

  if (!clinicId) return null

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" /> New appointment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create appointment</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.patient_first_name}
                  onChange={(e) => setField("patient_first_name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.patient_last_name}
                  onChange={(e) => setField("patient_last_name", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.patient_email}
                onChange={(e) => setField("patient_email", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={form.patient_phone}
                onChange={(e) => setField("patient_phone", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>
                Service <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.service_id}
                onValueChange={(v) => setField("service_id", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Practitioner <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.practitioner_id}
                onValueChange={(v) => setField("practitioner_id", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select practitioner" />
                </SelectTrigger>
                <SelectContent>
                  {practitioners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setField("date", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setField("time", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Internal notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={loading}>
              {loading ? "Creating…" : "Create appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
