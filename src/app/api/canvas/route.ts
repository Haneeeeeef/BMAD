export const runtime = "edge"

import { requireAuth } from "@/lib/auth"

// In-memory store (resets on deploy, but fine for MVP)
// For production, use Redis or database
const canvasStore = new Map<string, CanvasData>()

interface CanvasData {
  sessionId: string
  content: string
  status: "draft" | "awaiting_approval" | "approved"
  sections?: Record<string, string>
  updatedAt: number
}

// POST /api/canvas - Jarvis pushes canvas content
export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const data: CanvasData = await request.json()

    if (!data.sessionId || !data.content) {
      return new Response(
        JSON.stringify({ error: "sessionId and content required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Store with timestamp
    canvasStore.set(data.sessionId, {
      ...data,
      updatedAt: Date.now(),
    })

    return new Response(
      JSON.stringify({ success: true, sessionId: data.sessionId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
}

// GET /api/canvas?sessionId=xxx - Frontend polls for canvas data
export async function GET(request: Request) {
  const authGet = requireAuth(request)
  if (authGet instanceof Response) return authGet

  const url = new URL(request.url)
  const sessionId = url.searchParams.get("sessionId")

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "sessionId required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const data = canvasStore.get(sessionId)

  if (!data) {
    return new Response(
      JSON.stringify({ exists: false }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response(
    JSON.stringify({ exists: true, ...data }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}
