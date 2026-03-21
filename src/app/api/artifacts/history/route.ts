import { NextRequest, NextResponse } from "next/server"

const GIT_API_URL = process.env.GIT_API_URL

// GET /api/artifacts/history?project=slug&path=artifacts/planning/product-brief.md
export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project")
  const filePath = request.nextUrl.searchParams.get("path")
  const limit = request.nextUrl.searchParams.get("limit") || "20"

  if (!project || !filePath) {
    return NextResponse.json({ error: "project and path required" }, { status: 400 })
  }

  try {
    const fullPath = `${project}/${filePath}`
    const res = await fetch(`${GIT_API_URL}/log?path=${encodeURIComponent(fullPath)}&limit=${limit}`)
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch history" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[artifacts/history] Error:", error)
    return NextResponse.json({ error: "Git API unreachable" }, { status: 503 })
  }
}

// POST /api/artifacts/history — get specific version content or diff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, project, path: filePath, hash, from, to } = body

    if (!project || !filePath) {
      return NextResponse.json({ error: "project and path required" }, { status: 400 })
    }

    const fullPath = `${project}/${filePath}`

    if (action === "show") {
      if (!hash) return NextResponse.json({ error: "hash required" }, { status: 400 })
      const res = await fetch(`${GIT_API_URL}/show?hash=${hash}&path=${encodeURIComponent(fullPath)}`)
      if (!res.ok) return NextResponse.json({ error: "Version not found" }, { status: 404 })
      return NextResponse.json(await res.json())
    }

    if (action === "diff") {
      if (!from) return NextResponse.json({ error: "from hash required" }, { status: 400 })
      const res = await fetch(`${GIT_API_URL}/diff?from=${from}&to=${to || "HEAD"}&path=${encodeURIComponent(fullPath)}`)
      if (!res.ok) return NextResponse.json({ error: "Diff failed" }, { status: 500 })
      return NextResponse.json(await res.json())
    }

    if (action === "commit") {
      const message = body.message || "human: updated document"
      const res = await fetch(`${GIT_API_URL}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) return NextResponse.json({ error: "Commit failed" }, { status: 500 })
      return NextResponse.json(await res.json())
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error("[artifacts/history] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
