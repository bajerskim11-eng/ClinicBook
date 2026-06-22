import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Award,
  Calendar,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  Star,
} from "lucide-react"
import type { Metadata } from "next"
import { adminSupabase } from "@/lib/supabase/admin"
import { formatDuration, formatPrice, getInitials } from "@/lib/utils"
import { ReviewsSection } from "./_components/ReviewsSection"

export const runtime = "nodejs"

type Props = {
  params: Promise<{ clinicSlug: string; practitionerSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinicSlug, practitionerSlug } = await params
  const { data: clinic } = await adminSupabase
    .from("clinics")
    .select("id, name")
    .eq("slug", clinicSlug)
    .maybeSingle()
  if (!clinic) return { title: "Practitioner" }
  const { data: p } = await adminSupabase
    .from("practitioners")
    .select("name, title")
    .eq("clinic_id", clinic.id)
    .eq("slug", practitionerSlug)
    .maybeSingle()
  const q =
    p ??
    (
      await adminSupabase
        .from("practitioners")
        .select("name, title")
        .eq("clinic_id", clinic.id)
        .eq("id", practitionerSlug)
        .maybeSingle()
    ).data
  return {
    title: `${q?.name ?? "Practitioner"} — ${clinic.name}`,
    description: `Book with ${q?.name ?? "our team"} at ${clinic.name}.`,
  }
}

export default async function PractitionerProfilePage({ params }: Props) {
  const { clinicSlug, practitionerSlug } = await params
  const { data: clinic } = await adminSupabase
    .from("clinics")
    .select("*")
    .eq("slug", clinicSlug)
    .maybeSingle()

  if (!clinic) notFound()

  const base = `
    *,
    practitioner_services(
      service_id,
      services(id, name, description, duration_minutes, price_cents, is_online_bookable)
    ),
    practitioner_service_pricing(service_id, price_cents, label, duration_minutes)
  `

  const { data: bySlug } = await adminSupabase
    .from("practitioners")
    .select(base)
    .eq("clinic_id", clinic.id)
    .eq("profile_visible", true)
    .eq("is_active", true)
    .eq("slug", practitionerSlug)
    .maybeSingle()

  let practitioner = bySlug
  if (!practitioner) {
    const { data: byId } = await adminSupabase
      .from("practitioners")
      .select(base)
      .eq("clinic_id", clinic.id)
      .eq("profile_visible", true)
      .eq("is_active", true)
      .eq("id", practitionerSlug)
      .maybeSingle()
    practitioner = byId
  }

  if (!practitioner) notFound()

  const { data: reviewsRaw } = await adminSupabase
    .from("practitioner_reviews")
    .select("rating, body, created_at")
    .eq("practitioner_id", practitioner.id)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })

  const reviews = reviewsRaw ?? []
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  const pricingOverrides = new Map(
    (
      (practitioner.practitioner_service_pricing as {
        service_id: string
        price_cents: number
        label: string | null
        duration_minutes: number | null
      }[]) ?? []
    ).map((row) => [row.service_id, row])
  )

  const services = (
    (practitioner.practitioner_services as {
      service_id: string
      services: {
        id: string
        name: string
        description: string | null
        duration_minutes: number
        price_cents: number
        is_online_bookable: boolean
      } | null
    }[]) ?? []
  )
    .map((ps) => {
      const svc = ps.services
      if (!svc) return null
      const o = pricingOverrides.get(ps.service_id)
      return {
        ...svc,
        displayPrice: o?.price_cents ?? svc.price_cents,
        displayDuration: o?.duration_minutes ?? svc.duration_minutes,
        displayLabel: o?.label?.trim() ? o.label : svc.name,
      }
    })
    .filter((s): s is NonNullable<typeof s> => s != null && s.is_online_bookable)

  const education = (practitioner.education as { degree: string; institution: string; year?: number }[]) ?? []
  const certifications =
    (practitioner.certifications as { name: string; issuer: string; year?: number }[]) ?? []
  const languages = (practitioner.languages as string[] | null) ?? []
  const specialties = (practitioner.specialties as string[] | null) ?? []

  const bookingLabel =
    practitioner.booking_link_label?.trim() || "Book an appointment"

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="bg-background border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href={`/book/${clinic.slug}/team`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ← Back to team
          </Link>
          <Link
            href={`/book/${clinic.slug}`}
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm"
          >
            All services
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="border-border bg-card sticky top-6 rounded-2xl border p-5 shadow-sm">
              <div className="mb-5 flex flex-col items-center text-center">
                {practitioner.avatar_url ? (
                  <Image
                    src={practitioner.avatar_url}
                    alt={practitioner.name}
                    width={96}
                    height={96}
                    className="mb-3 size-24 rounded-full border-4 border-white object-cover shadow-sm dark:border-zinc-800"
                    unoptimized
                  />
                ) : (
                  <div
                    className="mb-3 flex size-24 items-center justify-center rounded-full border-4 border-white text-2xl font-semibold text-white shadow-sm dark:border-zinc-800"
                    style={{ backgroundColor: practitioner.color }}
                  >
                    {getInitials(practitioner.name)}
                  </div>
                )}
                <h1 className="text-foreground text-lg font-semibold">{practitioner.name}</h1>
                {practitioner.title ? (
                  <p className="text-muted-foreground mt-0.5 text-sm">{practitioner.title}</p>
                ) : null}
                {practitioner.designation ? (
                  <p className="text-muted-foreground text-xs">{practitioner.designation}</p>
                ) : null}
              </div>

              {avgRating != null && reviews.length > 0 ? (
                <div className="mb-4 flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-4 ${
                        n <= Math.round(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/25"
                      }`}
                    />
                  ))}
                  <span className="text-foreground text-sm font-medium">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-xs">({reviews.length})</span>
                </div>
              ) : null}

              <div className="text-muted-foreground mb-5 space-y-2 border-b pb-5 text-sm">
                {practitioner.years_experience != null && practitioner.years_experience > 0 ? (
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 shrink-0 opacity-70" />
                    {practitioner.years_experience}+ years experience
                  </div>
                ) : null}
                {languages.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Languages className="size-4 shrink-0 opacity-70" />
                    {languages.join(", ")}
                  </div>
                ) : null}
                {clinic.address ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 opacity-70" />
                    {clinic.address}
                  </div>
                ) : null}
                {practitioner.registration_no ? (
                  <div className="text-xs opacity-80">Reg. No: {practitioner.registration_no}</div>
                ) : null}
              </div>

              <Link
                href={`/book/${clinic.slug}?practitioner=${practitioner.id}`}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium"
              >
                <Calendar className="size-4" />
                {bookingLabel}
              </Link>

              {specialties.length > 0 ? (
                <div className="mt-4">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Specialties</p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map((s) => (
                      <span
                        key={s}
                        className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {practitioner.approach ? (
              <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
                <h2 className="text-foreground mb-3 font-semibold">
                  About {practitioner.name.split(" ")[0]}
                </h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {practitioner.approach}
                </p>
              </div>
            ) : null}

            {services.length > 0 ? (
              <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
                <div className="border-border border-b px-6 py-4">
                  <h2 className="text-foreground font-semibold">Services and pricing</h2>
                </div>
                <div className="divide-y">
                  {services.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground font-medium">{svc.displayLabel}</p>
                        {svc.description ? (
                          <p className="text-muted-foreground mt-0.5 truncate text-sm">
                            {svc.description}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {formatDuration(svc.displayDuration)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <p className="text-foreground font-semibold">
                          {svc.displayPrice === 0
                            ? "Free"
                            : formatPrice(svc.displayPrice)}
                        </p>
                        <Link
                          href={`/book/${clinic.slug}?service=${svc.id}&practitioner=${practitioner.id}`}
                          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm"
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {education.length > 0 ? (
              <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="text-muted-foreground size-5" />
                  <h2 className="text-foreground font-semibold">Education</h2>
                </div>
                <div className="space-y-3">
                  {education.map((e, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="bg-primary mt-2 size-2 shrink-0 rounded-full" />
                      <div>
                        <p className="text-foreground font-medium">{e.degree}</p>
                        <p className="text-muted-foreground text-sm">
                          {e.institution}
                          {e.year ? ` · ${e.year}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {certifications.length > 0 ? (
              <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Award className="text-muted-foreground size-5" />
                  <h2 className="text-foreground font-semibold">Certifications and training</h2>
                </div>
                <div className="space-y-3">
                  {certifications.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-2 size-2 shrink-0 rounded-full bg-green-500" />
                      <div>
                        <p className="text-foreground font-medium">{c.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {c.issuer}
                          {c.year ? ` · ${c.year}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <ReviewsSection
              practitionerId={practitioner.id}
              reviews={reviews}
              avgRating={avgRating}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
