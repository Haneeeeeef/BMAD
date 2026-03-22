import { NextRequest, NextResponse } from "next/server"
import {
  generateSourcesIndex,
  generateContext,
  generateSourceMarkdown,
  toSafeFilename,
} from "@/lib/context-generator"
import type { ExtractedFile } from "@/lib/file-extraction"
import * as vps from "@/lib/vps"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const {
      projectId,
      projectName,
      description,
      files,
    }: {
      projectId: string
      projectName: string
      description: string
      files: ExtractedFile[]
    } = body

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
    }

    // Generate safe project folder name
    const projectSlug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || projectId

    const results: { file: string; status: string }[] = []

    // Create directory structure
    try {
      await vps.mkdir(projectSlug, "memory/sources")
      results.push({ file: "directories", status: "created" })
    } catch (err) {
      console.error("Failed to create directories:", err)
      return NextResponse.json(
        { error: "Failed to create project directories on VPS" },
        { status: 500 }
      )
    }

    // Generate and write context.md
    const contextContent = generateContext(projectName, description, files)
    try {
      await vps.writeFile(projectSlug, "memory/context.md", contextContent)
      results.push({ file: "context.md", status: "written" })
    } catch (err) {
      console.error("Failed to write context.md:", err)
      results.push({ file: "context.md", status: "failed" })
    }

    // Generate and write sources-index.md
    const indexContent = generateSourcesIndex(files)
    try {
      await vps.writeFile(projectSlug, "memory/sources-index.md", indexContent)
      results.push({ file: "sources-index.md", status: "written" })
    } catch (err) {
      console.error("Failed to write sources-index.md:", err)
      results.push({ file: "sources-index.md", status: "failed" })
    }

    // Write individual source files
    for (const file of files) {
      const safeFilename = toSafeFilename(file.filename)
      const sourceContent = generateSourceMarkdown(file)
      try {
        await vps.writeFile(projectSlug, `memory/sources/${safeFilename}`, sourceContent)
        results.push({ file: `sources/${safeFilename}`, status: "written" })
      } catch (err) {
        console.error(`Failed to write ${safeFilename}:`, err)
        results.push({ file: `sources/${safeFilename}`, status: "failed" })
      }
    }

    return NextResponse.json({
      success: true,
      projectSlug,
      results,
    })
  } catch (error) {
    console.error("Context generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate context" },
      { status: 500 }
    )
  }
}
