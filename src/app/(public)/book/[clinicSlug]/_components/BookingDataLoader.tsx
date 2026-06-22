"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BookingWidget } from "./BookingWidget"
import { ClinicBrandProvider } from "./ClinicBrandProvider"
import { MeetTeamPreview } from "./MeetTeamPreview"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import type { Clinic, PractitionerWithServices, Service } from "@/types"

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; hint?: string }
  | {
      status: "ok"
      clinic: Clinic
      services: Service[]
      practitioners: PractitionerWithServices[]
    }
  | { status: "notfound" }

/**
 * Loads data via **same-origin** `GET /api/booking-data?slug=…` (Edge) so the
 * browser never calls Supabase directly — fixes corporate proxies, some VPNs,
 * and environments where only server/edge outbound HTTPS works.
 */
export function BookingDataLoader({
  clinicSlug,
  preSelectedPractitionerId,
  preSelectedServiceId,
  embed = false,
}: {
  clinicSlug: string
  preSelectedPractitionerId?: string
  preSelectedServiceId?: string
  embed?: boolean
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    void (async () => {
      const res = await fetch(
        `/api/booking-data?slug=${encodeURIComponent(clinicSlug)}`
      )
      const json = (await res.json()) as {
        error?: string
        clinic?: Clinic
        services?: Service[]
        practitioners?: PractitionerWithServices[]
      }

      if (res.status === 404) {
        setState({ status: "notfound" })
        return
      }

      if (!res.ok) {
        const msg = json.error ?? `HTTP ${res.status}`
        const hint =
          msg.includes("fetch") ||
          msg.toLowerCase().includes("failed") ||
          res.status === 502
            ? "Server could not reach Supabase. Check SUPABASE_SERVICE_ROLE_KEY and network (VPN/firewall). Try: npm run dev (uses IPv4-first DNS on Windows)."
            : undefined
        setState({ status: "error", message: msg, hint })
        return
      }

      if (!json.clinic) {
        setState({ status: "notfound" })
        return
      }

      setState({
        status: "ok",
        clinic: json.clinic,
        services: json.services ?? [],
        practitioners: (json.practitioners ?? []) as PractitionerWithServices[],
      })
    })()
  }, [clinicSlug])

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (state.status === "notfound") {
    return (
      <div className="p-8">
        <EmptyState title="Clinic not found. Check the link or slug." />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-8 text-center">
        <p className="text-destructive font-medium">Could not load clinic</p>
        <p className="text-muted-foreground text-sm">{state.message}</p>
        {state.hint && (
          <p className="text-muted-foreground border-border rounded-md border p-3 text-left text-xs">
            {state.hint}
          </p>
        )}
      </div>
    )
  }

  const { clinic, services, practitioners } = state

  return (
    <ClinicBrandProvider primaryColor={clinic.primary_color} fontFamily={clinic.font_family}>
    <div className="bg-background min-h-screen">
      <div className="bg-background border-b">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {clinic.logo_url && (
                <Image
                  src={clinic.logo_url}
                  alt={clinic.name}
                  width={48}
                  height={48}
                  className="size-12 rounded-lg object-cover"
                  unoptimized
                />
              )}
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {clinic.name}
                </h1>
                {clinic.address && (
                  <p className="text-muted-foreground text-sm">{clinic.address}</p>
                )}
              </div>
            </div>
            {!embed && (
              <Link
                href={`/book/${clinicSlug}/team`}
                className="text-primary text-sm font-medium hover:underline"
              >
                Meet our team
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <BookingWidget
          clinic={clinic}
          services={services}
          practitioners={practitioners}
          preSelectedPractitionerId={preSelectedPractitionerId}
          preSelectedServiceId={preSelectedServiceId}
        />
        {!embed && (
          <MeetTeamPreview clinicSlug={clinicSlug} practitioners={practitioners} />
        )}
      </div>
    </div>
    </ClinicBrandProvider>
  )
}
