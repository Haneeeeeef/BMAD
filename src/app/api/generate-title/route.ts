export const runtime = "edge"

interface TitleRequest {
  userMessage: string
  assistantMessage?: string
}

export async function POST(request: Request) {
  const kimiApiKey = process.env.KIMI_API_KEY

  try {
    const { userMessage }: TitleRequest = await request.json()

    if (!userMessage || userMessage.trim().length < 3) {
      return new Response(JSON.stringify({ title: "New Chat" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // If Kimi API key not configured, use fallback
    if (!kimiApiKey) {
      return new Response(JSON.stringify({ title: fallbackTitle(userMessage) }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    // Use Kimi K2.5 directly via Moonshot API
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
            content: "Generate a concise 3-5 word title for this chat. Return ONLY the title text, nothing else.",
          },
          {
            role: "user",
            content: userMessage.slice(0, 500),
          },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error("Kimi title error:", response.status, await response.text())
      return new Response(JSON.stringify({ title: fallbackTitle(userMessage) }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const data = await response.json()
    let title = data.choices?.[0]?.message?.content?.trim() || fallbackTitle(userMessage)

    // Clean up: remove quotes if present
    title = title.replace(/^["']|["']$/g, "")

    return new Response(JSON.stringify({ title }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Title generation error:", err)
    return new Response(JSON.stringify({ title: "New Chat" }), {
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Fallback: extract keywords when MiniMax unavailable
function fallbackTitle(message: string): string {
  const stopWords = new Set([
    "i", "me", "my", "we", "our", "you", "your", "the", "a", "an", "and", "or",
    "is", "are", "was", "were", "be", "to", "of", "in", "for", "on", "with",
    "want", "need", "help", "please", "can", "how", "what", "this", "that",
  ])

  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 4)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))

  return words.length > 0 ? words.join(" ") : "New Chat"
}
