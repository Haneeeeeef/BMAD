import { auth } from "./auth-config"

/** Validate auth token from request. Returns username or null. */
export function getAuthToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer mc_")) {
    const match = authHeader.match(/^Bearer mc_([a-z0-9]+)_/)
    return match ? match[1] : null
  }
  // Fallback: check x-auth-token header
  const xAuthToken = request.headers.get("x-auth-token")
  if (xAuthToken?.startsWith("mc_")) {
    const match = xAuthToken.match(/^mc_([a-z0-9]+)_/)
    return match ? match[1] : null
  }
  return null
}

/** Require auth - checks NextAuth session first, falls back to legacy token */
export async function requireAuth(request: Request): Promise<{ username: string } | Response> {
  // Try NextAuth session first
  const session = await auth()
  if (session?.user) {
    return { username: session.user.name || session.user.email || "user" }
  }

  // Fallback to legacy token auth
  const username = getAuthToken(request)
  if (!username) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { username }
}
