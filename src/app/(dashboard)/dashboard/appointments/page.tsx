"use client"

import { useCallback, useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { Search } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatTime } from "@/lib/utils"
import { AssignIntakeForm } from "../patients/_components/AssignIntakeForm"
import { CreateAppointmentDialog } from "./_components/CreateAppointmentDialog"
import { ExportCSVButton } from "./_components/ExportCSV"

const PAGE_SIZE = 25

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
}

type AppointmentRow = {
  id: string
  patient_id: string
  clinic_id: string
  start_datetime: string
  status: string
  practitioners?: { name: string; color: string } | null
  services?: { name: string } | null
  patients?: { first_name: string; last_name: string; email: string; phone: string | null } | null
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clinicId, setClinicId] = useState("")
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    void supabase
      .from("clinics")
      .select("id")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setClinicId(data.id)
      })
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from("appointments")
      .select(
        "*, practitioners(name, color), services(name), patients(first_name, last_name, email, phone)"
      )
      .order("start_datetime", { ascending: false })
      .range(from, to)

    if (statusFilter !== "all") query = query.eq("status", statusFilter)

    let countQuery = supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
    if (statusFilter !== "all") countQuery = countQuery.eq("status", statusFilter)

    const [{ data, error }, { count, error: countErr }] = await Promise.all([
      query,
      countQuery,
    ])

    if (error) toast.error("Could not load appointments")
    if (countErr) toast.error("Could not count appointments")
    setAppointments((data as AppointmentRow[]) || [])
    setTotalRows(count ?? 0)
    setLoading(false)
  }, [page, statusFilter, supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  const filtered = appointments.filter((a) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      `${a.patients?.first_name ?? ""} ${a.patients?.last_name ?? ""}`
        .toLowerCase()
        .includes(term) ||
      (a.patients?.email?.toLowerCase().includes(term) ?? false) ||
      (a.services?.name?.toLowerCase().includes(term) ?? false)
    )
  })
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id)
    if (error) {
      toast.error("Could not update status")
      return
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    toast.success("Status updated")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">Appointments</h1>
        <CreateAppointmentDialog clinicId={clinicId} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by patient, service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v ?? "all")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No show</SelectItem>
          </SelectContent>
        </Select>
        <ExportCSVButton rows={filtered} />
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-foreground p-4 text-left font-medium">Date & time</th>
                <th className="text-foreground p-4 text-left font-medium">Patient</th>
                <th className="text-foreground p-4 text-left font-medium">Service</th>
                <th className="text-foreground p-4 text-left font-medium">Practitioner</th>
                <th className="text-foreground p-4 text-left font-medium">Status</th>
                <th className="text-foreground p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-8 text-center">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-8 text-center">
                    No appointments found
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-muted/40">
                    <td className="p-4">
                      <p className="font-medium">
                        {format(parseISO(appt.start_datetime), "MMM d, yyyy")}
                      </p>
                      <p className="text-muted-foreground">{formatTime(appt.start_datetime)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">
                        {appt.patients?.first_name} {appt.patients?.last_name}
                      </p>
                      <p className="text-muted-foreground">{appt.patients?.email}</p>
                    </td>
                    <td className="p-4">{appt.services?.name}</td>
                    <td className="p-4">{appt.practitioners?.name}</td>
                    <td className="p-4">
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[appt.status] ?? "bg-muted"}
                      >
                        {appt.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-2">
                        <Select
                          value={appt.status}
                          onValueChange={(v) => {
                            if (v) void updateStatus(appt.id, v)
                          }}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="booked">Booked</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="no_show">No show</SelectItem>
                          </SelectContent>
                        </Select>
                        {clinicId && appt.patient_id ? (
                          <AssignIntakeForm
                            patientId={appt.patient_id}
                            clinicId={appt.clinic_id ?? clinicId}
                            appointmentId={appt.id}
                            buttonLabel="Intake form"
                            onAssigned={() => void load()}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="border-border bg-muted/20 flex items-center justify-between border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages} ({totalRows} total)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
