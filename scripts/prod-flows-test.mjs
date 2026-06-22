import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { performance } from "node:perf_hooks"
import { createClient } from "@supabase/supabase-js"

const BASE_URL = process.env.FLOW_BASE_URL ?? "http://localhost:3000"
const CLINICS = Number.parseInt(process.env.FLOW_CLINICS ?? "10", 10)
const ITERATIONS = Number.parseInt(process.env.FLOW_ITERATIONS ?? "30", 10)
const CONCURRENCY = Number.parseInt(process.env.FLOW_CONCURRENCY ?? "5", 10)
const CLINIC_PREFIX = process.env.FLOW_CLINIC_PREFIX ?? "loadtest-clinic-"
const PORTAL_PASSWORD = process.env.FLOW_PORTAL_PASSWORD ?? "ChangeMe_123!"

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf8")
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
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
  const v = process.env[name]?.trim() ?? ""
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

function pad2(n) {
  return String(n).padStart(2, "0")
}

function futureBusinessDate(offsetDays) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + Math.max(1, offsetDays))
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return d.toISOString().slice(0, 10)
}

function percentile(nums, p) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

async function ensurePortalUsers(admin, clinicContexts) {
  const allUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = allUsers.data?.users ?? []

  for (const ctx of clinicContexts) {
    let userId =
      users.find((u) => u.email?.toLowerCase() === ctx.practitionerEmail.toLowerCase())?.id ?? null

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email: ctx.practitionerEmail,
        password: PORTAL_PASSWORD,
        email_confirm: true,
        app_metadata: { role: "practitioner" },
      })
      if (created.error || !created.data.user) {
        throw created.error ?? new Error(`Cannot create auth user for ${ctx.slug}`)
      }
      userId = created.data.user.id
    }

    const { error: linkErr } = await admin.from("practitioner_accounts").upsert(
      {
        user_id: userId,
        practitioner_id: ctx.practitionerId,
        clinic_id: ctx.clinicId,
      },
      { onConflict: "practitioner_id" }
    )
    if (linkErr) throw linkErr
  }
}

async function getClinicContexts(admin) {
  const slugs = Array.from({ length: CLINICS }, (_, i) => `${CLINIC_PREFIX}${pad2(i + 1)}`)
  const contexts = []
  for (const slug of slugs) {
    const { data: clinic } = await admin
      .from("clinics")
      .select("id,slug")
      .eq("slug", slug)
      .maybeSingle()
    if (!clinic?.id) throw new Error(`Clinic not found: ${slug} (run multiclinic-load first)`)

    const { data: practitioner } = await admin
      .from("practitioners")
      .select("id,email")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()
    if (!practitioner?.id || !practitioner?.email) throw new Error(`No active practitioner for ${slug}`)

    contexts.push({
      slug,
      clinicId: clinic.id,
      practitionerId: practitioner.id,
      practitionerEmail: practitioner.email,
    })
  }
  return contexts
}

async function runPublicBookingFlow(ctx, stats, iterationIndex) {
  const start = performance.now()
  const spoofedIp = `10.0.${Math.floor(iterationIndex / 250) % 255}.${(iterationIndex % 250) + 1}`
  const reqHeaders = { "x-forwarded-for": spoofedIp }

  const bookingDataRes = await fetch(`${BASE_URL}/api/booking-data?slug=${ctx.slug}`, {
    headers: reqHeaders,
  })
  if (!bookingDataRes.ok) throw new Error(`booking-data ${bookingDataRes.status}`)
  const bookingData = await bookingDataRes.json()
  const service = (bookingData.services ?? [])[0]
  const practitioner = (bookingData.practitioners ?? [])[0]
  if (!service?.id || !practitioner?.id) {
    throw new Error("booking-data missing service/practitioner")
  }

  const date = futureBusinessDate((iterationIndex % 10) + 1)
  const avUrl = new URL(`${BASE_URL}/api/availability`)
  avUrl.searchParams.set("practitionerId", practitioner.id)
  avUrl.searchParams.set("serviceId", service.id)
  avUrl.searchParams.set("date", date)
  const availabilityRes = await fetch(avUrl, { headers: reqHeaders })
  if (!availabilityRes.ok) throw new Error(`availability ${availabilityRes.status}`)
  const availability = await availabilityRes.json()
  const slot = (availability.slots ?? []).find((s) => s.available)
  if (!slot) throw new Error("no available slot")

  const holdRes = await fetch(`${BASE_URL}/api/hold`, {
    method: "POST",
    headers: { "content-type": "application/json", ...reqHeaders },
    body: JSON.stringify({
      practitionerId: practitioner.id,
      serviceId: service.id,
      startDatetime: slot.start,
      endDatetime: slot.end,
    }),
  })
  if (holdRes.status === 409) {
    stats.publicLatency.push(Math.round(performance.now() - start))
    return "conflict"
  }
  if (!holdRes.ok) throw new Error(`hold ${holdRes.status}`)
  const hold = await holdRes.json()

  const bookRes = await fetch(`${BASE_URL}/api/book`, {
    method: "POST",
    headers: { "content-type": "application/json", ...reqHeaders },
    body: JSON.stringify({
      holdId: hold.holdId,
      sessionToken: hold.sessionToken,
      firstName: "Perf",
      lastName: "Patient",
      email: `perf+${ctx.slug}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}@loadtest.demo`,
      phone: null,
      notes: "prod flow test",
    }),
  })
  if (bookRes.status === 409) {
    stats.publicLatency.push(Math.round(performance.now() - start))
    return "conflict"
  }
  if (!bookRes.ok) throw new Error(`book ${bookRes.status}`)
  const booked = await bookRes.json()
  if (!booked.appointmentId) throw new Error("missing appointmentId")

  const appointmentRes = await fetch(`${BASE_URL}/api/appointments/${booked.appointmentId}`)
  if (!appointmentRes.ok) throw new Error(`appointment-get ${appointmentRes.status}`)

  stats.publicLatency.push(Math.round(performance.now() - start))
  return "success"
}

async function runPractitionerRlsFlow(ctx, supabaseUrl, publicKey, stats) {
  const start = performance.now()
  const client = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const signIn = await client.auth.signInWithPassword({
    email: ctx.practitionerEmail,
    password: PORTAL_PASSWORD,
  })
  if (signIn.error || !signIn.data.user) throw signIn.error ?? new Error("sign in failed")

  const uid = signIn.data.user.id
  const portalRow = await client
    .from("practitioner_accounts")
    .select("clinic_id,practitioner_id")
    .eq("user_id", uid)
    .maybeSingle()
  if (portalRow.error || !portalRow.data) {
    throw portalRow.error ?? new Error("no practitioner_accounts row")
  }

  const appts = await client
    .from("appointments")
    .select("id,clinic_id,practitioner_id,start_datetime")
    .eq("practitioner_id", ctx.practitionerId)
    .order("start_datetime", { ascending: false })
    .limit(5)
  if (appts.error) throw appts.error

  await client.auth.signOut()
  stats.portalLatency.push(Math.round(performance.now() - start))
}

async function main() {
  loadDotEnvLocal()

  const supabaseUrl = mustEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRole = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
  if (!publicKey) throw new Error("Missing public key env")

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const clinicContexts = await getClinicContexts(admin)
  await ensurePortalUsers(admin, clinicContexts)

  const stats = {
    publicOk: 0,
    publicFail: 0,
    publicConflict: 0,
    publicNoSlot: 0,
    portalOk: 0,
    portalFail: 0,
    publicLatency: [],
    portalLatency: [],
  }

  const jobs = Array.from({ length: ITERATIONS }, (_, i) => clinicContexts[i % clinicContexts.length])
  let pointer = 0
  async function worker() {
    while (pointer < jobs.length) {
      const index = pointer
      pointer += 1
      const ctx = jobs[index]
      try {
        const outcome = await runPublicBookingFlow(ctx, stats, index)
        if (outcome === "success") stats.publicOk += 1
        else stats.publicConflict += 1
      } catch (err) {
        if (err.message === "no available slot") {
          stats.publicNoSlot += 1
        } else {
          stats.publicFail += 1
          console.error(`[public][${ctx.slug}] ${err.message}`)
        }
      }

      try {
        await runPractitionerRlsFlow(ctx, supabaseUrl, publicKey, stats)
        stats.portalOk += 1
      } catch (err) {
        stats.portalFail += 1
        console.error(`[portal-rls][${ctx.slug}] ${err.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()))

  console.log("\n=== Prod flow summary ===")
  console.log(`Clinics configured: ${clinicContexts.length}`)
  console.log(`Iterations: ${ITERATIONS} (concurrency ${CONCURRENCY})`)
  console.log(`Public booking flow success: ${stats.publicOk}/${ITERATIONS}`)
  console.log(`Public booking flow conflicts (expected under contention): ${stats.publicConflict}/${ITERATIONS}`)
  console.log(`Public booking flow no-slot outcomes: ${stats.publicNoSlot}/${ITERATIONS}`)
  console.log(`Practitioner RLS flow success: ${stats.portalOk}/${ITERATIONS}`)
  console.log(
    `Public latency ms p50/p95/max: ${percentile(stats.publicLatency, 50)}/${percentile(stats.publicLatency, 95)}/${Math.max(...stats.publicLatency, 0)}`
  )
  console.log(
    `Portal latency ms p50/p95/max: ${percentile(stats.portalLatency, 50)}/${percentile(stats.portalLatency, 95)}/${Math.max(...stats.portalLatency, 0)}`
  )
  if (stats.publicFail || stats.portalFail) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
