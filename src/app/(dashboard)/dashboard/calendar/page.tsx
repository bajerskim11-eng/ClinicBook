"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AssignIntakeForm } from "../patients/_components/AssignIntakeForm"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/utils"
import type { Practitioner } from "@/types"

type ApptRow = {
  id: string
  patient_id: string
  clinic_id: string
  start_datetime: string
  end_datetime: string
  status: string
  notes: string | null
  practitioners?: { name: string; color: string } | null
  services?: { name: string; duration_minutes: number } | null
  patients?: { first_name: string; last_name: string } | null
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventInput[]>([])
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [filterPractitioner, setFilterPractitioner] = useState("all")
  const [selected, setSelected] = useState<ApptRow | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const rangeRef = useRef({ start: "", end: "" })
  const supabase = createClient()

  const loadRange = useCallback(
    async (startStr: string, endStr: string) => {
      let query = supabase
        .from("appointments")
        .select(
          "id, patient_id, clinic_id, start_datetime, end_datetime, status, notes, practitioners(name, color), services(name, duration_minutes), patients(first_name, last_name)"
        )
        .gte("start_datetime", startStr)
        .lte("start_datetime", endStr)
        .neq("status", "cancelled")
        .order("start_datetime")

      if (filterPractitioner !== "all") {
        query = query.eq("practitioner_id", filterPractitioner)
      }

      const { data, error } = await query
      if (error) {
        toast.error("Could not load calendar")
        return
      }

      const rows = (data as unknown as ApptRow[]) || []
      setEvents(
        rows.map((a) => ({
          id: a.id,
          title: [
            [a.patients?.first_name, a.patients?.last_name].filter(Boolean).join(" "),
            a.services?.name,
          ]
            .filter(Boolean)
            .join(" — "),
          start: a.start_datetime,
          end: a.end_datetime,
          backgroundColor: a.practitioners?.color ?? "#3b82f6",
          borderColor: a.practitioners?.color ?? "#3b82f6",
          extendedProps: { appt: a },
        }))
      )
    },
    [filterPractitioner, supabase]
  )

  const onDatesSet = useCallback(
    (arg: DatesSetArg) => {
      rangeRef.current = { start: arg.startStr, end: arg.endStr }
      void loadRange(arg.startStr, arg.endStr)
    },
    [loadRange]
  )

  useEffect(() => {
    queueMicrotask(() => {
      void supabase
        .from("practitioners")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .then(({ data, error }) => {
          if (error) toast.error("Could not load practitioners")
          setPractitioners((data as Practitioner[]) || [])
        })
    })
  }, [supabase])

  useEffect(() => {
    const { start, end } = rangeRef.current
    if (!start || !end) return
    queueMicrotask(() => {
      void loadRange(start, end)
    })
  }, [filterPractitioner, loadRange])

  function onEventClick(arg: EventClickArg) {
    const appt = arg.event.extendedProps.appt as ApptRow | undefined
    if (appt) setSelected(appt)
  }

  async function cancelSelected() {
    if (!selected) return
    setCancelling(true)
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", selected.id)
    setCancelling(false)
    if (error) {
      toast.error("Could not cancel appointment")
      return
    }
    toast.success("Appointment cancelled")
    setSelected(null)
    const { start, end } = rangeRef.current
    if (start && end) void loadRange(start, end)
  }

  const plugins = useMemo(
    () => [dayGridPlugin, timeGridPlugin, interactionPlugin],
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Month view shows +more when busy; week/day stack or limit overlapping
            events. Click an event for details, intake form, or cancel.
          </p>
        </div>
        <Select
          value={filterPractitioner}
          onValueChange={(v) => setFilterPractitioner(v ?? "all")}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All practitioners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All practitioners</SelectItem>
            {practitioners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border p-4 shadow-sm">
        <div className="clinicbook-fc">
          <FullCalendar
            plugins={plugins}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            events={events}
            datesSet={onDatesSet}
            eventClick={onEventClick}
            nowIndicator
          />
        </div>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">
                  {selected.patients?.first_name} {selected.patients?.last_name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Service</p>
                <p className="font-medium">{selected.services?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Practitioner</p>
                <p className="font-medium">{selected.practitioners?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium">{formatDateTime(selected.start_datetime)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{selected.status.replace("_", " ")}</p>
              </div>
              {selected.notes ? (
                <div>
                  <p className="text-muted-foreground">Notes</p>
                  <p>{selected.notes}</p>
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {selected ? (
              <AssignIntakeForm
                patientId={selected.patient_id}
                clinicId={selected.clinic_id}
                appointmentId={selected.id}
                buttonLabel="Assign intake form"
                onAssigned={() => {
                  const { start, end } = rangeRef.current
                  if (start && end) void loadRange(start, end)
                }}
              />
            ) : null}
            {selected &&
              selected.status !== "cancelled" &&
              selected.status !== "completed" && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={cancelling}
                  onClick={() => void cancelSelected()}
                >
                  {cancelling ? "Cancelling…" : "Cancel appointment"}
                </Button>
              )}
            <Button type="button" variant="outline" className="w-full" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
