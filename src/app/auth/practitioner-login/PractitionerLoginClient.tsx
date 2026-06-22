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

export function PractitionerLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const err = searchParams.get("error")
    if (err === "no_access") {
      toast.error("No practitioner portal for this account", {
        description: "Use the login your clinic gave you, or contact your administrator.",
      })
    }
    if (err === "supabase_env") {
      toast.error("Supabase is not configured")
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
    const { data: portalRow } = await supabase
      .from("practitioner_accounts")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle()
    if (!portalRow) {
      await supabase.auth.signOut()
      toast.error("This account is not linked to a practitioner portal", {
        description: "Use admin login if you manage the clinic, or ask your admin to enable staff portal access.",
      })
      setLoading(false)
      return
    }
    const redirect = searchParams.get("redirect") ?? "/practitioner"
    router.push(redirect)
    setLoading(false)
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Practitioner login</CardTitle>
          <CardDescription>
            Sign in to manage your profile, schedule, and appointments.
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
              <Link
                href="/auth/login"
                className="text-foreground underline underline-offset-4"
              >
                Clinic admin login
              </Link>
              ·{" "}
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
