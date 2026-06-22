"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Clinic } from "@/types"

type Step = "password" | "clinic" | "demo-data" | "done"

export default function FirstLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>("password")
  const [loading, setLoading] = useState(false)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [confirmWipe, setConfirmWipe] = useState("")

  useEffect(() => {
    if (step !== "clinic" && step !== "demo-data") return
    supabase
      .from("clinics")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setClinic(data as Clinic | null))
  }, [step, supabase])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      toast.error("Could not update password", { description: updateError.message })
      setLoading(false)
      return
    }
    const res = await fetch("/api/auth/complete-first-login", { method: "POST" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error("Could not finish setup", { description: body.error })
      setLoading(false)
      return
    }
    setLoading(false)
    setStep("clinic")
  }

  async function handleClinicSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clinic) return
    setLoading(true)
    const { error } = await supabase
      .from("clinics")
      .update({
        name: clinic.name.trim(),
        address: clinic.address?.trim() || "",
        phone: clinic.phone?.trim() || "",
        primary_color: clinic.primary_color || "#0d9488",
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", clinic.id)
    setLoading(false)
    if (error) {
      toast.error("Could not save clinic details", { description: error.message })
      return
    }
    setStep(clinic.is_demo_data ? "demo-data" : "done")
  }

  async function handleKeepDemoData() {
    router.push("/dashboard")
  }

  async function handleWipeDemoData() {
    if (confirmWipe !== "DELETE") {
      toast.error('Type "DELETE" to confirm')
      return
    }
    setLoading(true)
    const res = await fetch("/api/admin/wipe-demo-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    })
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error("Could not wipe demo data", { description: body.error })
      return
    }
    toast.success("Demo data removed")
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finish setting up your clinic</CardTitle>
          <CardDescription>
            {step === "password" && "First, set a password only you know."}
            {step === "clinic" && "Confirm your clinic's basic details."}
            {step === "demo-data" && "This account started with sample demo data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Continue"}
              </Button>
            </form>
          )}

          {step === "clinic" && clinic && (
            <form onSubmit={handleClinicSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Clinic name</Label>
                <Input
                  value={clinic.name}
                  onChange={(e) => setClinic((c) => (c ? { ...c, name: e.target.value } : c))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input
                  value={clinic.address ?? ""}
                  onChange={(e) => setClinic((c) => (c ? { ...c, address: e.target.value } : c))}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={clinic.phone ?? ""}
                  onChange={(e) => setClinic((c) => (c ? { ...c, phone: e.target.value } : c))}
                />
              </div>
              <div className="space-y-1">
                <Label>Brand color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={clinic.primary_color || "#0d9488"}
                    onChange={(e) =>
                      setClinic((c) => (c ? { ...c, primary_color: e.target.value } : c))
                    }
                    className="h-8 w-12 rounded border border-border"
                  />
                  <Input
                    value={clinic.primary_color || "#0d9488"}
                    onChange={(e) =>
                      setClinic((c) => (c ? { ...c, primary_color: e.target.value } : c))
                    }
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving…" : "Continue"}
              </Button>
            </form>
          )}

          {step === "demo-data" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can keep the sample clinic data for evaluation, or wipe it now and start
                with a clean clinic. This cannot be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleKeepDemoData()}
                disabled={loading}
              >
                Keep demo data for now
              </Button>
              <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
                <Label htmlFor="confirmWipe">
                  Type DELETE to wipe all demo practitioners, services, and appointments
                </Label>
                <Input
                  id="confirmWipe"
                  value={confirmWipe}
                  onChange={(e) => setConfirmWipe(e.target.value)}
                  placeholder="DELETE"
                />
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => void handleWipeDemoData()}
                  disabled={loading || confirmWipe !== "DELETE"}
                >
                  {loading ? "Wiping…" : "Wipe demo data and start fresh"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
