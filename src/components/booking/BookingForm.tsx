"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HoldTimer } from "@/components/booking/HoldTimer"
import { formatDateTime } from "@/lib/utils"
import { zodEmail, zodPersonName } from "@/lib/validation"
import type { Practitioner, Service } from "@/types"

const schema = z.object({
  firstName: zodPersonName,
  lastName: zodPersonName,
  email: zodEmail,
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  honeypot: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function BookingForm({
  holdId,
  sessionToken,
  expiresAt,
  service,
  practitioner,
  startDatetime,
  onSuccess,
  onHoldExpired,
}: {
  holdId: string
  sessionToken: string
  expiresAt: string
  service: Service
  practitioner: Practitioner
  startDatetime: string
  onSuccess: (appointmentId: string) => void
  onHoldExpired: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    setError("")
    const phoneT = data.phone?.trim()
    const notesT = data.notes?.trim()
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdId,
        sessionToken,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: phoneT === "" ? undefined : phoneT,
        notes: notesT === "" ? undefined : notesT,
        honeypot: data.honeypot,
      }),
    })
    const json = (await res.json()) as { error?: string; appointmentId?: string }
    if (!res.ok) {
      if (json.error === "hold_expired") {
        onHoldExpired()
      } else if (json.error === "slot_taken") {
        setError(
          "This slot was just taken. Please go back and choose another time."
        )
      } else {
        setError("Something went wrong. Please try again.")
      }
      setSubmitting(false)
      return
    }
    if (json.appointmentId) onSuccess(json.appointmentId)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <HoldTimer expiresAt={expiresAt} onExpire={onHoldExpired} />

      {/* Honeypot: hidden from sighted/keyboard users, bots that fill every input trip it. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor="company">Company</label>
        <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register("honeypot")} />
      </div>

      <div className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
        <p className="font-medium">
          {service.name} with {practitioner.name}
        </p>
        <p className="text-muted-foreground">{formatDateTime(startDatetime)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>First name</Label>
          <Input {...register("firstName")} placeholder="Jane" />
          {errors.firstName && (
            <p className="text-destructive text-xs">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Last name</Label>
          <Input {...register("lastName")} placeholder="Smith" />
          {errors.lastName && (
            <p className="text-destructive text-xs">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Email</Label>
        <Input
          {...register("email")}
          type="email"
          placeholder="jane@example.com"
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Phone (optional)</Label>
        <Input {...register("phone")} type="tel" placeholder="(416) 555-0100" />
      </div>

      <div className="space-y-1">
        <Label>Notes for the practitioner (optional)</Label>
        <Textarea
          {...register("notes")}
          placeholder="Any relevant information..."
          rows={3}
        />
      </div>

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Confirming…" : "Confirm booking"}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        By booking, you agree to the clinic cancellation policy.
      </p>
    </form>
  )
}
