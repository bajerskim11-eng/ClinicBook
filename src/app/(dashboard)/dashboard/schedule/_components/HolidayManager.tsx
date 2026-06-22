"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type HolidayRow = {
  id: string
  clinic_id: string
  date: string
  name: string | null
}

export function HolidayManager({ clinicId }: { clinicId: string }) {
  const [holidays, setHolidays] = useState<HolidayRow[]>([])
  const [newDate, setNewDate] = useState("")
  const [newName, setNewName] = useState("")
  const supabase = createClient()

  const load = useCallback(async () => {
    if (!clinicId) return
    const { data, error } = await supabase
      .from("clinic_holidays")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("date", format(new Date(), "yyyy-MM-dd"))
      .order("date")
    if (error) {
      toast.error("Could not load holidays")
      return
    }
    setHolidays((data as HolidayRow[]) || [])
  }, [clinicId, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const year = new Date().getFullYear()
  const COMMON_HOLIDAYS = [
    { name: "New Year's Day", date: `${year}-01-01` },
    { name: "Family Day (ON)", date: `${year}-02-17` },
    { name: "Good Friday", date: `${year}-04-18` },
    { name: "Victoria Day", date: `${year}-05-19` },
    { name: "Canada Day", date: `${year}-07-01` },
    { name: "Civic Holiday", date: `${year}-08-04` },
    { name: "Labour Day", date: `${year}-09-01` },
    { name: "Thanksgiving", date: `${year}-10-13` },
    { name: "Christmas Day", date: `${year}-12-25` },
    { name: "Boxing Day", date: `${year}-12-26` },
  ]

  async function addHoliday(date?: string, name?: string) {
    const d = date || newDate
    const n = name ?? newName
    if (!d || !clinicId) return
    const { data, error } = await supabase
      .from("clinic_holidays")
      .upsert(
        { clinic_id: clinicId, date: d, name: n?.trim() || null },
        { onConflict: "clinic_id,date" }
      )
      .select()
      .single()
    if (error || !data) {
      toast.error("Could not add holiday")
      return
    }
    setHolidays((prev) =>
      [...prev.filter((h) => h.date !== d), data as HolidayRow].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    )
    setNewDate("")
    setNewName("")
    toast.success("Holiday added")
  }

  async function removeHoliday(id: string) {
    const { error } = await supabase.from("clinic_holidays").delete().eq("id", id)
    if (error) {
      toast.error("Could not remove holiday")
      return
    }
    setHolidays((prev) => prev.filter((h) => h.id !== id))
    toast.success("Holiday removed")
  }

  if (!clinicId) return null

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-sm">
      <div>
        <h2 className="text-foreground font-medium">Clinic-wide holidays</h2>
        <p className="text-muted-foreground text-sm">
          These days block all practitioners from online booking for this clinic.
        </p>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_HOLIDAYS.map((h) => {
            const already = holidays.some((hol) => hol.date === h.date)
            return (
              <button
                key={h.name}
                type="button"
                onClick={() => {
                  if (!already) void addHoliday(h.date, h.name)
                }}
                disabled={already}
                className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                  already
                    ? "text-muted-foreground cursor-not-allowed border-border bg-muted"
                    : "border-border hover:bg-primary/5 hover:border-primary/30"
                }`}
              >
                {h.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label>Custom date</Label>
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label>Label (optional)</Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Staff training"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => void addHoliday()}>
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {holidays.length === 0 && (
          <li className="text-muted-foreground text-sm">No upcoming holidays</li>
        )}
        {holidays.map((h) => (
          <li
            key={h.id}
            className="bg-muted/40 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium">{h.date}</span>
              {h.name ? (
                <span className="text-muted-foreground"> — {h.name}</span>
              ) : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void removeHoliday(h.id)}
              aria-label="Remove holiday"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
