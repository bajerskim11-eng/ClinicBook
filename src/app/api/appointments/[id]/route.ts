import { adminSupabase } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await adminSupabase
    .from("appointments")
    .select("*, practitioners(*), services(*), patients(*), clinics(slug, name)")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.status === "cancelled") {
    const { error } = await adminSupabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unsupported" }, { status: 400 })
}
