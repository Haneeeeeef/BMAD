import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import {
  loadCanvasFromDb,
  saveCanvasToDb,
  deleteCanvasFromDb,
  addCompletionToDb,
  acknowledgeCompletionInDb,
} from "@/lib/db/actions/canvas"

export const runtime = "nodejs"

async function getUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}

// GET /api/db/canvas?sessionId=xxx
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })

  const canvas = await loadCanvasFromDb(userId, sessionId)
  if (!canvas) return NextResponse.json(null)
  return NextResponse.json(canvas)
}

// POST /api/db/canvas — save or update canvas
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body

    if (action === "add-completion") {
      const { sessionId, agentId, reportPath } = body
      if (!sessionId || !agentId || !reportPath) {
        return NextResponse.json({ error: "sessionId, agentId, reportPath required" }, { status: 400 })
      }
      await addCompletionToDb(userId, sessionId, agentId, reportPath)
      return NextResponse.json({ ok: true })
    }

    if (action === "acknowledge-completion") {
      const { sessionId, agentId } = body
      if (!sessionId || !agentId) {
        return NextResponse.json({ error: "sessionId, agentId required" }, { status: 400 })
      }
      await acknowledgeCompletionInDb(userId, sessionId, agentId)
      return NextResponse.json({ ok: true })
    }

    // Default: save canvas data
    const { sessionId, documents, activeDocumentId, completions } = body
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })

    await saveCanvasToDb(userId, { sessionId, documents, activeDocumentId, completions })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// DELETE /api/db/canvas?sessionId=xxx
export async function DELETE(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })

  await deleteCanvasFromDb(userId, sessionId)
  return NextResponse.json({ ok: true })
}
