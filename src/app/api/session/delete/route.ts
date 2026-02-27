export const runtime = "edge"

export async function POST(request: Request) {
  const sessionDeleteUrl = process.env.SESSION_DELETE_URL ||
    process.env.SESSION_CLEAR_URL?.replace('/clear', '/delete')

  if (!sessionDeleteUrl) {
    return new Response(
      JSON.stringify({ error: "Session delete not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const response = await fetch(sessionDeleteUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })

    if (!response.ok) {
      throw new Error("Failed to delete session")
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to delete session" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
