"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn, formatDateTime } from "@/lib/utils"
import type { Appointment, Clinic, Patient, Practitioner, Service } from "@/types"

export type AppointmentDetail = Appointment & {
  practitioners: Practitioner | null
  services: Service | null
  patients: Patient | null
  clinics: Pick<Clinic, "slug" | "name"> | null
}

export function ManageBooking({
  appointment: initial,
}: {
  appointment: AppointmentDetail
}) {
  const router = useRouter()
  const [appointment, setAppointment] = useState(initial)
  const [loading, setLoading] = useState(false)

  const service = appointment.services
  const practitioner = appointment.practitioners
  const patient = appointment.patients

  async function cancel() {
    if (appointment.status === "cancelled") return
    if (!confirm("Cancel this appointment? This cannot be undone.")) return
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    if (!res.ok) {
      toast.error("Could not cancel", {
        description: "Try again or contact the clinic.",
      })
      setLoading(false)
      return
    }
    setAppointment((a) => ({ ...a, status: "cancelled" }))
    toast.success("Appointment cancelled")
    setLoading(false)
    router.refresh()
  }

  if (appointment.status === "cancelled") {
    const slug = appointment.clinics?.slug
    return (
      <div className="space-y-6 py-4 text-center">
        <XCircle className="text-muted-foreground mx-auto h-12 w-12" />
        <div>
          <h1 className="text-xl font-semibold">Appointment cancelled</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This appointment is no longer on the schedule.
          </p>
        </div>
        {slug ? (
          <Link
            href={`/book/${slug}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Book a new appointment
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your appointment
        </h1>
        <p className="text-muted-foreground text-sm">
          Reference {appointment.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{service?.name ?? "Appointment"}</CardTitle>
          <CardDescription>
            with {practitioner?.name ?? "practitioner"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <span className="font-medium capitalize">
              {appointment.status.replace("_", " ")}
            </span>
          </div>
          <p className="font-medium">{formatDateTime(appointment.start_datetime)}</p>
          {patient && (
            <p className="text-muted-foreground">
              {patient.first_name} {patient.last_name} · {patient.email}
            </p>
          )}
        </CardContent>
      </Card>

      {appointment.status !== "completed" && (
        <Button
          type="button"
          variant="destructive"
          disabled={loading}
          onClick={() => void cancel()}
        >
          {loading ? "Cancelling…" : "Cancel appointment"}
        </Button>
      )}
    </div>
  )
}
