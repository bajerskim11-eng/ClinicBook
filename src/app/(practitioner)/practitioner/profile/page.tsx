"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Practitioner } from "@/types"

export default function PractitionerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bio: "",
    title: "",
    designation: "",
    registration_no: "",
    years_experience: "" as string | number,
    approach: "",
    booking_link_label: "",
    avatar_url: "",
    header_image_url: "",
    profile_visible: true,
    languages: "",
    specialties: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/practitioner/me")
    const json = (await res.json()) as { practitioner?: Practitioner; error?: string }
    if (!res.ok) {
      toast.error(json.error ?? "Could not load profile")
      setLoading(false)
      return
    }
    const p = json.practitioner
    if (p) {
      setForm({
        bio: p.bio ?? "",
        title: p.title ?? "",
        designation: p.designation ?? "",
        registration_no: p.registration_no ?? "",
        years_experience: p.years_experience ?? "",
        approach: p.approach ?? "",
        booking_link_label: p.booking_link_label ?? "",
        avatar_url: p.avatar_url ?? "",
        header_image_url: p.header_image_url ?? "",
        profile_visible: p.profile_visible !== false,
        languages: (p.languages ?? []).join(", "),
        specialties: (p.specialties ?? []).join(", "),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const languages = form.languages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const specialties = form.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const years =
      form.years_experience === "" || form.years_experience === undefined
        ? null
        : Number(form.years_experience)

    const res = await fetch("/api/practitioner/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio: form.bio.trim() || undefined,
        title: form.title.trim() || undefined,
        designation: form.designation.trim() || undefined,
        registration_no: form.registration_no.trim() || undefined,
        years_experience: Number.isFinite(years) ? years : null,
        approach: form.approach.trim() || undefined,
        booking_link_label: form.booking_link_label.trim() || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
        header_image_url: form.header_image_url.trim() || undefined,
        profile_visible: form.profile_visible,
        languages: languages.length ? languages : null,
        specialties: specialties.length ? specialties : null,
      }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      toast.error(json.error ?? "Save failed")
    } else {
      toast.success("Profile saved")
    }
    setSaving(false)
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading profile…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Public profile
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Information patients see on your booking profile page.
        </p>
      </div>

      <form onSubmit={(e) => void save(e)}>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Name and email are managed by your clinic admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Registered Physiotherapist"
              />
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, designation: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Registration number</Label>
              <Input
                value={form.registration_no}
                onChange={(e) =>
                  setForm((f) => ({ ...f, registration_no: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Years of experience</Label>
              <Input
                type="number"
                min={0}
                max={80}
                value={form.years_experience}
                onChange={(e) =>
                  setForm((f) => ({ ...f, years_experience: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Approach / philosophy</Label>
              <Textarea
                rows={3}
                value={form.approach}
                onChange={(e) =>
                  setForm((f) => ({ ...f, approach: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Languages (comma-separated)</Label>
              <Input
                value={form.languages}
                onChange={(e) =>
                  setForm((f) => ({ ...f, languages: e.target.value }))
                }
                placeholder="English, French"
              />
            </div>
            <div className="space-y-1">
              <Label>Specialties (comma-separated)</Label>
              <Input
                value={form.specialties}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialties: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Avatar image URL</Label>
              <Input
                value={form.avatar_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, avatar_url: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1">
              <Label>Header image URL</Label>
              <Input
                value={form.header_image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, header_image_url: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Book button label</Label>
              <Input
                value={form.booking_link_label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, booking_link_label: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.profile_visible}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, profile_visible: v }))
                }
              />
              <Label>Show my profile on the public team page</Label>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
