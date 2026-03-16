/**
 * GET /api/health — diagnostic endpoint for production debugging
 * Returns connectivity status for all external services
 */
export const runtime = "nodejs"

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      VPS_FILES_URL: process.env.VPS_FILES_URL ? "✅ set" : "❌ missing",
      VPS_FILES_USER: process.env.VPS_FILES_USER ? "✅ set" : "❌ missing",
      VPS_FILES_PASS: process.env.VPS_FILES_PASS ? "✅ set" : "❌ missing",
      OPENCLAW_URL: process.env.OPENCLAW_URL ? "✅ set" : "❌ missing",
      OPENCLAW_TOKEN: process.env.OPENCLAW_TOKEN ? "✅ set" : "❌ missing",
      NEXT_PUBLIC_PROOF_URL: process.env.NEXT_PUBLIC_PROOF_URL || "❌ missing",
      SESSION_STATUS_URL: process.env.SESSION_STATUS_URL ? "✅ set" : "❌ missing",
      SESSION_CLEAR_URL: process.env.SESSION_CLEAR_URL ? "✅ set" : "❌ missing",
    },
  }

  // Test VPS DUFS connectivity
  const vpsUrl = process.env.VPS_FILES_URL
  const vpsUser = process.env.VPS_FILES_USER
  const vpsPass = process.env.VPS_FILES_PASS
  if (vpsUrl && vpsUser && vpsPass) {
    try {
      const auth = "Basic " + Buffer.from(`${vpsUser}:${vpsPass}`).toString("base64")
      const res = await fetch(`${vpsUrl}/?json`, {
        headers: { Authorization: auth },
        signal: AbortSignal.timeout(5000),
      })
      results.vps_dufs = {
        status: res.status,
        ok: res.ok,
        url: vpsUrl,
      }
      if (res.ok) {
        const data = await res.json()
        results.vps_dufs_projects = (data.paths || []).map((p: { name: string }) => p.name).slice(0, 10)
      }
    } catch (err) {
      results.vps_dufs = {
        error: err instanceof Error ? err.message : "Unknown error",
        url: vpsUrl,
      }
    }
  }

  // Test OpenClaw connectivity
  const ocUrl = process.env.OPENCLAW_URL
  const ocToken = process.env.OPENCLAW_TOKEN
  if (ocUrl && ocToken) {
    try {
      const res = await fetch(`${ocUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${ocToken}` },
        signal: AbortSignal.timeout(5000),
      })
      results.openclaw = {
        status: res.status,
        ok: res.ok,
        url: ocUrl,
      }
    } catch (err) {
      results.openclaw = {
        error: err instanceof Error ? err.message : "Unknown error",
        url: ocUrl,
      }
    }
  }

  // Test Proof connectivity
  const proofUrl = process.env.NEXT_PUBLIC_PROOF_URL
  if (proofUrl) {
    try {
      const res = await fetch(proofUrl, {
        signal: AbortSignal.timeout(5000),
      })
      results.proof = {
        status: res.status,
        ok: res.ok,
        url: proofUrl,
      }
    } catch (err) {
      results.proof = {
        error: err instanceof Error ? err.message : "Unknown error",
        url: proofUrl,
      }
    }
  }

  return Response.json(results, { status: 200 })
}
