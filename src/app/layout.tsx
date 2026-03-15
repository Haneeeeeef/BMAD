import type { Metadata } from "next"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ChatProvider } from "@/contexts/chat-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { QueryProvider } from "@/providers/query-provider"

export const metadata: Metadata = {
  title: "Mission Control | BMAD",
  description: "AI-powered development orchestration",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md">
          Skip to main content
        </a>
        <QueryProvider>
          <ChatProvider>
            <TooltipProvider>
              <AuthProvider>
                <AuthenticatedLayout>{children}</AuthenticatedLayout>
              </AuthProvider>
              <Toaster position="top-right" closeButton expand={false} />
            </TooltipProvider>
          </ChatProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
