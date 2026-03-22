import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/db/actions/projects"

export const runtime = "nodejs"

async function getUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}

// GET /api/db/projects?id=xxx  — single project
// GET /api/db/projects          — all projects
export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")

  if (id) {
    const project = await getProjectById(userId, id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  }

  const projects = await listProjects(userId)
  return NextResponse.json(projects)
}

// POST /api/db/projects — create project
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const project = await createProject(userId, body)
    return NextResponse.json(project, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// PUT /api/db/projects — update project
export async function PUT(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const project = await updateProject(userId, id, updates)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

// DELETE /api/db/projects?id=xxx
export async function DELETE(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const deleted = await deleteProject(userId, id)
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
