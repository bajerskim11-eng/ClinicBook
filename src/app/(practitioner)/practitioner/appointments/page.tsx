"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AppointmentRow = {
  id: string
  start_datetime: string
  end_datetime: string
  status: string
  notes: string | null
  patients: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
  } | null
  services: { name: string; duration_minutes: number } | null
}

export default function PractitionerAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `/api/practitioner/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    )
    const json = (await res.json()) as { appointments?: AppointmentRow[]; error?: string }
    if (!res.ok) {
      toast.error(json.error ?? "Could not load appointments")
      setAppointments([])
    } else {
      setAppointments(json.appointments ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function updateStatus(
    id: string,
    status: "confirmed" | "cancelled" | "completed" | "no_show"
  ) {
    setBusyId(id)
    const res = await fetch(`/api/practitioner/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      toast.error(json.error ?? "Update failed")
    } else {
      toast.success("Appointment updated")
      void load()
    }
    setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Appointments
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Confirm, complete, or cancel bookings assigned to you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Past week through next 60 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No appointments found.</p>
          ) : (
            <ul className="divide-border space-y-0 divide-y">
              {appointments.map((a) => (
                <li key={a.id} className="py-4 first:pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {a.patients
                          ? `${a.patients.first_name} ${a.patients.last_name}`
                          : "Patient"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {a.services?.name ?? "Service"} ·{" "}
                        {format(parseISO(a.start_datetime), "EEE MMM d, yyyy h:mm a")}
                      </p>
                      {a.patients?.email ? (
                        <p className="text-muted-foreground text-xs">{a.patients.email}</p>
                      ) : null}
                      {a.notes ? (
                        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                          {a.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <Badge variant="secondary">{a.status}</Badge>
                      <div className="flex flex-wrap gap-1">
                        {a.status === "booked" ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={busyId === a.id}
                              onClick={() => void updateStatus(a.id, "confirmed")}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === a.id}
                              onClick={() => void updateStatus(a.id, "cancelled")}
                            >
                              Decline
                            </Button>
                          </>
                        ) : null}
                        {a.status === "confirmed" ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={busyId === a.id}
                              onClick={() => void updateStatus(a.id, "completed")}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === a.id}
                              onClick={() => void updateStatus(a.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
