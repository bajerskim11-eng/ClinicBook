/**
 * Requires dev server: npm run dev
 * Usage: npm run smoke
 * Optional: SMOKE_BASE=http://127.0.0.1:3000 npm run smoke
 */

const base = process.env.SMOKE_BASE ?? "http://localhost:3000"

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

async function main() {
  const checks = [
    ["/", 200],
    ["/auth/login", 200],
    ["/book/demo-clinic", 200],
  ]

  for (const [path, expect] of checks) {
    const res = await fetch(new URL(path, base))
    const ok = res.status === expect
    console.log(`${path} -> ${res.status} ${ok ? "OK" : "FAIL"}`)
    if (!ok) fail(`Expected ${expect}, got ${res.status} for ${path}`)
  }

  const dash = await fetch(new URL("/dashboard", base), { redirect: "manual" })
  const loc = dash.headers.get("location") ?? ""
  const redirectOk =
    dash.status >= 300 &&
    dash.status < 400 &&
    loc.includes("/auth/login")
  console.log(
    `/dashboard -> ${dash.status} location=${loc} ${redirectOk ? "OK" : "FAIL"}`
  )
  if (!redirectOk) {
    fail("Expected 3xx redirect from /dashboard to /auth/login when logged out")
  }

  // Phase 2 — optional: set SMOKE_PRACTITIONER_ID, SMOKE_SERVICE_ID, SMOKE_BOOKING_DATE (yyyy-MM-dd)
  const pid = process.env.SMOKE_PRACTITIONER_ID
  const sid = process.env.SMOKE_SERVICE_ID
  const bookDate = process.env.SMOKE_BOOKING_DATE
  if (pid && sid && bookDate) {
    const av = new URL("/api/availability", base)
    av.searchParams.set("practitionerId", pid)
    av.searchParams.set("serviceId", sid)
    av.searchParams.set("date", bookDate)
    const ar = await fetch(av)
    const aj = await ar.json()
    const hasSlots = Array.isArray(aj.slots)
    console.log(
      `/api/availability (Phase 2) -> ${ar.status} slots=${hasSlots ? aj.slots.length : "n/a"} ${ar.status === 200 && hasSlots ? "OK" : "FAIL"}`
    )
    if (ar.status !== 200 || !hasSlots) {
      fail("Availability API should return 200 with slots array")
    }
    const available = aj.slots.filter((s) => s.available)
    console.log(`  available slot count: ${available.length}`)
  } else {
    console.log(
      "(Skip Phase 2 API check: set SMOKE_PRACTITIONER_ID, SMOKE_SERVICE_ID, SMOKE_BOOKING_DATE)"
    )
  }

  console.log("\nAll smoke checks passed.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
