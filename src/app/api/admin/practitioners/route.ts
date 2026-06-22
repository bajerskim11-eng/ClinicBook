import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Phase 3 — admin practitioners." })
}
