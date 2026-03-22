export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDb } from "@/lib/db/client"

// Temporary inbox collection — agents POST artifacts here,
// the frontend polls and consumes them (deletes after read).
// This replaces the old in-memory Map that reset on deploy.

async function getInboxCollection() {
  const db = await getDb()
  return db.collection("bmad_canvas_inbox")
}

// POST /api/canvas — Agent pushes canvas content
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const data = await request.json()

    if (!data.sessionId || !data.content) {
      return NextResponse.json({ error: "sessionId and content required" }, { status: 400 })
    }

    const col = await getInboxCollection()

    // Upsert by sessionId + identifier to prevent duplicates
    const key = { sessionId: data.sessionId, identifier: data.identifier || "api-document" }
    await col.updateOne(
      key,
      { $set: { ...data, updatedAt: Date.now() } },
      { upsert: true }
    )

    return NextResponse.json({ success: true, sessionId: data.sessionId })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

// GET /api/canvas?sessionId=xxx — Frontend polls for new artifacts
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const sessionId = request.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 })
  }

  const col = await getInboxCollection()
  const data = await col.findOne({ sessionId })

  if (!data) {
    return NextResponse.json({ exists: false })
  }

  // Consume: delete after read to prevent duplicate processing
  await col.deleteOne({ _id: data._id })

  return NextResponse.json({ exists: true, ...data })
}
