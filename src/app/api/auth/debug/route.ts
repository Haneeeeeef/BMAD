import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const clientId = process.env.AUTH_GOOGLE_ID || "NOT SET"
  const clientSecret = process.env.AUTH_GOOGLE_SECRET || "NOT SET"
  const authSecret = process.env.AUTH_SECRET || "NOT SET"
  const nextauthUrl = process.env.NEXTAUTH_URL || "NOT SET"

  return NextResponse.json({
    AUTH_GOOGLE_ID: clientId.slice(0, 15) + "..." + clientId.slice(-10),
    AUTH_GOOGLE_SECRET: clientSecret.slice(0, 8) + "..." + clientSecret.slice(-4),
    AUTH_SECRET: authSecret.length > 0 ? `set (${authSecret.length} chars)` : "NOT SET",
    NEXTAUTH_URL: nextauthUrl,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "NOT SET",
  })
}
