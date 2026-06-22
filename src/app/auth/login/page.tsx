"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error")
    if (err === "supabase_env") {
      toast.error("Supabase is not configured", {
        description:
          "Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or your publishable key (e.g. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) in .env.local.",
      })
    }
    if (err === "auth") {
      toast.error("Sign-in failed", {
        description: "Could not complete authentication. Try again.",
      })
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    })
    if (error) {
      toast.error("Login failed", { description: error.message })
    } else if (data.user?.id) {
      const { data: portalRow } = await supabase
        .from("practitioner_accounts")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle()
      router.push(portalRow ? "/practitioner" : "/dashboard")
    } else {
      router.push("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
          <CardDescription>Sign in to manage your clinic</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                href="/auth/practitioner-login"
                className="text-foreground mr-2 underline underline-offset-4"
              >
                Practitioner login
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
