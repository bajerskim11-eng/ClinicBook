import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ formId: string }> }
) {
  const { formId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from("intake_form_submissions")
    .select("id, status")
    .eq("id", formId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.status === "submitted") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 })
  }

  let body: { answers?: Record<string, unknown>; status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (body.answers !== undefined) updateData.answers = body.answers
  if (body.status === "in_progress" || body.status === "submitted") {
    updateData.status = body.status
  }
  if (body.status === "submitted") {
    updateData.submitted_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("intake_form_submissions")
    .update(updateData)
    .eq("id", formId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
