import type { Metadata } from "next"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/app-shell"
import { ChatProvider } from "@/contexts/chat-context"

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
            <AppShell>{children}</AppShell>
            <Toaster position="top-right" richColors expand={false} />
          </TooltipProvider>
        </ChatProvider>
      </body>
    </html>
  )
}
