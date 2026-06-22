"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, isBefore, startOfDay } from "date-fns"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker"
import { BookingForm } from "@/components/booking/BookingForm"
import { BookingSuccess } from "@/components/booking/BookingSuccess"
import { formatPrice, formatDuration } from "@/lib/utils"
import type {
  Clinic,
  PractitionerWithServices,
  Service,
  TimeSlot,
} from "@/types"

type Step = "service" | "practitioner" | "datetime" | "details" | "success"

type PersistedBookingPayload = {
  step?: Step
  selectedServiceId?: string
  selectedPractitionerId?: string
  selectedDateIso?: string
  selectedSlotStartIso?: string
  selectedSlotEndIso?: string
  hold?: {
    holdId: string
    sessionToken: string
    expiresAt: string
  } | null
}

type RestoredBookingState = {
  step: Step
  selectedService: Service | null
  selectedPractitioner: PractitionerWithServices | null
  selectedDate: Date | undefined
  selectedSlot: TimeSlot | null
  hold: {
    holdId: string
    sessionToken: string
    expiresAt: string
  } | null
}

function practitionerOffersService(
  p: PractitionerWithServices,
  serviceId: string
) {
  return (p.practitioner_services ?? []).some((ps) => ps.service_id === serviceId)
}

function resolveInitialBookingState(
  preSelectedPractitionerId: string | undefined,
  preSelectedServiceId: string | undefined,
  services: Service[],
  practitioners: PractitionerWithServices[]
) {
  const preP = preSelectedPractitionerId
    ? practitioners.find((x) => x.id === preSelectedPractitionerId) ?? null
    : null
  const preS = preSelectedServiceId
    ? services.find((x) => x.id === preSelectedServiceId) ?? null
    : null
  if (preP && preS && practitionerOffersService(preP, preS.id)) {
    return {
      step: "datetime" as Step,
      service: preS,
      practitioner: preP,
    }
  }
  if (preP) {
    return { step: "service" as Step, service: null, practitioner: preP }
  }
  return { step: "service" as Step, service: null, practitioner: null }
}

function restorePersistedBookingState(
  bookingStateKey: string,
  services: Service[],
  practitioners: PractitionerWithServices[],
  initial: ReturnType<typeof resolveInitialBookingState>
): RestoredBookingState {
  const fallback: RestoredBookingState = {
    step: initial.step,
    selectedService: initial.service,
    selectedPractitioner: initial.practitioner,
    selectedDate: undefined,
    selectedSlot: null,
    hold: null,
  }

  if (typeof window === "undefined") return fallback

  try {
    const raw = window.sessionStorage.getItem(bookingStateKey)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as PersistedBookingPayload

    const restoredService = parsed.selectedServiceId
      ? services.find((s) => s.id === parsed.selectedServiceId) ?? null
      : null
    let restoredPractitioner = parsed.selectedPractitionerId
      ? practitioners.find((p) => p.id === parsed.selectedPractitionerId) ?? null
      : null

    if (
      restoredService &&
      restoredPractitioner &&
      !practitionerOffersService(restoredPractitioner, restoredService.id)
    ) {
      restoredPractitioner = null
    }

    let selectedDate: Date | undefined
    if (parsed.selectedDateIso) {
      const d = new Date(parsed.selectedDateIso)
      if (!Number.isNaN(d.getTime())) selectedDate = d
    }

    let selectedSlot: TimeSlot | null = null
    let hold: RestoredBookingState["hold"] = null
    if (
      parsed.selectedSlotStartIso &&
      parsed.selectedSlotEndIso &&
      parsed.hold?.holdId &&
      parsed.hold?.sessionToken &&
      parsed.hold?.expiresAt
    ) {
      const start = new Date(parsed.selectedSlotStartIso)
      const end = new Date(parsed.selectedSlotEndIso)
      const holdExpiresAtMs = new Date(parsed.hold.expiresAt).getTime()
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        Number.isFinite(holdExpiresAtMs) &&
        holdExpiresAtMs > Date.now()
      ) {
        selectedSlot = { start, end, available: true }
        hold = {
          holdId: parsed.hold.holdId,
          sessionToken: parsed.hold.sessionToken,
          expiresAt: parsed.hold.expiresAt,
        }
      }
    }

    const requestedStep = parsed.step ?? "service"
    let safeStep: Step = "service"
    if (requestedStep === "service") safeStep = "service"
    if (requestedStep === "practitioner") {
      safeStep = restoredService ? "practitioner" : "service"
    }
    if (requestedStep === "datetime") {
      if (restoredService && restoredPractitioner) safeStep = "datetime"
      else if (restoredService) safeStep = "practitioner"
      else safeStep = "service"
    }
    if (requestedStep === "details") {
      if (
        hold &&
        selectedSlot &&
        restoredService &&
        restoredPractitioner &&
        new Date(hold.expiresAt).getTime() > Date.now()
      ) {
        safeStep = "details"
      } else if (restoredService && restoredPractitioner) safeStep = "datetime"
      else if (restoredService) safeStep = "practitioner"
      else safeStep = "service"
    }

    return {
      step: safeStep,
      selectedService: restoredService ?? initial.service,
      selectedPractitioner: restoredPractitioner ?? initial.practitioner,
      selectedDate,
      selectedSlot,
      hold,
    }
  } catch {
    return fallback
  }
}

export function BookingWidget({
  clinic,
  services,
  practitioners,
  preSelectedPractitionerId,
  preSelectedServiceId,
}: {
  clinic: Clinic
  services: Service[]
  practitioners: PractitionerWithServices[]
  preSelectedPractitionerId?: string
  preSelectedServiceId?: string
}) {
  const bookingStateKey = `booking-state:${clinic.id}`
  const initial = useMemo(
    () =>
      resolveInitialBookingState(
        preSelectedPractitionerId,
        preSelectedServiceId,
        services,
        practitioners
      ),
    [practitioners, services, preSelectedPractitionerId, preSelectedServiceId]
  )
  const restored = useMemo(
    () =>
      restorePersistedBookingState(
        bookingStateKey,
        services,
        practitioners,
        initial
      ),
    [bookingStateKey, services, practitioners, initial]
  )

  const [step, setStep] = useState<Step>(() => restored.step)
  const [selectedService, setSelectedService] = useState<Service | null>(
    () => restored.selectedService
  )
  const [selectedPractitioner, setSelectedPractitioner] =
    useState<PractitionerWithServices | null>(() => restored.selectedPractitioner)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => restored.selectedDate
  )
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(
    () => restored.selectedSlot
  )
  const [hold, setHold] = useState<{
    holdId: string
    sessionToken: string
    expiresAt: string
  } | null>(() => restored.hold)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  useEffect(() => {
    const payload = {
      step,
      selectedServiceId: selectedService?.id,
      selectedPractitionerId: selectedPractitioner?.id,
      selectedDateIso: selectedDate?.toISOString(),
      selectedSlotStartIso: selectedSlot?.start?.toISOString(),
      selectedSlotEndIso: selectedSlot?.end?.toISOString(),
      hold: hold
        ? {
            holdId: hold.holdId,
            sessionToken: hold.sessionToken,
            expiresAt: hold.expiresAt,
          }
        : null,
    }
    window.sessionStorage.setItem(bookingStateKey, JSON.stringify(payload))
  }, [
    bookingStateKey,
    step,
    selectedService?.id,
    selectedPractitioner?.id,
    selectedDate,
    selectedSlot,
    hold,
  ])

  useEffect(() => {
    if (
      !preSelectedPractitionerId ||
      !preSelectedServiceId ||
      initial.step === "datetime"
    ) {
      return
    }
    const p = practitioners.find((x) => x.id === preSelectedPractitionerId)
    const s = services.find((x) => x.id === preSelectedServiceId)
    if (p && s && !practitionerOffersService(p, s.id)) {
      toast.error("That practitioner does not offer this service", {
        description: "Choose a different service or practitioner.",
      })
    }
  }, [
    preSelectedPractitionerId,
    preSelectedServiceId,
    practitioners,
    services,
    initial.step,
  ])

  const availablePractitioners = selectedService
    ? practitioners.filter((p) =>
        (p.practitioner_services ?? []).some(
          (ps) => ps.service_id === selectedService.id
        )
      )
    : practitioners

  const handleHoldExpired = useCallback(() => {
    setHold(null)
    setSelectedSlot(null)
    setStep("datetime")
    toast.message("Hold expired", {
      description: "Please select a new time.",
    })
  }, [])

  async function handleSlotSelect(slot: TimeSlot) {
    if (!selectedPractitioner || !selectedService) return
    setSelectedSlot(slot)
    const res = await fetch("/api/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId: selectedPractitioner.id,
        serviceId: selectedService.id,
        startDatetime: slot.start.toISOString(),
        endDatetime: slot.end.toISOString(),
      }),
    })
    const data = (await res.json()) as {
      error?: string
      holdId?: string
      sessionToken?: string
      expiresAt?: string
    }
    if (res.status === 409) {
      toast.error("That slot was just taken", {
        description: "Please pick another time.",
      })
      return
    }
    if (!res.ok || !data.holdId || !data.sessionToken || !data.expiresAt) {
      toast.error("Could not reserve this time", {
        description: data.error ?? "Try again.",
      })
      return
    }
    setHold({
      holdId: data.holdId,
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
    })
    setStep("details")
  }

  if (step === "success" && appointmentId) {
    window.sessionStorage.removeItem(bookingStateKey)
    return (
      <BookingSuccess appointmentId={appointmentId} clinic={clinic} />
    )
  }

  const stepLabels: Record<string, string> = {
    service: "Service",
    practitioner: "Practitioner",
    datetime: "Date & time",
    details: "Your details",
  }

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        {(["service", "practitioner", "datetime", "details"] as const).map(
          (s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="size-3" />}
              <span
                className={
                  step === s ? "text-primary font-medium" : ""
                }
              >
                {stepLabels[s]}
              </span>
            </span>
          )
        )}
      </div>

      {step === "service" && (
        <Card>
          <CardHeader>
            <CardTitle>Select a service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No bookable services yet.
              </p>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service)
                    if (
                      selectedPractitioner &&
                      practitionerOffersService(selectedPractitioner, service.id)
                    ) {
                      setStep("datetime")
                    } else {
                      setStep("practitioner")
                    }
                  }}
                  className="hover:border-primary hover:bg-primary/5 w-full rounded-lg border p-4 text-left transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      {service.description && (
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {service.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-sm">
                        {formatDuration(service.duration_minutes)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatPrice(service.price_cents)}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {step === "practitioner" && selectedService && (
        <Card>
          <CardHeader>
            <CardTitle>Select a practitioner</CardTitle>
            <p className="text-muted-foreground text-sm">
              for {selectedService.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {availablePractitioners.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No practitioners offer this service yet.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPractitioner(availablePractitioners[0]!)
                    setStep("datetime")
                  }}
                  className="hover:border-primary hover:bg-primary/5 w-full rounded-lg border p-4 text-left transition-colors"
                >
                  <p className="font-medium">No preference</p>
                  <p className="text-muted-foreground text-sm">
                    Book with {availablePractitioners[0]?.name ?? "the first"}
                  </p>
                </button>
                {availablePractitioners.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPractitioner(p)
                      setStep("datetime")
                    }}
                    className="hover:border-primary hover:bg-primary/5 w-full rounded-lg border p-4 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.bio && (
                          <p className="text-muted-foreground line-clamp-2 text-sm">
                            {p.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === "datetime" && selectedService && selectedPractitioner && (
        <Card>
          <CardHeader>
            <CardTitle>Choose date & time</CardTitle>
            <p className="text-muted-foreground text-sm">
              {selectedService.name} with {selectedPractitioner.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                isBefore(startOfDay(date), startOfDay(new Date()))
              }
            />
            {selectedDate && (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">
                  Available times on {format(selectedDate, "EEEE, MMMM d")}
                </p>
                <TimeSlotPicker
                  key={`${selectedPractitioner.id}-${selectedService.id}-${format(selectedDate, "yyyy-MM-dd")}`}
                  practitionerId={selectedPractitioner.id}
                  serviceId={selectedService.id}
                  selectedDate={format(selectedDate, "yyyy-MM-dd")}
                  onSelect={handleSlotSelect}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "details" &&
        hold &&
        selectedSlot &&
        selectedService &&
        selectedPractitioner && (
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm
                holdId={hold.holdId}
                sessionToken={hold.sessionToken}
                expiresAt={hold.expiresAt}
                service={selectedService}
                practitioner={selectedPractitioner}
                startDatetime={selectedSlot.start.toISOString()}
                onSuccess={(id) => {
                  setAppointmentId(id)
                  setStep("success")
                }}
                onHoldExpired={handleHoldExpired}
              />
            </CardContent>
          </Card>
        )}

      {step !== "service" && step !== "success" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (step === "details" && hold) {
              void fetch("/api/hold", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  holdId: hold.holdId,
                  sessionToken: hold.sessionToken,
                }),
              })
              setHold(null)
            }
            const prev: Record<Step, Step> = {
              service: "service",
              practitioner: "service",
              datetime: "practitioner",
              details: "datetime",
              success: "details",
            }
            setStep(prev[step])
          }}
        >
          ← Back
        </Button>
      )}
    </div>
  )
}
