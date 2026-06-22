import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Star } from "lucide-react"
import type { Metadata } from "next"
import { adminSupabase } from "@/lib/supabase/admin"
import { getInitials } from "@/lib/utils"

export const runtime = "nodejs"

type Props = { params: Promise<{ clinicSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinicSlug } = await params
  const { data: clinic } = await adminSupabase
    .from("clinics")
    .select("name")
    .eq("slug", clinicSlug)
    .maybeSingle()
  const name = clinic?.name ?? "Clinic"
  return {
    title: `Our team — ${name}`,
    description: `Meet the practitioners at ${name}. View profiles and book directly.`,
  }
}

export default async function TeamDirectoryPage({ params }: Props) {
  const { clinicSlug } = await params
  const { data: clinic } = await adminSupabase
    .from("clinics")
    .select("*")
    .eq("slug", clinicSlug)
    .maybeSingle()

  if (!clinic) notFound()

  const { data: practitioners } = await adminSupabase
    .from("practitioners")
    .select(`*, practitioner_services(service_id, services(name))`)
    .eq("clinic_id", clinic.id)
    .eq("is_active", true)
    .eq("profile_visible", true)
    .order("name")

  const list = practitioners ?? []

  const { data: visibleReviews } = await adminSupabase
    .from("practitioner_reviews")
    .select("practitioner_id, rating")
    .eq("clinic_id", clinic.id)
    .eq("is_visible", true)

  const avgByPractitioner = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const r of visibleReviews ?? []) {
    const pid = r.practitioner_id as string
    counts.set(pid, (counts.get(pid) ?? 0) + 1)
    avgByPractitioner.set(pid, (avgByPractitioner.get(pid) ?? 0) + (r.rating as number))
  }
  for (const [pid, sum] of avgByPractitioner) {
    const c = counts.get(pid) ?? 1
    avgByPractitioner.set(pid, sum / c)
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div className="flex items-center gap-4">
            {clinic.logo_url ? (
              <Image
                src={clinic.logo_url}
                alt={clinic.name}
                width={48}
                height={48}
                className="size-12 rounded-xl object-cover"
                unoptimized
              />
            ) : null}
            <div>
              <h1 className="text-foreground text-xl font-semibold">{clinic.name}</h1>
              {clinic.address ? (
                <p className="text-muted-foreground text-sm">{clinic.address}</p>
              ) : null}
            </div>
          </div>
          <Link
            href={`/book/${clinic.slug}`}
            className="border-border bg-background text-foreground hover:bg-muted inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium"
          >
            Book an appointment
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <h2 className="text-foreground text-2xl font-semibold">Meet our team</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {list.length} practitioner{list.length === 1 ? "" : "s"}
            {clinic.address ? ` · ${clinic.address}` : ""}
          </p>
        </div>

        {!list.length ? (
          <p className="text-muted-foreground text-sm">No public profiles yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((p) => {
              const avg = avgByPractitioner.get(p.id)
              const ps = p.practitioner_services as
                | { service_id: string; services: { name: string } | null }[]
                | null
              const tags = (ps ?? [])
                .map((row) => row.services?.name)
                .filter(Boolean)
                .slice(0, 4) as string[]
              return (
                <Link
                  key={p.id}
                  href={`/book/${clinic.slug}/team/${p.slug ?? p.id}`}
                  className="border-border bg-card hover:border-primary/40 flex gap-4 rounded-xl border p-5 shadow-sm transition-colors"
                >
                  {p.avatar_url ? (
                    <Image
                      src={p.avatar_url}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 shrink-0 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {getInitials(p.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-semibold">{p.name}</p>
                    {p.title ? (
                      <p className="text-muted-foreground text-sm">{p.title}</p>
                    ) : null}
                    {p.designation ? (
                      <p className="text-muted-foreground text-xs">{p.designation}</p>
                    ) : null}
                    {avg != null && !Number.isNaN(avg) ? (
                      <div className="mt-2 flex items-center gap-1 text-amber-500">
                        <Star className="size-4 fill-current" />
                        <span className="text-foreground text-sm font-medium">
                          {avg.toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
