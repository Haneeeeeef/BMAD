export const runtime = "edge"

// Fetch artifacts from VPS via OpenClaw proxy
export async function GET(request: Request) {
  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return new Response(JSON.stringify({ error: "OpenClaw not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const url = new URL(request.url)
    const filePath = url.searchParams.get("path")

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Path required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validate path is within allowed directories
    if (!filePath.includes("planning-artifacts") && !filePath.includes("implementation-artifacts")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Ask Jarvis to read the file via chat API
    // This is a workaround - ideally OpenClaw would have a file read endpoint
    const response = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openclawToken}`,
      },
      body: JSON.stringify({
        model: "openclaw:jarvis",
        messages: [
          {
            role: "user",
            content: `Read and output the complete contents of this file with no commentary: ${filePath}`,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch artifact")
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    return new Response(JSON.stringify({ content, path: filePath }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch artifact" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// List artifacts in planning-artifacts folder
export async function POST(request: Request) {
  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return new Response(JSON.stringify({ error: "OpenClaw not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { projectPath } = await request.json()

    // Ask Jarvis to list files in planning-artifacts
    const response = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openclawToken}`,
      },
      body: JSON.stringify({
        model: "openclaw:jarvis",
        messages: [
          {
            role: "user",
            content: `List all files in the planning-artifacts folder as a JSON array of filenames only, no other text: ${projectPath || "/home/haneef/workspaces/jarvis"}/planning-artifacts/`,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to list artifacts")
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "[]"

    // Try to parse as JSON array
    try {
      const files = JSON.parse(content)
      return new Response(JSON.stringify({ files }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      // If not valid JSON, return raw content
      return new Response(JSON.stringify({ files: [], raw: content }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to list artifacts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
