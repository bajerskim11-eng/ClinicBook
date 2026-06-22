"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TimeSlot } from "@/types"

type SlotJson = { start: string; end: string; available: boolean }

export function TimeSlotPicker({
  practitionerId,
  serviceId,
  selectedDate,
  onSelect,
}: {
  practitionerId: string
  serviceId: string
  selectedDate: string
  onSelect: (slot: TimeSlot) => void
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(
      `/api/availability?practitionerId=${practitionerId}&serviceId=${serviceId}&date=${selectedDate}`
    )
      .then((r) => r.json())
      .then((data: { slots?: SlotJson[] }) => {
        if (cancelled) return
        const list = (data.slots ?? []).map((s) => ({
          start: parseISO(s.start),
          end: parseISO(s.end),
          available: s.available,
        }))
        setSlots(list)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [practitionerId, serviceId, selectedDate])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-muted h-10 animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  const available = slots.filter((s) => s.available)

  if (available.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No available times on this date.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {available.map((slot) => {
        const key = slot.start.toISOString()
        const time = format(slot.start, "h:mm a")
        return (
          <Button
            key={key}
            type="button"
            variant={selected === key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelected(key)
              onSelect(slot)
            }}
            className={cn(
              "text-sm",
              selected === key && "ring-primary ring-2 ring-offset-1"
            )}
          >
            {time}
          </Button>
        )
      })}
    </div>
  )
}
