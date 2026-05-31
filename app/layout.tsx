import type React from "react"
import type { Metadata } from "next"
import { Roboto, Roboto_Flex } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

// Material 3 typography: Roboto for body, Roboto Flex as the expressive display face
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
})

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "BookNest — Smart Book Organizer",
  description: "Manage your physical and digital books in one place",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${robotoFlex.variable}`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
