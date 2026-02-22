export const runtime = "edge"

interface TitleRequest {
  userMessage: string
  assistantMessage: string
}

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
    const { userMessage, assistantMessage }: TitleRequest = await request.json()

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
            content: `TASK: Generate a 2-5 word title for this conversation.
RULES: Output ONLY the title. No explanation. No punctuation. No quotes.

Example outputs:
- Mobile App Planning
- Database Architecture
- React Performance Issues

Conversation:
User: ${userMessage}
Assistant: ${assistantMessage.substring(0, 300)}

TITLE:`,
          },
        ],
        max_tokens: 15,
        temperature: 0.3,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || "New Chat"

    return new Response(JSON.stringify({ title }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return new Response(JSON.stringify({ title: "New Chat" }), {
      headers: { "Content-Type": "application/json" },
    })
  }
}
