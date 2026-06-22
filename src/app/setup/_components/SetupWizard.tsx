"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnvChecklist } from "./EnvChecklist"
import { AuthUrlInstructions } from "./AuthUrlInstructions"

type CheckStatus = "ok" | "warning" | "error" | "missing"

type Check = {
  id: string
  label: string
  status: CheckStatus
  message: string
}

type HealthResponse = {
  checks: Check[]
}

const STATUS_BADGE: Record<CheckStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "default" },
  warning: { label: "Recommended", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
  missing: { label: "Missing", variant: "outline" },
}

export function SetupWizard() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runHealthCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/setup/health", { cache: "no-store" })
      const json = (await res.json()) as HealthResponse
      setData(json)
    } catch {
      setError("Could not reach the health-check endpoint.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runHealthCheck()
  }, [])

  const allOk = data?.checks.every((c) => c.status === "ok" || c.status === "warning")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Connection health check</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={runHealthCheck} disabled={loading}>
            {loading ? "Checking…" : "Re-check"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!data && loading && (
            <p className="text-sm text-muted-foreground">Running checks…</p>
          )}
          {data?.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.message}</p>
              </div>
              <Badge variant={STATUS_BADGE[check.status].variant}>
                {STATUS_BADGE[check.status].label}
              </Badge>
            </div>
          ))}
          {allOk && (
            <p className="text-sm font-medium text-primary">
              Everything required is configured. You&apos;re ready to log in and finish setup.
            </p>
          )}
        </CardContent>
      </Card>

      <EnvChecklist />
      <AuthUrlInstructions />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/auth/login"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Continue to admin login
        </Link>
        <Link
          href="/book/demo-clinic"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          View demo booking page
        </Link>
      </div>
    </div>
  )
}
