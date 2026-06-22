"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Patient } from "@/types"
import { AssignIntakeForm } from "./_components/AssignIntakeForm"
import { IntakeFormStatuses } from "./_components/IntakeFormStatuses"
import { PatientNotesPanel } from "./_components/PatientNotesPanel"

const PAGE_SIZE = 25

type HistoryRow = {
  id: string
  start_datetime: string
  status: string
  services?: { name: string } | null
  practitioners?: { name: string } | null
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Patient | null>(null)
  const [patientHistory, setPatientHistory] = useState<HistoryRow[]>([])
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const searchTerm = search.trim()

    let dataQuery = supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)
    let countQuery = supabase
      .from("patients")
      .select("id", { count: "exact", head: true })

    if (searchTerm) {
      const escaped = searchTerm.replace(/[%_,]/g, "\\$&")
      const searchClause = `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`
      dataQuery = dataQuery.or(searchClause)
      countQuery = countQuery.or(searchClause)
    }

    const [{ data, error }, { count, error: countErr }] = await Promise.all([
      dataQuery,
      countQuery,
    ])

    if (error) toast.error("Could not load patients")
    if (countErr) toast.error("Could not count patients")
    const nextPatients = (data as Patient[]) || []
    setPatients(nextPatients)
    setTotalRows(count ?? 0)
    setSelected((prev) => (prev && nextPatients.some((p) => p.id === prev.id) ? prev : null))
    setLoading(false)
  }, [page, search, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function selectPatient(patient: Patient) {
    setSelected(patient)
    const { data, error } = await supabase
      .from("appointments")
      .select("*, services(name), practitioners(name)")
      .eq("patient_id", patient.id)
      .order("start_datetime", { ascending: false })
    if (error) toast.error("Could not load history")
    setPatientHistory((data as HistoryRow[]) || [])
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-semibold">Patients</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 space-y-2 lg:w-72">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search patients…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <div className="max-h-[600px] space-y-1 overflow-y-auto">
            {loading && <p className="text-muted-foreground px-2 py-3 text-sm">Loading patients...</p>}
            {!loading && patients.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-sm">No patients found</p>
            )}
            {patients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void selectPatient(p)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  selected?.id === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-muted-foreground truncate text-xs">{p.email}</p>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-50"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="border-border hover:bg-muted rounded border px-2 py-1 disabled:opacity-50"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {selected ? (
          <div className="border-border bg-card flex-1 space-y-4 rounded-xl border p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">
                {selected.first_name} {selected.last_name}
              </h2>
              <p className="text-muted-foreground text-sm">{selected.email}</p>
              {selected.phone && (
                <p className="text-muted-foreground text-sm">{selected.phone}</p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                Patient since {format(new Date(selected.created_at), "MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AssignIntakeForm
                patientId={selected.id}
                clinicId={selected.clinic_id}
              />
            </div>
            <IntakeFormStatuses patientId={selected.id} />
            <PatientNotesPanel
              patientId={selected.id}
              clinicId={selected.clinic_id}
            />
            <div>
              <h3 className="text-foreground mb-2 text-sm font-medium">Appointment history</h3>
              <div className="space-y-2">
                {patientHistory.length === 0 && (
                  <p className="text-muted-foreground text-sm">No appointments yet</p>
                )}
                {patientHistory.map((a) => (
                  <div
                    key={a.id}
                    className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.services?.name}</p>
                      <p className="text-muted-foreground">
                        {a.practitioners?.name} ·{" "}
                        {format(new Date(a.start_datetime), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        a.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : a.status === "cancelled"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                      }`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-border bg-card text-muted-foreground flex min-h-[240px] flex-1 items-center justify-center rounded-xl border shadow-sm">
            Select a patient to view details
          </div>
        )}
      </div>
    </div>
  )
}
