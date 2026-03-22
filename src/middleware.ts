export { auth as middleware } from "@/lib/auth-config"

export const config = {
  matcher: [
    // Protect all routes except public ones
    "/((?!api|_next/static|_next/image|favicon.ico|login|$).*)",
  ],
}
