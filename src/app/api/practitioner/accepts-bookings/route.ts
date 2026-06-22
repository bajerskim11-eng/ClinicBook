import { getPractitionerPortalContext } from "@/lib/practitioner-portal"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { practitionerAcceptsBookingsSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function PATCH(request: Request) {
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

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = practitionerAcceptsBookingsSchema.safeParse(json)
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from("practitioners")
    .update({ accepts_online_bookings: parsed.data.acceptsOnlineBookings })
    .eq("id", ctx.practitionerId)
    .select("accepts_online_bookings")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ acceptsOnlineBookings: data?.accepts_online_bookings })
}
