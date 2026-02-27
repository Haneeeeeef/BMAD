export const runtime = "edge"

// Generate deterministic token from username
function generateToken(username: string): string {
  // Simple hash - in production use proper crypto
  const base = process.env.OPENCLAW_TOKEN || "default"
  // Create a user-specific token by hashing username with base token
  const combined = `${base}:user:${username}`
  // For now, return a deterministic token format
  // OpenClaw will need this token registered
  return `mc_${username}_${hashCode(combined)}`
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Username required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, "")

    if (cleanUsername.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Username must be at least 2 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const token = generateToken(cleanUsername)

    // TODO: Register token with OpenClaw if not already registered
    // For now, we'll use the base token for all users but track user in localStorage
    // Full implementation would register unique tokens per user

    return new Response(
      JSON.stringify({
        success: true,
        username: cleanUsername,
        token: token,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Login failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
