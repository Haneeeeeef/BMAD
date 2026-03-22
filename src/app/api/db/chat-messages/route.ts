import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import {
  loadChatMessages,
  saveChatMessages,
  deleteChatMessages,
  deleteAllProjectChatMessages,
} from "@/lib/db/actions/chat-messages"

export const runtime = "nodejs"

async function getUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}

// GET /api/db/chat-messages?projectId=x&deliverableId=y
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  const deliverableId = req.nextUrl.searchParams.get("deliverableId")

  if (!projectId || !deliverableId) {
    return NextResponse.json({ error: "projectId and deliverableId required" }, { status: 400 })
  }

  const messages = await loadChatMessages(userId, projectId, deliverableId)
  return NextResponse.json(messages)
}

// POST /api/db/chat-messages — save messages
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, deliverableId, messages } = await req.json()
    if (!projectId || !deliverableId) {
      return NextResponse.json({ error: "projectId and deliverableId required" }, { status: 400 })
    }

    await saveChatMessages(userId, projectId, deliverableId, messages)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// DELETE /api/db/chat-messages?projectId=x&deliverableId=y
// DELETE /api/db/chat-messages?projectId=x  (all for project)
export async function DELETE(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  const deliverableId = req.nextUrl.searchParams.get("deliverableId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  if (deliverableId) {
    await deleteChatMessages(userId, projectId, deliverableId)
  } else {
    await deleteAllProjectChatMessages(userId, projectId)
  }

  return NextResponse.json({ ok: true })
}
