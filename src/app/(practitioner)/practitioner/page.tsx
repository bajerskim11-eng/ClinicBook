"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AppointmentRow = {
  id: string
  start_datetime: string
  status: string
  patients: { first_name: string; last_name: string } | null
  services: { name: string } | null
}

export default function PractitionerHomePage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const from = new Date().toISOString()
    const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `/api/practitioner/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    )
    const json = (await res.json()) as { appointments?: AppointmentRow[] }
    if (res.ok) {
      setAppointments(json.appointments ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const upcoming = appointments.filter(
    (a) => !["cancelled", "completed", "no_show"].includes(a.status)
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your upcoming schedule for the next two weeks.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Upcoming appointments</CardTitle>
          <Link
            href="/practitioner/appointments"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No upcoming appointments in this window.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {upcoming.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                >
                  <div>
                    <p className="font-medium">
                      {a.patients
                        ? `${a.patients.first_name} ${a.patients.last_name}`
                        : "Patient"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {a.services?.name ?? "Service"} ·{" "}
                      {format(parseISO(a.start_datetime), "EEE MMM d · h:mm a")}
                    </p>
                  </div>
                  <Badge variant="secondary">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
