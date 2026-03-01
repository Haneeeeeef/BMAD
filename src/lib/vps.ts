/**
 * VPS file operations via DUFS HTTP file server.
 * Replaces the old SSH-based approach for reliability.
 */

/* ── config ─────────────────────────────────────────────── */

const VPS_FILES_URL = process.env.VPS_FILES_URL || "http://178.156.216.77:5000"
const VPS_FILES_USER = process.env.VPS_FILES_USER || "mc"
const VPS_FILES_PASS = process.env.VPS_FILES_PASS || ""

/** Basic auth header for DUFS */
function authHeader(): string {
  return "Basic " + Buffer.from(`${VPS_FILES_USER}:${VPS_FILES_PASS}`).toString("base64")
}

/** Default fetch timeout (ms) */
const TIMEOUT_MS = 15_000

/** Fetch with timeout */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/* ── input validation ───────────────────────────────────── */

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/

/** Validate a project slug (lowercase alphanumeric + hyphens) */
export function validateSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 64 && SAFE_SLUG.test(slug)
}

/** Validate a relative file path (no .., no leading /) */
export function validateRelativePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("..")) return false
  return path.split("/").every(segment => segment.length > 0 && SAFE_PATH_SEGMENT.test(segment))
}

/* ── file operations ─────────────────────────────────────── */

/** Build full URL for a project-relative path */
export function projectPath(slug: string): string {
  if (!validateSlug(slug)) throw new Error(`Invalid project slug: ${slug}`)
  return slug
}

/** Read a file from VPS. Returns file content as string. */
export async function readFile(projectSlug: string, relativePath: string): Promise<string> {
  const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}/${encodeURI(relativePath)}`
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    throw new Error(`File not found: ${relativePath} (HTTP ${res.status})`)
  }
  return res.text()
}

/** Write content to a file on VPS (creates parent dirs automatically). */
export async function writeFile(projectSlug: string, relativePath: string, content: string): Promise<void> {
  const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}/${encodeURI(relativePath)}`
  const res = await fetchWithTimeout(url, {
    method: "PUT",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "text/plain",
    },
    body: content,
  })
  if (!res.ok) {
    throw new Error(`Failed to write: ${relativePath} (HTTP ${res.status})`)
  }
}

/** Create a directory on VPS. */
export async function mkdir(projectSlug: string, relativePath: string): Promise<void> {
  const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}/${encodeURI(relativePath)}/`
  const res = await fetchWithTimeout(url, {
    method: "MKCOL",
    headers: { Authorization: authHeader() },
  })
  // 405 = already exists, which is fine
  if (!res.ok && res.status !== 405) {
    throw new Error(`Failed to mkdir: ${relativePath} (HTTP ${res.status})`)
  }
}

/** Delete a file from VPS. */
export async function deleteFile(projectSlug: string, relativePath: string): Promise<void> {
  const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}/${encodeURI(relativePath)}`
  const res = await fetchWithTimeout(url, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  })
  // 404 = already gone, which is fine
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete: ${relativePath} (HTTP ${res.status})`)
  }
}

/** DUFS directory entry from JSON listing */
export type DufsEntry = {
  path_type: "Dir" | "File" | "SymLink"
  name: string
  mtime: number
  size: number
}

/** List files in a directory on VPS. Returns array of relative paths. */
export async function listFiles(
  projectSlug: string,
  relativePath: string = "",
  opts?: { filesOnly?: boolean; pattern?: RegExp }
): Promise<string[]> {
  const pathPart = relativePath ? `/${encodeURI(relativePath)}` : ""
  const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}${pathPart}?json`
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`Failed to list: ${relativePath} (HTTP ${res.status})`)
  }
  const data = await res.json()
  const paths: DufsEntry[] = data.paths || []

  let results = paths
  if (opts?.filesOnly) {
    results = results.filter(p => p.path_type === "File")
  }
  let names = results.map(p => p.name)
  if (opts?.pattern) {
    names = names.filter(n => opts.pattern!.test(n))
  }
  return names
}

/** Recursively find files matching a pattern. */
export async function findFiles(
  projectSlug: string,
  relativePath: string,
  opts?: { pattern?: RegExp; maxDepth?: number }
): Promise<string[]> {
  const maxDepth = opts?.maxDepth ?? 5
  const results: string[] = []

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return
    const pathPart = dir ? `/${encodeURI(dir)}` : ""
    const url = `${VPS_FILES_URL}/${encodeURI(projectSlug)}${pathPart}?json`
    let res: Response
    try {
      res = await fetchWithTimeout(url, {
        headers: { Authorization: authHeader() },
      })
    } catch {
      return
    }
    if (!res.ok) return
    const data = await res.json()
    const entries: DufsEntry[] = data.paths || []

    for (const entry of entries) {
      const fullPath = dir ? `${dir}/${entry.name}` : entry.name
      if (entry.path_type === "File") {
        if (!opts?.pattern || opts.pattern.test(entry.name)) {
          results.push(fullPath)
        }
      } else if (entry.path_type === "Dir") {
        await walk(fullPath, depth + 1)
      }
    }
  }

  await walk(relativePath, 0)
  return results
}
