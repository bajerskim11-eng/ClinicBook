import { getPractitionerPortalContext } from "@/lib/practitioner-portal"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  let q = adminSupabase
    .from("appointments")
    .select(
      `
      *,
      patients ( first_name, last_name, email, phone ),
      services ( name, duration_minutes )
    `
    )
    .eq("practitioner_id", ctx.practitionerId)
    .order("start_datetime", { ascending: true })

  const now = new Date()
  const fromIso = from ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const toIso =
    to ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
  q = q.gte("start_datetime", fromIso).lte("start_datetime", toIso)

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ appointments: data ?? [] })
}
