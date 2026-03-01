/**
 * Safe localStorage wrapper that handles:
 * - Safari private browsing (throws on setItem)
 * - Quota exceeded errors
 * - SSR environments (no window)
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Get the auth token from localStorage for API requests */
export function getAuthToken(): string | null {
  const stored = safeGetItem("mc_user")
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed.token || null
  } catch {
    return null
  }
}

/** Get headers object with auth token for fetch calls to /api/* routes */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    ...extra,
  }
  if (token) {
    headers["x-auth-token"] = token
  }
  return headers
}
