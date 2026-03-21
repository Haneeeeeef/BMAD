import { NextRequest, NextResponse } from "next/server"

const PROOF_URL = process.env.PROOF_URL || process.env.NEXT_PUBLIC_PROOF_URL
const PROOF_API_TOKEN = process.env.PROOF_API_TOKEN || ""

// POST /api/proof — create doc, add comment, add suggestion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "publish": {
        // Publish artifact to Proof as a new document
        const { markdown, title, agentId } = body
        if (!markdown || !title) {
          return NextResponse.json({ error: "markdown and title required" }, { status: 400 })
        }

        const res = await fetch(`${PROOF_URL}/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(PROOF_API_TOKEN ? { Authorization: `Bearer ${PROOF_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            markdown,
            title,
            role: "commenter",
            ownerId: agentId ? `agent:${agentId}` : "agent:mc",
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          return NextResponse.json({ error: `Proof error: ${text}` }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json({
          slug: data.slug,
          url: data.shareUrl || data.url,
          tokenUrl: data.tokenUrl,
          accessToken: data.accessToken,
          ownerSecret: data.ownerSecret,
        })
      }

      case "comment": {
        // Add a review comment (Jarvis feedback)
        const { slug, token, quote, text, agentId: commentAgent } = body
        if (!slug || !text) {
          return NextResponse.json({ error: "slug and text required" }, { status: 400 })
        }

        const res = await fetch(`${PROOF_URL}/documents/${slug}/ops?token=${token || PROOF_API_TOKEN}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Id": commentAgent || "jarvis",
          },
          body: JSON.stringify({
            type: "comment.add",
            by: `ai:${commentAgent || "jarvis"}`,
            quote: quote || "",
            text,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          return NextResponse.json({ error: `Proof comment error: ${errText}` }, { status: res.status })
        }

        return NextResponse.json({ success: true })
      }

      case "suggestion": {
        // Add a suggestion (recommended fix)
        const { slug, token, quote, replacement, agentId: suggestAgent } = body
        if (!slug || !quote || !replacement) {
          return NextResponse.json({ error: "slug, quote, and replacement required" }, { status: 400 })
        }

        const res = await fetch(`${PROOF_URL}/documents/${slug}/ops?token=${token || PROOF_API_TOKEN}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Id": suggestAgent || "jarvis",
          },
          body: JSON.stringify({
            type: "suggestion.add",
            by: `ai:${suggestAgent || "jarvis"}`,
            quote,
            replacement,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          return NextResponse.json({ error: `Proof suggestion error: ${errText}` }, { status: res.status })
        }

        return NextResponse.json({ success: true })
      }

      case "read": {
        // Read document state
        const { slug, token } = body
        if (!slug) {
          return NextResponse.json({ error: "slug required" }, { status: 400 })
        }

        const res = await fetch(`${PROOF_URL}/documents/${slug}/state`, {
          headers: {
            Authorization: `Bearer ${token || PROOF_API_TOKEN}`,
          },
        })

        if (!res.ok) {
          return NextResponse.json({ error: "Failed to read document" }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("[proof] Error:", msg, "PROOF_URL:", PROOF_URL)
    return NextResponse.json({ error: `Internal server error: ${msg}`, proofUrl: PROOF_URL }, { status: 500 })
  }
}
