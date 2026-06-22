import { NextResponse } from "next/server"
import { getPractitionerPortalContext } from "@/lib/practitioner-portal"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ctx = await getPractitionerPortalContext(user.id)
  if (!ctx) {
    return NextResponse.json({ error: "No practitioner portal access" }, { status: 403 })
  }

  const [{ data: practitioner, error: pErr }, { data: clinic, error: cErr }] =
    await Promise.all([
      adminSupabase.from("practitioners").select("*").eq("id", ctx.practitionerId).single(),
      adminSupabase.from("clinics").select("id, name, slug, logo_url").eq("id", ctx.clinicId).single(),
    ])

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 })
  }
  if (cErr || !clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
  }

  return NextResponse.json({ practitioner, clinic })
}
