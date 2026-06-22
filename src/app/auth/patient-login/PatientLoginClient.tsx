"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { normalizeEmail } from "@/lib/validation"
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

export function PatientLoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const err = searchParams.get("error")
    if (err === "no_account") {
      toast.error("No patient account found", {
        description: "Use the email and password your clinic provided.",
      })
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    })

    if (error) {
      toast.error("Login failed", { description: error.message })
      setLoading(false)
      return
    }

    const uid = data.user?.id
    if (!uid) {
      toast.error("Login failed", { description: "No user returned" })
      setLoading(false)
      return
    }

    const clinicId = searchParams.get("clinicId")
    let accountQuery = supabase
      .from("patient_accounts")
      .select("id")
      .eq("user_id", uid)

    if (clinicId) {
      accountQuery = accountQuery.eq("clinic_id", clinicId)
    }

    const { data: accountRow } = await accountQuery.limit(1).maybeSingle()

    if (!accountRow) {
      await supabase.auth.signOut()
      toast.error("This account is not linked to a patient portal", {
        description: "Contact your clinic if you need portal access.",
      })
      setLoading(false)
      return
    }

    const redirect = searchParams.get("redirect") ?? "/my-account/appointments"
    router.push(redirect)
    setLoading(false)
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>
            Use the email and password your clinic provided to access your
            appointments and records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              <Link href="/" className="underline underline-offset-4">
                Home
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
