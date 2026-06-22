"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  differenceInHours,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns"
import { toast } from "sonner"
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TimeSlot } from "@/types"

const RESCHEDULE_CUTOFF_HOURS = 24

export type RescheduleAppointment = {
  id: string
  start_datetime: string
  service_id: string
  practitioner_id: string
  services:
    | { name: string; duration_minutes: number }
    | { name: string; duration_minutes: number }[]
    | null
  practitioners:
    | { name: string }
    | { name: string }[]
    | null
}

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export function RescheduleButton({
  appointment,
}: {
  appointment: RescheduleAppointment
}) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [step, setStep] = useState<"pick" | "confirm">("pick")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const svc = embedOne(appointment.services)
  const pract = embedOne(appointment.practitioners)

  const hoursUntil = differenceInHours(
    parseISO(appointment.start_datetime),
    new Date()
  )
  const canReschedule = hoursUntil >= RESCHEDULE_CUTOFF_HOURS

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep("pick")
      setSelectedDate(undefined)
      setSelectedSlot(null)
    }
  }

  async function confirmReschedule() {
    if (!selectedSlot) return
    setSubmitting(true)
    const res = await fetch("/api/appointments/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalAppointmentId: appointment.id,
        newStartDatetime: selectedSlot.start.toISOString(),
        newEndDatetime: selectedSlot.end.toISOString(),
      }),
    })
    const data = (await res.json()) as { error?: string }
    if (res.ok) {
      toast.success("Appointment rescheduled", {
        description: `New time: ${format(selectedSlot.start, "EEEE, MMMM d 'at' h:mm a")}`,
      })
      handleOpenChange(false)
      router.refresh()
    } else {
      if (data.error === "slot_taken") {
        toast.error("That slot was just taken", {
          description: "Please choose another time.",
        })
        setStep("pick")
      } else if (res.status === 422) {
        toast.error("Reschedule no longer available", {
          description: "Reschedule closes 24 hours before your appointment.",
        })
      } else {
        toast.error("Reschedule failed", {
          description: data.error ?? "Try again.",
        })
      }
    }
    setSubmitting(false)
  }

  if (!canReschedule) {
    return (
      <span className="text-muted-foreground text-xs">
        Reschedule closes {RESCHEDULE_CUTOFF_HOURS}h before
      </span>
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reschedule
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === "pick" ? "Choose a new time" : "Confirm reschedule"}
            </DialogTitle>
          </DialogHeader>

          {step === "pick" && (
            <div className="space-y-4">
              <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm">
                <p className="text-foreground font-medium">{svc?.name}</p>
                <p>with {pract?.name}</p>
                <p className="mt-1 text-xs">
                  Current:{" "}
                  {format(
                    parseISO(appointment.start_datetime),
                    "EEEE, MMMM d 'at' h:mm a"
                  )}
                </p>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d)
                  setSelectedSlot(null)
                }}
                disabled={(d) =>
                  isBefore(startOfDay(d), startOfDay(new Date()))
                }
              />

              {selectedDate ? (
                <div>
                  <p className="text-foreground mb-2 text-sm font-medium">
                    Available times on {format(selectedDate, "MMMM d")}
                  </p>
                  <TimeSlotPicker
                    practitionerId={appointment.practitioner_id}
                    serviceId={appointment.service_id}
                    selectedDate={format(selectedDate, "yyyy-MM-dd")}
                    onSelect={(slot) => {
                      setSelectedSlot(slot)
                      setStep("confirm")
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}

          {step === "confirm" && selectedSlot ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="line-through">
                    {format(
                      parseISO(appointment.start_datetime),
                      "EEE, MMM d 'at' h:mm a"
                    )}
                  </span>
                  <span className="text-muted-foreground/70">→</span>
                  <span className="text-foreground font-medium">
                    {format(selectedSlot.start, "EEE, MMM d 'at' h:mm a")}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Your original appointment will be cancelled and a new one
                  booked. You&apos;ll receive a confirmation email.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("pick")}
                  className="flex-1 sm:flex-none"
                >
                  Pick different time
                </Button>
                <Button
                  type="button"
                  onClick={() => void confirmReschedule()}
                  disabled={submitting}
                  className="flex-1 sm:flex-none"
                >
                  {submitting ? "Rescheduling…" : "Confirm"}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
