"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function PractitionerAvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepts, setAccepts] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/practitioner/me")
    const json = (await res.json()) as {
      practitioner?: { accepts_online_bookings?: boolean }
      error?: string
    }
    if (!res.ok) {
      toast.error(json.error ?? "Could not load settings")
    } else if (json.practitioner) {
      setAccepts(json.practitioner.accepts_online_bookings !== false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function toggle(next: boolean) {
    setSaving(true)
    const res = await fetch("/api/practitioner/accepts-bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptsOnlineBookings: next }),
    })
    const json = (await res.json()) as { error?: string; acceptsOnlineBookings?: boolean }
    if (!res.ok) {
      toast.error(json.error ?? "Could not update")
    } else {
      setAccepts(json.acceptsOnlineBookings !== false)
      toast.success(
        next ? "You are accepting new online bookings." : "Online booking is turned off for you."
      )
    }
    setSaving(false)
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Online booking
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control whether new patients can book you through the public booking page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accept new bookings</CardTitle>
          <CardDescription>
            When off, your time slots no longer appear as available for online booking.
            Your clinic can still schedule you from the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={accepts}
              disabled={saving}
              onCheckedChange={(v) => void toggle(v)}
            />
            <Label>{accepts ? "On — accepting online bookings" : "Off — not bookable online"}</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
