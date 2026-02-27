import type { Metadata } from "next"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ChatProvider } from "@/contexts/chat-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthenticatedLayout } from "@/components/authenticated-layout"

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
        <ChatProvider>
          <TooltipProvider>
            <AuthProvider>
              <AuthenticatedLayout>{children}</AuthenticatedLayout>
            </AuthProvider>
            <Toaster position="top-right" closeButton expand={false} />
          </TooltipProvider>
        </ChatProvider>
      </body>
    </html>
  )
}
