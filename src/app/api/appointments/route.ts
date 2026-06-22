import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Phase 2/3 — list appointments." })
}
