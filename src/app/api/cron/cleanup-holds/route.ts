import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/admin"

export const runtime = "nodejs"

function authorizeCron(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date().toISOString()
  const { data, error } = await adminSupabase
    .from("slot_holds")
    .delete()
    .lt("expires_at", now)
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    deleted: data?.length ?? 0,
    timestamp: now,
  })
}
