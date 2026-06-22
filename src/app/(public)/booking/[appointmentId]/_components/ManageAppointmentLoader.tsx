"use client"

import { useEffect, useState } from "react"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import {
  ManageBooking,
  type AppointmentDetail,
} from "./ManageBooking"

/**
 * Same-origin load via `GET /api/appointments/[id]` (Edge) — avoids direct
 * browser → Supabase when that path is blocked.
 */
export function ManageAppointmentLoader({
  appointmentId,
}: {
  appointmentId: string
}) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`)
      const json = (await res.json()) as AppointmentDetail & { error?: string }

      if (res.status === 404) {
        setAppointment(null)
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      if ("error" in json && json.error) {
        setError(json.error)
        setLoading(false)
        return
      }
      setAppointment(json as AppointmentDetail)
      setLoading(false)
    })()
  }, [appointmentId])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2 p-8 text-center">
        <p className="text-destructive font-medium">Could not load appointment</p>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="p-8">
        <EmptyState title="Appointment not found." />
      </div>
    )
  }

  return <ManageBooking appointment={appointment} />
}
