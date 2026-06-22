"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase/client"
import type { Practitioner } from "@/types"
import { HolidayManager } from "./_components/HolidayManager"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

type DaySchedule = {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, i) => ({
  day_of_week: i,
  start_time: "09:00",
  end_time: "17:00",
  is_active: i >= 1 && i <= 5,
}))

function toTimeInput(t: string): string {
  return String(t).slice(0, 5)
}

export default function SchedulePage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>("")
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [loading, setLoading] = useState(false)
  const [clinicId, setClinicId] = useState<string>("")
  const supabase = createClient()

  const selectedPractitioner = practitioners.find((p) => p.id === selectedPractitionerId)

  useEffect(() => {
    void supabase
      .from("practitioners")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load practitioners")
        const list = (data as Practitioner[]) || []
        setPractitioners(list)
        if (list[0]) setSelectedPractitionerId(list[0].id)
      })
  }, [supabase])

  useEffect(() => {
    if (!selectedPractitionerId) return
    void supabase
      .from("schedules")
      .select("*")
      .eq("practitioner_id", selectedPractitionerId)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Could not load schedule")
          return
        }
        if (!data || data.length === 0) {
          setSchedule(DEFAULT_SCHEDULE)
          return
        }
        const merged = DEFAULT_SCHEDULE.map((d) => {
          const existing = data.find((s) => s.day_of_week === d.day_of_week)
          return existing
            ? {
                day_of_week: existing.day_of_week,
                start_time: toTimeInput(existing.start_time as string),
                end_time: toTimeInput(existing.end_time as string),
                is_active: existing.is_active,
              }
            : d
        })
        setSchedule(merged)
      })
  }, [selectedPractitionerId, supabase])

  function updateDay(dayOfWeek: number, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    )
  }

  async function saveSchedule() {
    if (!selectedPractitionerId) return
    setLoading(true)
    const rows = schedule.map((d) => ({
      practitioner_id: selectedPractitionerId,
      day_of_week: d.day_of_week,
      start_time: d.start_time.length === 5 ? `${d.start_time}:00` : d.start_time,
      end_time: d.end_time.length === 5 ? `${d.end_time}:00` : d.end_time,
      is_active: d.is_active,
    }))

    const { error } = await supabase.from("schedules").upsert(rows, {
      onConflict: "practitioner_id,day_of_week",
    })

    if (error) {
      toast.error("Could not save schedule")
    } else {
      toast.success("Schedule saved")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Schedule</h1>
          <p className="text-muted-foreground">Set working hours per practitioner</p>
        </div>
        <Button onClick={() => void saveSchedule()} disabled={loading || !selectedPractitionerId}>
          {loading ? "Saving…" : "Save schedule"}
        </Button>
      </div>

      <div className="max-w-xs">
        <Label className="mb-1 block">Practitioner</Label>
        <Select
          value={selectedPractitionerId}
          onValueChange={(v) => {
            const id = v ?? ""
            setSelectedPractitionerId(id)
            const p = practitioners.find((x) => x.id === id)
            if (p) setClinicId(p.clinic_id)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select practitioner" />
          </SelectTrigger>
          <SelectContent>
            {practitioners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border bg-muted/50 grid grid-cols-[minmax(0,140px)_1fr_1fr_80px] gap-2 border-b p-3 text-xs font-medium">
          <div>Day</div>
          <div>Start</div>
          <div>End</div>
          <div>Active</div>
        </div>
        {schedule.map((day) => (
          <div
            key={day.day_of_week}
            className={`border-border grid grid-cols-[minmax(0,140px)_1fr_1fr_80px] items-center gap-2 border-b p-3 last:border-0 ${
              !day.is_active ? "opacity-50" : ""
            }`}
          >
            <div className="text-foreground text-sm font-medium">{DAYS[day.day_of_week]}</div>
            <div className="pr-2">
              <Input
                type="time"
                value={day.start_time}
                disabled={!day.is_active}
                onChange={(e) => updateDay(day.day_of_week, "start_time", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="pr-2">
              <Input
                type="time"
                value={day.end_time}
                disabled={!day.is_active}
                onChange={(e) => updateDay(day.day_of_week, "end_time", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Switch
                checked={day.is_active}
                onCheckedChange={(v) => updateDay(day.day_of_week, "is_active", v)}
              />
            </div>
          </div>
        ))}
      </div>

      <HolidayManager clinicId={selectedPractitioner?.clinic_id ?? clinicId} />

      <TimeBlocksSection practitionerId={selectedPractitionerId} />
    </div>
  )
}

function TimeBlocksSection({ practitionerId }: { practitionerId: string }) {
  const [blocks, setBlocks] = useState<
    { id: string; start_datetime: string; end_datetime: string; reason: string | null }[]
  >([])
  const [adding, setAdding] = useState(false)
  const [newBlock, setNewBlock] = useState({ start: "", end: "", reason: "" })
  const supabase = createClient()

  useEffect(() => {
    if (!practitionerId) return
    void supabase
      .from("time_blocks")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .gte("end_datetime", new Date().toISOString())
      .order("start_datetime")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load time blocks")
        setBlocks(data || [])
      })
  }, [practitionerId, supabase])

  async function addBlock() {
    if (!practitionerId) return
    const start = new Date(newBlock.start)
    const end = new Date(newBlock.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error("Enter valid start and end times")
      return
    }
    const { data, error } = await supabase
      .from("time_blocks")
      .insert({
        practitioner_id: practitionerId,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        reason: newBlock.reason.trim() || null,
      })
      .select()
      .single()
    if (error || !data) {
      toast.error("Could not add time block")
      return
    }
    setBlocks((prev) => [...prev, data])
    setAdding(false)
    setNewBlock({ start: "", end: "", reason: "" })
    toast.success("Time block added")
  }

  async function removeBlock(id: string) {
    const { error } = await supabase.from("time_blocks").delete().eq("id", id)
    if (error) {
      toast.error("Could not remove block")
      return
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    toast.success("Removed")
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground font-medium">Time blocks</h2>
          <p className="text-muted-foreground text-sm">
            Block specific times (lunch, vacation, meetings)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={!practitionerId}>
          Add block
        </Button>
      </div>

      <div className="space-y-2">
        {blocks.length === 0 && (
          <p className="text-muted-foreground text-sm">No upcoming time blocks</p>
        )}
        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/40"
          >
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-orange-950 dark:text-orange-100">
                {new Date(block.start_datetime).toLocaleString()} →{" "}
                {new Date(block.end_datetime).toLocaleString()}
              </p>
              {block.reason && (
                <p className="text-orange-900 dark:text-orange-200">{block.reason}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void removeBlock(block.id)}>
              Remove
            </Button>
          </div>
        ))}

        {adding && (
          <div className="border-border bg-card space-y-3 rounded-lg border p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Start</Label>
                <Input
                  type="datetime-local"
                  value={newBlock.start}
                  onChange={(e) => setNewBlock((p) => ({ ...p, start: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">End</Label>
                <Input
                  type="datetime-local"
                  value={newBlock.end}
                  onChange={(e) => setNewBlock((p) => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
            <Input
              placeholder="Reason (e.g. lunch, vacation)"
              value={newBlock.reason}
              onChange={(e) => setNewBlock((p) => ({ ...p, reason: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void addBlock()}>
                Add block
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
