import { NextRequest, NextResponse } from "next/server"
import { getFileType, type ExtractedFile } from "@/lib/file-extraction"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileType = getFileType(file.name)
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let content = ""
    let pages: number | undefined
    let words: number | undefined

    switch (fileType) {
      case "pdf": {
        // Use pdfjs-dist for PDF extraction
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
        const data = new Uint8Array(buffer)
        const doc = await pdfjsLib.getDocument({ data }).promise
        pages = doc.numPages

        const textParts: string[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
          textParts.push(pageText)
        }
        content = textParts.join("\n\n")
        words = content.split(/\s+/).filter(Boolean).length
        break
      }

      case "docx": {
        const mammoth = await import("mammoth")
        const result = await mammoth.extractRawText({ buffer })
        content = result.value
        words = content.split(/\s+/).filter(Boolean).length
        break
      }

      case "xlsx": {
        // For Excel, return placeholder - can add xlsx package later
        content = `[Excel file: ${file.name}]\n\nSpreadsheet data extraction pending.`
        break
      }

      case "image": {
        // For images, return description placeholder
        // TODO: Integrate with vision model for actual description
        content = `[Image: ${file.name}]\n\nImage uploaded. Visual content will be analyzed for context.`
        break
      }

      case "markdown":
      case "text": {
        content = buffer.toString("utf-8")
        words = content.split(/\s+/).filter(Boolean).length
        break
      }
    }

    const extracted: ExtractedFile = {
      filename: file.name,
      type: fileType,
      content,
      metadata: {
        pages,
        words,
        extractedAt: Date.now(),
      },
    }

    return NextResponse.json(extracted)
  } catch (error) {
    console.error("Extraction error:", error)
    return NextResponse.json(
      { error: "Failed to extract file content" },
      { status: 500 }
    )
  }
}
