"use client"

import { format } from "date-fns"
import { formatPrice } from "@/lib/utils"

export function ReceiptCard({
  appointmentId,
  serviceName,
  practitionerName,
  startDatetime,
  clinicName,
  priceCents,
}: {
  appointmentId: string
  serviceName: string
  practitionerName: string
  startDatetime: string
  clinicName: string
  priceCents: number
}) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-foreground font-medium">{serviceName}</p>
          <p className="text-muted-foreground text-sm">
            {practitionerName} ·{" "}
            {format(new Date(startDatetime), "MMMM d, yyyy")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{clinicName}</p>
        </div>
        <div className="text-right">
          <p className="text-foreground font-semibold">
            {formatPrice(priceCents)}
          </p>
          <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
            Paid
          </span>
        </div>
      </div>
      <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
        <span>Receipt #{appointmentId.slice(0, 8).toUpperCase()}</span>
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => window.print()}
        >
          Print / Download
        </button>
      </div>
    </div>
  )
}
