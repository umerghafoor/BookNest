import type React from "react"
import type { Metadata, Viewport } from "next"
import { Roboto, Roboto_Flex } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { BottomNav } from "@/components/bottom-nav"

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
  applicationName: "BookNest",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookNest",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6750a4" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b1f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // extend under notches; pair with safe-area insets
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
            <BottomNav />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
