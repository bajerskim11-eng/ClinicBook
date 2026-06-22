"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { normalizeEmail } from "@/lib/validation"

const SPECIALTIES = [
  "Sports injuries",
  "Post-surgical rehabilitation",
  "Chronic pain",
  "Manual therapy",
  "Vestibular rehabilitation",
  "Pelvic floor",
  "Neurological rehabilitation",
  "Workplace injuries",
  "Motor vehicle accidents",
  "Pediatrics",
  "Geriatrics",
  "Pre/postnatal care",
  "Concussion management",
  "Acupuncture / IMS",
  "Shockwave therapy",
]

const LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Hindi",
  "Punjabi",
  "Arabic",
  "Portuguese",
  "Italian",
  "Korean",
  "Tagalog",
]

type Edu = { degree: string; institution: string; year: string }
type Cert = { name: string; issuer: string; year: string }
type PricingRow = {
  service_id: string
  price_cents: string
  label: string
  duration_minutes: string
}

export default function EditPractitionerPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clinicSlug, setClinicSlug] = useState("")
  const [services, setServices] = useState<{ id: string; name: string }[]>([])

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [designation, setDesignation] = useState("")
  const [registrationNo, setRegistrationNo] = useState("")
  const [yearsExperience, setYearsExperience] = useState("")
  const [bio, setBio] = useState("")
  const [approach, setApproach] = useState("")
  const [color, setColor] = useState("#3B82F6")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [headerUrl, setHeaderUrl] = useState("")
  const [bookingLabel, setBookingLabel] = useState("Book an appointment")
  const [profileVisible, setProfileVisible] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [email, setEmail] = useState("")

  const [languages, setLanguages] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [education, setEducation] = useState<Edu[]>([])
  const [certifications, setCertifications] = useState<Cert[]>([])

  const [assignedServices, setAssignedServices] = useState<string[]>([])
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([])

  const [pendingReviews, setPendingReviews] = useState<
    { id: string; rating: number; body: string | null; created_at: string }[]
  >([])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    const { data: clinic } = await supabase.from("clinics").select("slug").limit(1).maybeSingle()
    if (clinic?.slug) setClinicSlug(clinic.slug)

    const { data: p, error: pErr } = await supabase
      .from("practitioners")
      .select("*")
      .eq("id", id)
      .single()

    if (pErr || !p) {
      toast.error("Practitioner not found")
      router.push("/dashboard/practitioners")
      setLoading(false)
      return
    }


    const [{ data: svcList }, { data: ps }, { data: pricing }, { data: revs }] =
      await Promise.all([
        supabase
          .from("services")
          .select("id, name")
          .eq("clinic_id", p.clinic_id)
          .eq("is_active", true)
          .order("name"),
        supabase.from("practitioner_services").select("service_id").eq("practitioner_id", id),
        supabase.from("practitioner_service_pricing").select("*").eq("practitioner_id", id),
        supabase
          .from("practitioner_reviews")
          .select("*")
          .eq("practitioner_id", id)
          .order("created_at", { ascending: false }),
      ])

    setName(p.name ?? "")
    setSlug(p.slug ?? "")
    setTitle(p.title ?? "")
    setDesignation(p.designation ?? "")
    setRegistrationNo(p.registration_no ?? "")
    setYearsExperience(p.years_experience != null ? String(p.years_experience) : "")
    setBio(p.bio ?? "")
    setApproach(p.approach ?? "")
    setColor(p.color ?? "#3B82F6")
    setAvatarUrl(p.avatar_url ?? "")
    setHeaderUrl(p.header_image_url ?? "")
    setBookingLabel(p.booking_link_label ?? "Book an appointment")
    setProfileVisible(p.profile_visible !== false)
    setIsActive(p.is_active !== false)
    setEmail(p.email ?? "")
    setLanguages(Array.isArray(p.languages) ? p.languages : [])
    setSpecialties(Array.isArray(p.specialties) ? p.specialties : [])

    const edu = (p.education as { degree?: string; institution?: string; year?: number }[]) ?? []
    setEducation(
      edu.map((e) => ({
        degree: e.degree ?? "",
        institution: e.institution ?? "",
        year: e.year != null ? String(e.year) : "",
      }))
    )
    const certs = (p.certifications as { name?: string; issuer?: string; year?: number }[]) ?? []
    setCertifications(
      certs.map((c) => ({
        name: c.name ?? "",
        issuer: c.issuer ?? "",
        year: c.year != null ? String(c.year) : "",
      }))
    )

    setServices((svcList as { id: string; name: string }[]) ?? [])
    setAssignedServices((ps ?? []).map((row: { service_id: string }) => row.service_id))
    setPricingRows(
      (pricing ?? []).map(
        (row: {
          service_id: string
          price_cents: number
          label: string | null
          duration_minutes: number | null
        }) => ({
          service_id: row.service_id,
          price_cents: String(row.price_cents),
          label: row.label ?? "",
          duration_minutes: row.duration_minutes != null ? String(row.duration_minutes) : "",
        })
      )
    )

    setPendingReviews(
      (revs ?? []).filter((r: { is_visible: boolean }) => !r.is_visible) as typeof pendingReviews
    )
    setLoading(false)
  },
    [id, router, supabase]
  )

  useEffect(() => {
    // Fetch practitioner + related rows on mount (async setState after awaits).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount bootstrap
    void load({ silent: true })
  }, [load])

  function toggleLang(l: string) {
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
  }

  function toggleSpec(s: string) {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function rowForService(sid: string): PricingRow {
    return (
      pricingRows.find((r) => r.service_id === sid) ?? {
        service_id: sid,
        price_cents: "",
        label: "",
        duration_minutes: "",
      }
    )
  }

  function setPricing(sid: string, patch: Partial<PricingRow>) {
    setPricingRows((prev) => {
      const other = prev.filter((r) => r.service_id !== sid)
      const cur = prev.find((r) => r.service_id === sid) ?? rowForService(sid)
      return [...other, { ...cur, ...patch }]
    })
  }

  async function save() {
    setSaving(true)
    const slugOut =
      slug.trim() ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      `practitioner-${id.slice(0, 8)}`

    const years = yearsExperience.trim() ? parseInt(yearsExperience, 10) : null
    const eduJson = education
      .filter((e) => e.degree.trim() || e.institution.trim())
      .map((e) => ({
        degree: e.degree.trim(),
        institution: e.institution.trim(),
        ...(e.year.trim() ? { year: parseInt(e.year, 10) } : {}),
      }))
    const certJson = certifications
      .filter((c) => c.name.trim() || c.issuer.trim())
      .map((c) => ({
        name: c.name.trim(),
        issuer: c.issuer.trim(),
        ...(c.year.trim() ? { year: parseInt(c.year, 10) } : {}),
      }))

    const { error } = await supabase
      .from("practitioners")
      .update({
        name: name.trim(),
        slug: slugOut,
        title: title.trim() || null,
        designation: designation.trim() || null,
        registration_no: registrationNo.trim() || null,
        years_experience: years != null && !Number.isNaN(years) ? years : null,
        bio: bio.trim() || null,
        approach: approach.trim() || null,
        color,
        avatar_url: avatarUrl.trim() || null,
        header_image_url: headerUrl.trim() || null,
        booking_link_label: bookingLabel.trim() || "Book an appointment",
        profile_visible: profileVisible,
        is_active: isActive,
        email: email.trim() ? normalizeEmail(email) : null,
        languages,
        specialties,
        education: eduJson,
        certifications: certJson,
      })
      .eq("id", id)

    if (error) {
      toast.error("Could not save", { description: error.message })
      setSaving(false)
      return
    }

    await supabase.from("practitioner_services").delete().eq("practitioner_id", id)
    if (assignedServices.length) {
      await supabase.from("practitioner_services").insert(
        assignedServices.map((sid) => ({ practitioner_id: id, service_id: sid }))
      )
    }

    await supabase.from("practitioner_service_pricing").delete().eq("practitioner_id", id)
    const validPricing = assignedServices
      .map((sid) => {
        const r = rowForService(sid)
        const cents = parseInt(r.price_cents, 10)
        if (Number.isNaN(cents) || r.price_cents.trim() === "") return null
        return {
          practitioner_id: id,
          service_id: sid,
          price_cents: cents,
          label: r.label.trim() || null,
          duration_minutes: r.duration_minutes.trim()
            ? parseInt(r.duration_minutes, 10)
            : null,
        }
      })
      .filter(Boolean) as {
      practitioner_id: string
      service_id: string
      price_cents: number
      label: string | null
      duration_minutes: number | null
    }[]
    if (validPricing.length) {
      await supabase.from("practitioner_service_pricing").insert(validPricing)
    }

    toast.success("Profile saved")
    setSaving(false)
    void load()
  }


  async function approveReview(rid: string) {
    await supabase.from("practitioner_reviews").update({ is_visible: true }).eq("id", rid)
    setPendingReviews((prev) => prev.filter((r) => r.id !== rid))
    toast.success("Review published")
  }

  async function deleteReview(rid: string) {
    await supabase.from("practitioner_reviews").delete().eq("id", rid)
    setPendingReviews((prev) => prev.filter((r) => r.id !== rid))
    toast.success("Review deleted")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  const publicProfileUrl =
    clinicSlug && slug ? `/book/${clinicSlug}/team/${slug}` : null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/practitioners"
            className="text-muted-foreground hover:text-foreground mb-2 inline-block text-sm"
          >
            ← Practitioners
          </Link>
          <h1 className="text-foreground text-2xl font-semibold">Edit practitioner profile</h1>
          <p className="text-muted-foreground text-sm">{name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {publicProfileUrl ? (
            <a
              href={publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              <ExternalLink className="size-3.5" /> View public profile
            </a>
          ) : null}
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics">
        <TabsList variant="line" className="mb-4 w-full flex-wrap gap-1">
          <TabsTrigger value="basics">Basic info</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="services">Services & pricing</TabsTrigger>
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews{pendingReviews.length > 0 ? ` (${pendingReviews.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4 pt-2">
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>URL slug</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">/team/</span>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="auto from name"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Professional title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Registration number</Label>
                <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Years experience</Label>
              <Input
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Treatment approach</Label>
              <Textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={4} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Avatar URL</Label>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Header image URL</Label>
                <Input value={headerUrl} onChange={(e) => setHeaderUrl(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Calendar color</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full max-w-[120px] cursor-pointer rounded border"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4 pt-2">
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <div>
              <Label className="mb-2 block">Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <label key={l} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={languages.includes(l)} onCheckedChange={() => toggleLang(l)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Specialties</Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={specialties.includes(s)} onCheckedChange={() => toggleSpec(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Education</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEducation((e) => [...e, { degree: "", institution: "", year: "" }])
                  }
                >
                  <Plus className="mr-1 size-3" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {education.map((e, i) => (
                  <div key={i} className="bg-muted/40 flex flex-wrap gap-2 rounded-lg border p-3">
                    <Input
                      placeholder="Degree"
                      value={e.degree}
                      onChange={(ev) => {
                        const u = [...education]
                        u[i] = { ...u[i]!, degree: ev.target.value }
                        setEducation(u)
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Institution"
                      value={e.institution}
                      onChange={(ev) => {
                        const u = [...education]
                        u[i] = { ...u[i]!, institution: ev.target.value }
                        setEducation(u)
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Year"
                      value={e.year}
                      onChange={(ev) => {
                        const u = [...education]
                        u[i] = { ...u[i]!, year: ev.target.value }
                        setEducation(u)
                      }}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEducation((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Certifications</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCertifications((c) => [...c, { name: "", issuer: "", year: "" }])
                  }
                >
                  <Plus className="mr-1 size-3" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {certifications.map((c, i) => (
                  <div key={i} className="bg-muted/40 flex flex-wrap gap-2 rounded-lg border p-3">
                    <Input
                      placeholder="Name"
                      value={c.name}
                      onChange={(ev) => {
                        const u = [...certifications]
                        u[i] = { ...u[i]!, name: ev.target.value }
                        setCertifications(u)
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Issuer"
                      value={c.issuer}
                      onChange={(ev) => {
                        const u = [...certifications]
                        u[i] = { ...u[i]!, issuer: ev.target.value }
                        setCertifications(u)
                      }}
                      className="flex-1 min-w-[120px]"
                    />
                    <Input
                      placeholder="Year"
                      value={c.year}
                      onChange={(ev) => {
                        const u = [...certifications]
                        u[i] = { ...u[i]!, year: ev.target.value }
                        setCertifications(u)
                      }}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCertifications((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 pt-2">
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <Label className="block">Services offered</Label>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={assignedServices.includes(s.id)}
                    onCheckedChange={(checked) => {
                      setAssignedServices((prev) =>
                        checked === true
                          ? [...prev, s.id]
                          : prev.filter((x) => x !== s.id)
                      )
                    }}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <Label>Pricing overrides (optional)</Label>
              {assignedServices.map((sid) => {
                const s = services.find((x) => x.id === sid)
                const r = rowForService(sid)
                return (
                  <div key={sid} className="bg-muted/30 space-y-2 rounded-lg border p-3 text-sm">
                    <p className="font-medium">{s?.name}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs">Price (cents)</Label>
                        <Input
                          value={r.price_cents}
                          onChange={(e) => setPricing(sid, { price_cents: e.target.value })}
                          placeholder="e.g. 15000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={r.label}
                          onChange={(e) => setPricing(sid, { label: e.target.value })}
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          value={r.duration_minutes}
                          onChange={(e) => setPricing(sid, { duration_minutes: e.target.value })}
                          placeholder="Override"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visibility" className="space-y-4 pt-2">
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <Switch checked={profileVisible} onCheckedChange={setProfileVisible} />
              <Label>Show on public team & profile pages</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active (can take bookings)</Label>
            </div>
            <div className="space-y-1">
              <Label>Booking button label</Label>
              <Input value={bookingLabel} onChange={(e) => setBookingLabel(e.target.value)} />
            </div>
            {publicProfileUrl ? (
              <p className="text-muted-foreground text-sm">
                Public URL:{" "}
                <code className="bg-muted rounded px-1 text-xs">{publicProfileUrl}</code>
              </p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4 pt-2">
          <div className="border-border bg-card rounded-xl border p-5">
            <h3 className="text-foreground mb-3 font-medium">Pending moderation</h3>
            {pendingReviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending reviews.</p>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map((r) => (
                  <div key={r.id} className="bg-muted/30 rounded-lg border p-4">
                    <div className="text-amber-500 mb-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n}>{n <= r.rating ? "★" : "☆"}</span>
                      ))}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.body ? <p className="text-muted-foreground mb-3 text-sm">{r.body}</p> : null}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void approveReview(r.id)}>
                        Approve & publish
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => void deleteReview(r.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
