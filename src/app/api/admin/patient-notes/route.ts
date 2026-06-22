import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const patientId = new URL(request.url).searchParams.get("patientId")
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from("patient_notes")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { patientId?: string; clinicId?: string; body?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { patientId, clinicId, body: noteBody } = body
  if (!patientId || !clinicId || !noteBody?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from("patient_notes")
    .insert({
      patient_id: patientId,
      clinic_id: clinicId,
      body: noteBody.trim(),
      author_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
