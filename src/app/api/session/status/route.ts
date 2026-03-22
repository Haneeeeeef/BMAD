export const runtime = "nodejs"

import { requireAuth } from "@/lib/auth"

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const sessionStatusUrl = process.env.SESSION_STATUS_URL || process.env.SESSION_CLEAR_URL?.replace('/clear', '/status')

  if (!sessionStatusUrl) {
    return new Response(
      JSON.stringify({ error: "Session status not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    // Prefer exact sessionKey lookup, fall back to sessionId substring search
    const url = new URL(request.url)
    const sessionKey = url.searchParams.get("sessionKey")
    const sessionId = url.searchParams.get("sessionId")
    const vpsUrl = sessionKey
      ? `${sessionStatusUrl}?sessionKey=${encodeURIComponent(sessionKey)}`
      : sessionId
        ? `${sessionStatusUrl}?sessionId=${sessionId}`
        : sessionStatusUrl

    const response = await fetch(vpsUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      throw new Error("Failed to get session status")
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to get session status" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
