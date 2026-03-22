import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

const OPENCLAW_URL = process.env.OPENCLAW_URL

// GET /api/context?type=project-context|memory|memory-learnings|workflow-transcript&project=bmad-workflow-for-ai&workflow=create-product-brief
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const type = url.searchParams.get("type") || "project-context"
  const project = url.searchParams.get("project")
  const workflow = url.searchParams.get("workflow")

  if (!project) {
    return NextResponse.json({ error: "project parameter required" }, { status: 400 })
  }

  try {
    // Build VPS URL with all params
    let vpsUrl = `${OPENCLAW_URL}/api/context?type=${type}&project=${encodeURIComponent(project)}`
    if (workflow) {
      vpsUrl += `&workflow=${encodeURIComponent(workflow)}`
    }

    const response = await fetch(vpsUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({
        content: null,
        exists: false,
        message: `VPS returned ${response.status}`,
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Context fetch error:", error)
    return NextResponse.json({
      content: null,
      exists: false,
      message: "Failed to connect to VPS",
    })
  }
}
