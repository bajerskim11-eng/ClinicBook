"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Note = {
  id: string
  body: string
  created_at: string
}

export function PatientNotesPanel({
  patientId,
  clinicId,
}: {
  patientId: string
  clinicId: string
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/patient-notes?patientId=${patientId}`)
    const data = (await r.json()) as Note[] | { error?: string }
    if (Array.isArray(data)) setNotes(data)
  }, [patientId])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function addNote() {
    if (!newNote.trim()) return
    setAdding(true)
    const res = await fetch("/api/admin/patient-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        clinicId,
        body: newNote.trim(),
      }),
    })
    const saved = (await res.json()) as Note & { error?: string }
    if (!res.ok) {
      toast.error(saved.error ?? "Could not save note")
      setAdding(false)
      return
    }
    setNotes((prev) => [saved, ...prev])
    setNewNote("")
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-sm font-medium">Internal notes</h3>
      <p className="text-muted-foreground text-xs">
        Visible to staff only — not shown to patients.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Add a note…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") void addNote()
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void addNote()}
          disabled={adding || !newNote.trim()}
        >
          Add
        </Button>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {notes.map((n) => (
          <div
            key={n.id}
            className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 rounded-lg border p-3"
          >
            <p className="text-foreground text-sm">{n.body}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
