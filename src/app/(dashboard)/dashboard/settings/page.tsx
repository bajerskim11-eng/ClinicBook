"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { normalizeEmail } from "@/lib/validation"
import type { Clinic } from "@/types"

function EmbedCard({ clinicSlug }: { clinicSlug: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const iframeSnippet = `<iframe src="${appUrl}/book/${clinicSlug}?embed=1" style="width:100%;max-width:480px;height:720px;border:0;" title="Book an appointment"></iframe>`
  const scriptSnippet = `<script src="${appUrl}/embed.js" data-clinic-slug="${clinicSlug}" data-label="Book Now" async></script>`

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-sm">
      <div>
        <h2 className="text-foreground text-lg font-semibold">Embed on your website</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Add booking directly to your own site. Submissions from an embedded page work the
          same as the standalone booking page — no extra configuration needed.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Button that opens a booking modal (recommended)</Label>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{scriptSnippet}</pre>
        <Button type="button" size="sm" variant="outline" onClick={() => copy("script", scriptSnippet)}>
          {copied === "script" ? "Copied" : "Copy snippet"}
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Inline iframe</Label>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{iframeSnippet}</pre>
        <Button type="button" size="sm" variant="outline" onClick={() => copy("iframe", iframeSnippet)}>
          {copied === "iframe" ? "Copied" : "Copy snippet"}
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const loadClinic = useCallback(async () => {
    const { data, error } = await supabase.from("clinics").select("*").limit(1).maybeSingle()
    if (error) toast.error("Could not load clinic")
    setClinic(data as Clinic | null)
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void loadClinic()
    })
  }, [loadClinic])

  async function save() {
    if (!clinic) return
    setSaving(true)
    const emailRaw = clinic.email?.trim() || ""
    const { error } = await supabase
      .from("clinics")
      .update({
        name: clinic.name.trim(),
        address: clinic.address?.trim() || "",
        phone: clinic.phone?.trim() || "",
        email: emailRaw ? normalizeEmail(emailRaw) : "",
        timezone: clinic.timezone?.trim() || "America/Toronto",
        logo_url: clinic.logo_url?.trim() || null,
        primary_color: clinic.primary_color || "#0d9488",
        font_family: clinic.font_family?.trim() || null,
      })
      .eq("id", clinic.id)
    setSaving(false)
    if (error) {
      toast.error("Could not save settings")
      return
    }
    toast.success("Clinic settings saved")
  }

  if (!clinic) {
    return (
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">Loading clinic…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Basic clinic information shown on booking and in the dashboard.
        </p>
      </div>

      <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-sm">
        <div className="space-y-1">
          <Label>Clinic name</Label>
          <Input
            value={clinic.name}
            onChange={(e) => setClinic((c) => (c ? { ...c, name: e.target.value } : c))}
          />
        </div>
        <div className="space-y-1">
          <Label>Public slug (read-only)</Label>
          <Input value={clinic.slug} readOnly className="bg-muted/50" />
          <p className="text-muted-foreground text-xs break-all">
            Booking page:{" "}
            <span className="text-foreground font-medium">
              {(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/book/{clinic.slug}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <Label>Address</Label>
          <Input
            value={clinic.address}
            onChange={(e) => setClinic((c) => (c ? { ...c, address: e.target.value } : c))}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input
              value={clinic.phone}
              onChange={(e) => setClinic((c) => (c ? { ...c, phone: e.target.value } : c))}
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={clinic.email}
              onChange={(e) => setClinic((c) => (c ? { ...c, email: e.target.value } : c))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Timezone (IANA)</Label>
          <Input
            value={clinic.timezone}
            onChange={(e) => setClinic((c) => (c ? { ...c, timezone: e.target.value } : c))}
            placeholder="America/Toronto"
          />
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-sm">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Branding</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Applied to your public booking page and confirmation/reminder emails.
          </p>
        </div>
        <div className="space-y-1">
          <Label>Logo URL</Label>
          <Input
            value={clinic.logo_url ?? ""}
            onChange={(e) =>
              setClinic((c) => (c ? { ...c, logo_url: e.target.value || null } : c))
            }
            placeholder="https://…/logo.png"
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
        <div className="space-y-2">
          <Label htmlFor="font-select">Font</Label>
          <Select
            value={clinic.font_family ?? "default"}
            onValueChange={(v) =>
              setClinic((c) => (c ? { ...c, font_family: v === "default" ? null : v } : c))
            }
          >
            <SelectTrigger id="font-select" className="w-full max-w-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">App default</SelectItem>
              <SelectItem value="Inter, sans-serif">Inter</SelectItem>
              <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <EmbedCard clinicSlug={clinic.slug} />

      <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-sm">
        <div>
          <h2 className="text-foreground text-lg font-semibold">Appearance</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Applies to this browser; uses <code className="text-foreground">class</code> on{" "}
            <code className="text-foreground">html</code>.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-select">Theme</Label>
          <Select
            value={theme ?? "light"}
            onValueChange={(v) => {
              if (v) setTheme(v)
            }}
          >
            <SelectTrigger id="theme-select" className="w-full max-w-xs">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
