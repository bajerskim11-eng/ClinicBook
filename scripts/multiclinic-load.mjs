import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

const BASE_URL = process.env.LOADTEST_BASE_URL ?? "http://localhost:3000"
const CLINIC_COUNT = Number.parseInt(process.env.LOADTEST_CLINIC_COUNT ?? "10", 10)
const PASSWORD = process.env.LOADTEST_PORTAL_PASSWORD ?? "ChangeMe_123!"

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf8")
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function mustEnv(name) {
  const value = process.env[name]?.trim() ?? ""
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

function slugNum(i) {
  return String(i).padStart(2, "0")
}

function nextWeekdayDateIso() {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return d.toISOString().slice(0, 10)
}

async function ensureClinicGraph(admin, i) {
  const n = slugNum(i)
  const slug = `loadtest-clinic-${n}`
  const clinicName = `Loadtest Clinic ${n}`
  const practitionerEmail = `portal.prac.${n}@loadtest.demo`

  const { data: existingClinic, error: clinicFetchErr } = await admin
    .from("clinics")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle()
  if (clinicFetchErr) throw clinicFetchErr

  let clinicId = existingClinic?.id
  if (!clinicId) {
    const { data: insertedClinic, error: clinicInsertErr } = await admin
      .from("clinics")
      .insert({
        name: clinicName,
        slug,
        address: `100${n} Test Ave`,
        phone: `555-100-${n}`,
        email: `hello+${n}@loadtest.demo`,
        timezone: "America/Toronto",
      })
      .select("id")
      .single()
    if (clinicInsertErr || !insertedClinic) throw clinicInsertErr ?? new Error("Insert clinic failed")
    clinicId = insertedClinic.id
  }

  const { data: serviceRows, error: serviceErr } = await admin
    .from("services")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("name", "Loadtest Initial Assessment")
    .limit(1)
  if (serviceErr) throw serviceErr
  let serviceId = serviceRows?.[0]?.id
  if (!serviceId) {
    const { data: insertedService, error: insertServiceErr } = await admin
      .from("services")
      .insert({
        clinic_id: clinicId,
        name: "Loadtest Initial Assessment",
        description: "Automated load test service",
        duration_minutes: 30,
        price_cents: 9900,
        buffer_minutes: 0,
        color: "#2563eb",
        is_active: true,
        is_online_bookable: true,
      })
      .select("id")
      .single()
    if (insertServiceErr || !insertedService) {
      throw insertServiceErr ?? new Error("Insert service failed")
    }
    serviceId = insertedService.id
  }

  const { data: practitionerRows, error: practitionerErr } = await admin
    .from("practitioners")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("email", practitionerEmail)
    .limit(1)
  if (practitionerErr) throw practitionerErr
  let practitionerId = practitionerRows?.[0]?.id
  if (!practitionerId) {
    const { data: insertedPractitioner, error: insertPractitionerErr } = await admin
      .from("practitioners")
      .insert({
        clinic_id: clinicId,
        name: `Loadtest Practitioner ${n}`,
        email: practitionerEmail,
        bio: "Load testing practitioner profile",
        color: "#059669",
        slug: `loadtest-practitioner-${n}`,
        title: "Physiotherapist",
        profile_visible: true,
        is_active: true,
        accepts_online_bookings: true,
      })
      .select("id")
      .single()
    if (insertPractitionerErr || !insertedPractitioner) {
      throw insertPractitionerErr ?? new Error("Insert practitioner failed")
    }
    practitionerId = insertedPractitioner.id
  }

  await admin
    .from("practitioner_services")
    .upsert({ practitioner_id: practitionerId, service_id: serviceId }, { onConflict: "practitioner_id,service_id" })

  for (const day of [1, 2, 3, 4, 5]) {
    await admin.from("schedules").upsert(
      {
        practitioner_id: practitionerId,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      },
      { onConflict: "practitioner_id,day_of_week" }
    )
  }

  return { slug, clinicId, practitionerId, serviceId, practitionerEmail }
}

async function runBookingFlow(ctx) {
  const dateIso = nextWeekdayDateIso()
  const bookingData = await fetch(`${BASE_URL}/api/booking-data?slug=${ctx.slug}`)
  if (!bookingData.ok) throw new Error(`booking-data failed ${ctx.slug}: ${bookingData.status}`)
  const bd = await bookingData.json()
  if (!bd?.clinic?.id) throw new Error(`booking-data missing clinic for ${ctx.slug}`)

  const avUrl = new URL(`${BASE_URL}/api/availability`)
  avUrl.searchParams.set("practitionerId", ctx.practitionerId)
  avUrl.searchParams.set("serviceId", ctx.serviceId)
  avUrl.searchParams.set("date", dateIso)
  const avRes = await fetch(avUrl)
  if (!avRes.ok) throw new Error(`availability failed ${ctx.slug}: ${avRes.status}`)
  const av = await avRes.json()
  const slot = (av.slots ?? []).find((s) => s.available)
  if (!slot) throw new Error(`no available slot for ${ctx.slug} on ${dateIso}`)

  const holdRes = await fetch(`${BASE_URL}/api/hold`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      practitionerId: ctx.practitionerId,
      serviceId: ctx.serviceId,
      startDatetime: slot.start,
      endDatetime: slot.end,
    }),
  })
  if (!holdRes.ok) throw new Error(`hold failed ${ctx.slug}: ${holdRes.status}`)
  const hold = await holdRes.json()

  const bookRes = await fetch(`${BASE_URL}/api/book`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      holdId: hold.holdId,
      sessionToken: hold.sessionToken,
      firstName: "Load",
      lastName: `Tester ${ctx.slug}`,
      email: `patient+${ctx.slug}-${Date.now()}@loadtest.demo`,
      phone: null,
      notes: "Automated load and tenancy test",
    }),
  })
  if (!bookRes.ok) throw new Error(`book failed ${ctx.slug}: ${bookRes.status}`)
  const booked = await bookRes.json()
  if (!booked?.appointmentId) throw new Error(`book missing appointmentId ${ctx.slug}`)

  return { appointmentId: booked.appointmentId, slotStart: slot.start, slotEnd: slot.end }
}

async function ensurePortalAuthAndCheck(ctx, admin, publicClient, supabaseUrl) {
  const password = PASSWORD
  let userId = null

  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = (list.data?.users ?? []).find((u) => u.email?.toLowerCase() === ctx.practitionerEmail.toLowerCase())
  if (existing) {
    userId = existing.id
  } else {
    const created = await admin.auth.admin.createUser({
      email: ctx.practitionerEmail,
      password,
      email_confirm: true,
      app_metadata: { role: "practitioner" },
      user_metadata: { first_name: "Loadtest", last_name: "Practitioner" },
    })
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("failed to create practitioner auth user")
    }
    userId = created.data.user.id
  }

  const { error: linkErr } = await admin
    .from("practitioner_accounts")
    .upsert(
      { user_id: userId, practitioner_id: ctx.practitionerId, clinic_id: ctx.clinicId },
      { onConflict: "practitioner_id" }
    )
  if (linkErr) throw linkErr

  const signIn = await publicClient.auth.signInWithPassword({
    email: ctx.practitionerEmail,
    password,
  })
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error("practitioner sign-in failed")
  }

  const { data: portalRows, error: portalErr } = await publicClient
    .from("practitioner_accounts")
    .select("clinic_id, practitioner_id")
    .eq("user_id", signIn.data.user.id)
    .limit(1)
  if (portalErr) throw portalErr
  if (!portalRows?.length) throw new Error("RLS check failed: no practitioner_accounts row visible")

  const projectRef = new URL(supabaseUrl).host.split(".")[0]
  const authCookieName = `sb-${projectRef}-auth-token`
  const tokenPayload = encodeURIComponent(
    JSON.stringify([signIn.data.session.access_token, signIn.data.session.refresh_token])
  )
  const meRes = await fetch(`${BASE_URL}/api/practitioner/me`, {
    headers: {
      cookie: `${authCookieName}=${tokenPayload}`,
    },
  })

  await publicClient.auth.signOut()
  return { portalStatus: meRes.status }
}

async function main() {
  loadDotEnvLocal()
  const supabaseUrl = mustEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
  if (!publicKey) {
    throw new Error("Missing public key env: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const rows = []
  for (let i = 1; i <= CLINIC_COUNT; i += 1) {
    const publicClient = createClient(supabaseUrl, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const ctx = await ensureClinicGraph(admin, i)
    const booking = await runBookingFlow(ctx)
    const portal = await ensurePortalAuthAndCheck(ctx, admin, publicClient, supabaseUrl)
    rows.push({
      clinic: ctx.slug,
      appointmentId: booking.appointmentId,
      portalApiStatus: portal.portalStatus,
    })
    console.log(`[${ctx.slug}] booking ok (${booking.appointmentId}) | portal /api/practitioner/me -> ${portal.portalStatus}`)
  }

  const okBookings = rows.length
  const portal200 = rows.filter((r) => r.portalApiStatus === 200).length
  console.log("\n=== Multi-clinic test summary ===")
  console.log(`Clinics tested: ${okBookings}`)
  console.log(`Successful bookings: ${okBookings}/${okBookings}`)
  console.log(`Portal API 200 responses: ${portal200}/${okBookings}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
