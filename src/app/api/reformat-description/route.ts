export const runtime = "edge"

import { requireAuth } from "@/lib/auth"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  const kimiApiKey = process.env.KIMI_API_KEY

  if (!kimiApiKey) {
    return Response.json({ error: "AI not configured" }, { status: 500 })
  }

  try {
    const { description, title } = await request.json()

    if (!description || description.trim().length < 5) {
      return Response.json({ error: "Description too short" }, { status: 400 })
    }

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kimiApiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content: `You are a product brief editor. Take the user's rough project description and rewrite it as a clear, well-structured workspace description. Keep it concise (3-6 sentences). Cover: what it is, who it's for, and the core problem it solves. Preserve all original meaning and details — just improve clarity and structure. Return ONLY the rewritten description, nothing else.`,
          },
          {
            role: "user",
            content: title
              ? `Project: ${title}\n\nDescription: ${description}`
              : description,
          },
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      console.error("Reformat error:", response.status)
      return Response.json({ error: "AI request failed" }, { status: 502 })
    }

    const data = await response.json()
    const reformatted = data.choices?.[0]?.message?.content?.trim()

    if (!reformatted) {
      return Response.json({ error: "No result from AI" }, { status: 502 })
    }

    return Response.json({ description: reformatted })
  } catch (err) {
    console.error("Reformat error:", err)
    return Response.json({ error: "Failed to reformat" }, { status: 500 })
  }
}
