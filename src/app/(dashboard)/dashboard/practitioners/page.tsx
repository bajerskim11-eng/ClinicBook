"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, KeyRound, Pencil, Plus, UserCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { normalizeEmail } from "@/lib/validation"
import { getInitials } from "@/lib/utils"
import type { PractitionerWithServices, Service } from "@/types"

function slugForNewPractitioner(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const suffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8)
  return `${base || "practitioner"}-${suffix}`
}

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<PractitionerWithServices[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clinicSlug, setClinicSlug] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PractitionerWithServices> | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [portalLinkedIds, setPortalLinkedIds] = useState<Set<string>>(new Set())
  const [portalOpen, setPortalOpen] = useState(false)
  const [portalFor, setPortalFor] = useState<PractitionerWithServices | null>(null)
  const [portalPassword, setPortalPassword] = useState("")
  const [portalPassword2, setPortalPassword2] = useState("")
  const [portalSubmitting, setPortalSubmitting] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: clinic, error: cErr } = await supabase
      .from("clinics")
      .select("id, slug")
      .limit(1)
      .maybeSingle()
    if (cErr || !clinic) {
      toast.error("Could not load clinic")
      return
    }
    setClinicSlug(clinic.slug ?? null)
    const [{ data: ps, error: pErr }, { data: ss, error: sErr }] = await Promise.all([
      supabase
        .from("practitioners")
        .select("*, practitioner_services(service_id)")
        .eq("clinic_id", clinic.id)
        .order("name"),
      supabase
        .from("services")
        .select("*")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true)
        .order("name"),
    ])
    if (pErr) toast.error("Could not load practitioners")
    if (sErr) toast.error("Could not load services")
    setPractitioners((ps as PractitionerWithServices[]) || [])
    setServices((ss as Service[]) || [])

    const portalRes = await fetch("/api/admin/practitioner-portal-access")
    if (portalRes.ok) {
      const portalJson = (await portalRes.json()) as {
        linkedPractitionerIds?: string[]
      }
      setPortalLinkedIds(new Set(portalJson.linkedPractitionerIds ?? []))
    }
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  function openEdit(p?: PractitionerWithServices) {
    setEditing(
      p ?? {
        name: "",
        email: "",
        bio: "",
        color: "#3B82F6",
        is_active: true,
      }
    )
    setSelectedServices(
      p?.practitioner_services?.map((row) => row.service_id) ?? []
    )
    setOpen(true)
  }

  async function save() {
    if (!editing?.name?.trim()) {
      toast.error("Name is required")
      return
    }
    const { data: clinic, error: cErr } = await supabase.from("clinics").select("id, slug").single()
    if (cErr || !clinic) {
      toast.error("Could not resolve clinic")
      return
    }

    let practitionerId = editing.id

    if (editing.id) {
      const { error } = await supabase
        .from("practitioners")
        .update({
          name: editing.name.trim(),
          email: editing.email?.trim()
            ? normalizeEmail(editing.email)
            : null,
          bio: editing.bio?.trim() || null,
          color: editing.color ?? "#3B82F6",
          is_active: editing.is_active ?? true,
        })
        .eq("id", editing.id)
      if (error) {
        toast.error("Could not update practitioner")
        return
      }
    } else {
      const { data, error } = await supabase
        .from("practitioners")
        .insert({
          clinic_id: clinic.id,
          name: editing.name.trim(),
          email: editing.email?.trim()
            ? normalizeEmail(editing.email)
            : null,
          bio: editing.bio?.trim() || null,
          color: editing.color ?? "#3B82F6",
          is_active: editing.is_active ?? true,
          slug: slugForNewPractitioner(editing.name.trim()),
        })
        .select()
        .single()
      if (error || !data) {
        toast.error("Could not create practitioner")
        return
      }
      practitionerId = data.id
    }

    if (!practitionerId) {
      toast.error("Missing practitioner id")
      return
    }

    const { error: delErr } = await supabase
      .from("practitioner_services")
      .delete()
      .eq("practitioner_id", practitionerId)
    if (delErr) {
      toast.error("Could not update service assignments")
      return
    }

    if (selectedServices.length > 0) {
      const { error: insErr } = await supabase.from("practitioner_services").insert(
        selectedServices.map((sid) => ({ practitioner_id: practitionerId, service_id: sid }))
      )
      if (insErr) {
        toast.error("Could not assign services")
        return
      }
    }

    setOpen(false)
    toast.success("Practitioner saved")
    void load()
  }

  function openPortalDialog(p: PractitionerWithServices) {
    setPortalFor(p)
    setPortalPassword("")
    setPortalPassword2("")
    setPortalOpen(true)
  }

  async function submitPortalAccess() {
    if (!portalFor?.id) return
    if (!portalFor.email?.trim()) {
      toast.error("Add an email to this practitioner first")
      return
    }
    if (portalPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (portalPassword !== portalPassword2) {
      toast.error("Passwords do not match")
      return
    }
    setPortalSubmitting(true)
    const res = await fetch("/api/admin/practitioner-portal-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId: portalFor.id,
        password: portalPassword,
      }),
    })
    const json = (await res.json()) as { error?: string; email?: string }
    if (!res.ok) {
      toast.error(json.error ?? "Could not create portal access")
    } else {
      toast.success("Staff portal enabled", {
        description: `They can sign in at /auth/practitioner-login with ${json.email ?? portalFor.email}.`,
      })
      setPortalOpen(false)
      void load()
    }
    setPortalSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-foreground text-2xl font-semibold">Practitioners</h1>
        <Button onClick={() => openEdit()}>
          <Plus className="mr-2 h-4 w-4" /> Add practitioner
        </Button>
      </div>

      <div className="grid gap-3">
        {practitioners.map((p) => (
          <div
            key={p.id}
            className="border-border bg-card flex flex-wrap items-center gap-4 rounded-xl border p-5 shadow-sm"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: p.color }}
            >
              {getInitials(p.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-foreground font-medium">{p.name}</p>
                {!p.is_active && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                    Inactive
                  </span>
                )}
                {portalLinkedIds.has(p.id) && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                    Staff portal
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{p.email}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {p.practitioner_services?.length ?? 0} services assigned
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/practitioners/${p.id}/edit`}
                title="Full profile editor"
                className="hover:bg-muted text-muted-foreground inline-flex size-8 items-center justify-center rounded-lg"
              >
                <UserCircle className="h-4 w-4" />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Quick edit (name, services)">
                <Pencil className="h-4 w-4" />
              </Button>
              {!portalLinkedIds.has(p.id) && p.email?.trim() ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openPortalDialog(p)}
                  title="Create staff portal login"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              ) : null}
              {clinicSlug && p.slug ? (
                <a
                  href={`/book/${clinicSlug}/team/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View public profile"
                  className="hover:bg-muted text-muted-foreground inline-flex size-8 items-center justify-center rounded-lg"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit practitioner" : "Add practitioner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1">
                <Label>Bio (optional)</Label>
                <Textarea
                  value={editing.bio ?? ""}
                  onChange={(e) => setEditing((prev) => (prev ? { ...prev, bio: e.target.value } : prev))}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label>Calendar color</Label>
                <input
                  type="color"
                  value={editing.color ?? "#3B82F6"}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, color: e.target.value } : prev))
                  }
                  className="h-10 w-full cursor-pointer rounded border"
                />
              </div>
              <div>
                <Label className="mb-2 block">Services this practitioner offers</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`svc-${s.id}`}
                        checked={selectedServices.includes(s.id)}
                        onCheckedChange={(checked) => {
                          setSelectedServices((prev) =>
                            checked === true ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                          )
                        }}
                      />
                      <label htmlFor={`svc-${s.id}`} className="cursor-pointer text-sm">
                        {s.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) =>
                    setEditing((prev) => (prev ? { ...prev, is_active: v } : prev))
                  }
                />
                <Label>Active (can take bookings)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portalOpen} onOpenChange={setPortalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff portal access</DialogTitle>
          </DialogHeader>
          {portalFor && (
            <div className="space-y-4 py-2">
              <p className="text-muted-foreground text-sm">
                Create a password for <strong>{portalFor.name}</strong> ({portalFor.email}).
                They will sign in at{" "}
                <code className="text-foreground bg-muted rounded px-1 text-xs">
                  /auth/practitioner-login
                </code>
                .
              </p>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={portalPassword2}
                  onChange={(e) => setPortalPassword2(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={portalSubmitting}
              onClick={() => void submitPortalAccess()}
            >
              {portalSubmitting ? "Creating…" : "Create login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
