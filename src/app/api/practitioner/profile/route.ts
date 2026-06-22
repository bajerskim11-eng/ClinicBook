import {
  practitionerPortalProfileSchema,
} from "@/lib/validation"
import { getPractitionerPortalContext } from "@/lib/practitioner-portal"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
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

  const parsed = practitionerPortalProfileSchema.safeParse(json)
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const payload = parsed.data
  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined) update[k] = v
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from("practitioners")
    .update(update)
    .eq("id", ctx.practitionerId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ practitioner: data })
}
