"use client"

import { useMemo, useState } from "react"
import {
  eachMonthOfInterval,
  format,
  parseISO,
  subMonths,
} from "date-fns"
import { cn } from "@/lib/utils"

type ServiceEmbed = { name: string; price_cents: number }

type ReportAppointment = {
  id: string
  status: string
  start_datetime: string
  created_at: string
  service_id: string
  practitioner_id: string
  patient_id: string
  services: ServiceEmbed | ServiceEmbed[] | null
  practitioners: { name: string } | { name: string }[] | null
}

function servicePrice(a: ReportAppointment): number {
  const s = a.services
  if (!s) return 0
  const row = Array.isArray(s) ? s[0] : s
  return row?.price_cents ?? 0
}

export function ReportsDashboard({
  appointments,
  practitioners,
  services,
  newPatients,
}: {
  appointments: ReportAppointment[]
  practitioners: { id: string; name: string }[]
  services: { id: string; name: string; price_cents: number }[]
  newPatients: { id: string; created_at: string }[]
}) {
  const [activeTab, setActiveTab] = useState<
    "revenue" | "cancellations" | "noshow" | "patients"
  >("revenue")

  const revenueByServiceMonth = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    })
    return services
      .map((svc) => {
        const monthly = months.map((m) => {
          const total = appointments
            .filter(
              (a) =>
                a.service_id === svc.id &&
                a.status === "completed" &&
                format(parseISO(a.start_datetime), "yyyy-MM") ===
                  format(m, "yyyy-MM")
            )
            .reduce((sum, a) => sum + servicePrice(a), 0)
          return { month: format(m, "MMM"), total: total / 100 }
        })
        return {
          service: svc.name,
          monthly,
          totalRevenue: monthly.reduce((s, mo) => s + mo.total, 0),
        }
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [appointments, services])

  const cancellationByPractitioner = useMemo(() => {
    return practitioners
      .map((p) => {
        const total = appointments.filter(
          (a) => a.practitioner_id === p.id
        ).length
        const cancelled = appointments.filter(
          (a) => a.practitioner_id === p.id && a.status === "cancelled"
        ).length
        return {
          name: p.name,
          total,
          cancelled,
          rate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
        }
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.rate - a.rate)
  }, [appointments, practitioners])

  const noshowByPractitioner = useMemo(() => {
    return practitioners
      .map((p) => {
        const total = appointments.filter(
          (a) =>
            a.practitioner_id === p.id &&
            ["completed", "no_show", "cancelled"].includes(a.status)
        ).length
        const noshow = appointments.filter(
          (a) => a.practitioner_id === p.id && a.status === "no_show"
        ).length
        return {
          name: p.name,
          total,
          noshow,
          rate: total > 0 ? Math.round((noshow / total) * 100) : 0,
        }
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.rate - a.rate)
  }, [appointments, practitioners])

  const patientRatioByMonth = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    })
    return months.map((m) => {
      const monthStr = format(m, "yyyy-MM")
      const newThisMonth = newPatients.filter(
        (p) => format(parseISO(p.created_at), "yyyy-MM") === monthStr
      ).length
      const apptThisMonth = appointments.filter(
        (a) =>
          format(parseISO(a.start_datetime), "yyyy-MM") === monthStr &&
          a.status !== "cancelled"
      ).length
      const uniquePatients = new Set(
        appointments
          .filter(
            (a) =>
              format(parseISO(a.start_datetime), "yyyy-MM") === monthStr &&
              a.status !== "cancelled"
          )
          .map((a) => a.patient_id)
      ).size

      return {
        month: format(m, "MMM"),
        newPatients: newThisMonth,
        returningPatients: Math.max(0, uniquePatients - newThisMonth),
        totalAppointments: apptThisMonth,
      }
    })
  }, [appointments, newPatients])

  const TABS = [
    { key: "revenue" as const, label: "Revenue by service" },
    { key: "cancellations" as const, label: "Cancellation rate" },
    { key: "noshow" as const, label: "No-shows" },
    { key: "patients" as const, label: "New vs returning" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm transition-colors",
              activeTab === t.key
                ? "bg-primary text-primary-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:bg-muted border"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "revenue" && (
        <div className="border-border bg-card space-y-5 rounded-xl border p-5 shadow-sm">
          <h2 className="text-foreground font-medium">
            Revenue per service — last 6 months
          </h2>
          {revenueByServiceMonth.map((svc) => (
            <div key={svc.service} className="space-y-2">
              <div className="text-muted-foreground flex justify-between text-sm">
                <span className="text-foreground font-medium">{svc.service}</span>
                <span>Total: ${svc.totalRevenue.toFixed(0)}</span>
              </div>
              <div className="flex h-8 items-end gap-1">
                {svc.monthly.map((mo) => {
                  const max = Math.max(...svc.monthly.map((x) => x.total), 1)
                  return (
                    <div
                      key={mo.month}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="bg-primary w-full rounded-t"
                        style={{
                          height: `${(mo.total / max) * 100}%`,
                          minHeight: mo.total > 0 ? "4px" : "0",
                        }}
                        title={`$${mo.total.toFixed(0)}`}
                      />
                      <span className="text-muted-foreground text-xs">
                        {mo.month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {revenueByServiceMonth.every((s) => s.totalRevenue === 0) && (
            <p className="text-muted-foreground text-sm">
              No completed appointments with pricing yet. Mark appointments as
              &quot;completed&quot; to see revenue.
            </p>
          )}
        </div>
      )}

      {activeTab === "cancellations" && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b p-5">
            <h2 className="text-foreground font-medium">
              Cancellation rate per practitioner
            </h2>
            <p className="text-muted-foreground text-sm">Last 6 months</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-border border-b">
                <th className="text-foreground p-4 text-left font-medium">
                  Practitioner
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  Total appts
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  Cancelled
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {cancellationByPractitioner.map((p) => (
                <tr key={p.name} className="hover:bg-muted/40">
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="text-muted-foreground p-4 text-right">
                    {p.total}
                  </td>
                  <td className="text-muted-foreground p-4 text-right">
                    {p.cancelled}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-medium",
                          p.rate > 20
                            ? "text-destructive"
                            : p.rate > 10
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                        )}
                      >
                        {p.rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "noshow" && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border border-b p-5">
            <h2 className="text-foreground font-medium">No-show tracking</h2>
            <p className="text-muted-foreground text-sm">
              Mark appointments as &quot;no_show&quot; in the appointments list
              to track this
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-border border-b">
                <th className="text-foreground p-4 text-left font-medium">
                  Practitioner
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  Completed + no-shows
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  No-shows
                </th>
                <th className="text-muted-foreground p-4 text-right font-medium">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {noshowByPractitioner.map((p) => (
                <tr key={p.name} className="hover:bg-muted/40">
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="text-muted-foreground p-4 text-right">
                    {p.total}
                  </td>
                  <td className="text-muted-foreground p-4 text-right">
                    {p.noshow}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={cn(
                        "font-medium",
                        p.rate > 15
                          ? "text-destructive"
                          : p.rate > 8
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {p.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "patients" && (
        <div className="border-border bg-card space-y-4 rounded-xl border p-5 shadow-sm">
          <h2 className="text-foreground font-medium">
            New vs returning patients — last 6 months
          </h2>
          <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary inline-block size-3 rounded-sm" /> New
              patients
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-sm bg-teal-500" />{" "}
              Returning patients
            </span>
          </div>
          <div className="flex h-40 items-end gap-3">
            {patientRatioByMonth.map((m) => {
              const maxVal = Math.max(
                ...patientRatioByMonth.map(
                  (x) => x.newPatients + x.returningPatients
                ),
                1
              )
              const totalH =
                ((m.newPatients + m.returningPatients) / maxVal) * 100
              const newPct =
                m.newPatients + m.returningPatients > 0
                  ? (m.newPatients /
                      (m.newPatients + m.returningPatients)) *
                    100
                  : 0
              return (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="flex w-full flex-col-reverse"
                    style={{
                      height: `${totalH}%`,
                      minHeight: "4px",
                    }}
                  >
                    <div
                      className="bg-primary w-full rounded-t-none"
                      style={{ height: `${newPct}%` }}
                    />
                    <div
                      className="w-full rounded-t bg-teal-500"
                      style={{ height: `${100 - newPct}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {m.month}
                  </span>
                  <span className="text-foreground text-xs font-medium">
                    {m.newPatients + m.returningPatients}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="border-border grid grid-cols-3 gap-3 border-t pt-2">
            <div className="text-center">
              <p className="text-primary text-xl font-semibold">
                {patientRatioByMonth.reduce((s, m) => s + m.newPatients, 0)}
              </p>
              <p className="text-muted-foreground text-xs">
                New patients (6 mo)
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-teal-600 dark:text-teal-400">
                {patientRatioByMonth.reduce(
                  (s, m) => s + m.returningPatients,
                  0
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                Returning (6 mo)
              </p>
            </div>
            <div className="text-center">
              <p className="text-foreground text-xl font-semibold">
                {patientRatioByMonth.reduce(
                  (s, m) => s + m.totalAppointments,
                  0
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                Total appointments
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
