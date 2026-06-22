"use client"

import { format, parseISO } from "date-fns"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/utils"

type Row = {
  id: string
  start_datetime: string
  status: string
  practitioners?: { name: string; color: string } | null
  services?: { name: string } | null
  patients?: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
  } | null
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function ExportCSVButton({ rows }: { rows: Row[] }) {
  function download() {
    const headers = [
      "Date",
      "Time",
      "Patient",
      "Email",
      "Phone",
      "Service",
      "Practitioner",
      "Status",
    ]
    const lines = [
      headers.join(","),
      ...rows.map((a) => {
        const date = format(parseISO(a.start_datetime), "yyyy-MM-dd")
        const time = formatTime(a.start_datetime)
        const patient = `${a.patients?.first_name ?? ""} ${a.patients?.last_name ?? ""}`.trim()
        return [
          escapeCsvCell(date),
          escapeCsvCell(time),
          escapeCsvCell(patient),
          escapeCsvCell(a.patients?.email ?? ""),
          escapeCsvCell(a.patients?.phone ?? ""),
          escapeCsvCell(a.services?.name ?? ""),
          escapeCsvCell(a.practitioners?.name ?? ""),
          escapeCsvCell(a.status),
        ].join(",")
      }),
    ]
    const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={download}
      disabled={rows.length === 0}
    >
      <Download className="mr-2 size-4" />
      Export CSV
    </Button>
  )
}
