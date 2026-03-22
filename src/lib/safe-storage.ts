/**
 * Safe localStorage wrapper — only used for ephemeral client-side state
 * (e.g., project creation drafts). All persistent data is in MongoDB.
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

/** Get headers for fetch calls — auth is handled by NextAuth cookies automatically */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...extra }
}
