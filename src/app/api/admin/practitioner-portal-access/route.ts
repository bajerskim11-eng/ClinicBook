import {
  normalizeEmail,
  practitionerPortalAccessSchema,
} from "@/lib/validation"
import { adminSupabase } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

async function assertClinicStaff(userId: string) {
  const { data: portalRow } = await adminSupabase
    .from("practitioner_accounts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (portalRow) {
    return NextResponse.json(
      { error: "Practitioner portal users cannot use this action" },
      { status: 403 }
    )
  }
  return null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const block = await assertClinicStaff(user.id)
  if (block) return block

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (!clinic?.id) {
    return NextResponse.json({ linkedPractitionerIds: [] as string[] })
  }

  const { data: rows, error } = await adminSupabase
    .from("practitioner_accounts")
    .select("practitioner_id")
    .eq("clinic_id", clinic.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    linkedPractitionerIds: (rows ?? []).map((r) => r.practitioner_id as string),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const block = await assertClinicStaff(user.id)
  if (block) return block

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = practitionerPortalAccessSchema.safeParse(json)
  if (!parsed.success) {
    const first =
      Object.values(parsed.error.flatten().fieldErrors).flat()[0] ??
      "Invalid input"
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const { practitionerId, password } = parsed.data

  const { data: practitioner, error: pErr } = await adminSupabase
    .from("practitioners")
    .select("id, clinic_id, email, name")
    .eq("id", practitionerId)
    .maybeSingle()

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 })
  }

  const emailRaw = practitioner.email?.trim()
  if (!emailRaw) {
    return NextResponse.json(
      { error: "Practitioner must have an email before enabling portal access" },
      { status: 400 }
    )
  }
  const email = normalizeEmail(emailRaw)

  const { data: existingLink } = await adminSupabase
    .from("practitioner_accounts")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .maybeSingle()
  if (existingLink) {
    return NextResponse.json(
      { error: "This practitioner already has portal access" },
      { status: 409 }
    )
  }

  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: practitioner.name.split(/\s+/)[0] ?? practitioner.name,
        last_name: practitioner.name.split(/\s+/).slice(1).join(" ") || " ",
      },
      app_metadata: { role: "practitioner" },
    })

  if (authError || !authData.user) {
    const msg = authError?.message?.toLowerCase() ?? ""
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")
    ) {
      return NextResponse.json(
        {
          code: "EMAIL_EXISTS",
          error:
            "That email is already registered. Use a unique practitioner email or reset the user in Supabase Auth.",
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: authError?.message ?? "Could not create auth user" },
      { status: 400 }
    )
  }

  const userId = authData.user.id

  const { error: linkError } = await adminSupabase.from("practitioner_accounts").insert({
    user_id: userId,
    practitioner_id: practitioner.id,
    clinic_id: practitioner.clinic_id,
  })

  if (linkError) {
    await adminSupabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ userId, email })
}
