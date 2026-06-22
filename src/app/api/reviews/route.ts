import { NextResponse } from "next/server"
import { z } from "zod"
import { adminSupabase } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const schema = z.object({
  practitionerId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { practitionerId, rating, body: reviewBody } = result.data

  const { data: p, error: pErr } = await adminSupabase
    .from("practitioners")
    .select("clinic_id")
    .eq("id", practitionerId)
    .single()

  if (pErr || !p) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 })
  }

  const { data, error } = await adminSupabase
    .from("practitioner_reviews")
    .insert({
      practitioner_id: practitionerId,
      clinic_id: p.clinic_id,
      rating,
      body: reviewBody?.trim() || null,
      is_visible: false,
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
