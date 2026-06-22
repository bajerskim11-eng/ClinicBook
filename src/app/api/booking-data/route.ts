import { adminSupabase } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const runtime = "edge"

/**
 * Same-origin booking bootstrap for restrictive networks: browser calls localhost
 * only; this route reaches Supabase (Edge fetch). Use when direct browser→Supabase
 * fails (VPN, corporate proxy, MCP embedded browser isolation).
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }

  const { data: clinic, error: clinicError } = await adminSupabase
    .from("clinics")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (clinicError) {
    return NextResponse.json(
      { error: clinicError.message, code: clinicError.code },
      { status: 502 }
    )
  }
  if (!clinic) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const { data: services, error: sErr } = await adminSupabase
    .from("services")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("is_active", true)
    .eq("is_online_bookable", true)
    .order("name")

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 502 })
  }

  const { data: practitioners, error: pErr } = await adminSupabase
    .from("practitioners")
    .select(
      "*, practitioner_services(service_id), practitioner_service_pricing(service_id, price_cents, label, duration_minutes)"
    )
    .eq("clinic_id", clinic.id)
    .eq("is_active", true)
    .order("name")

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 502 })
  }

  return NextResponse.json({
    clinic,
    services: services ?? [],
    practitioners: practitioners ?? [],
  })
}
