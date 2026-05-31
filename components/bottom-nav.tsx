"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Library, Plus, Globe, User } from "lucide-react"
import { QuickProgressDialog } from "@/components/quick-progress-dialog"

const tabs = [
  { href: "/dashboard", label: "Home", icon: BarChart3 },
  { href: "/library", label: "Library", icon: Library },
  { href: "/add-book", label: "Add", icon: Plus, primary: true },
  { href: "/discover", label: "Discover", icon: Globe },
  { href: "/profile", label: "Profile", icon: User },
] as const

/**
 * Native-app-style bottom tab bar. Mobile only (hidden at md+, where the top
 * Navigation takes over), and only when a user is signed in. The center "Add"
 * tab is rendered as an elevated FAB-style button.
 */
export function BottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [quickOpen, setQuickOpen] = useState(false)

  if (!user) return null

  return (
    <>
      {/* Spacer reserves layout height so fixed bar never overlaps page content
          (mobile only, and only while signed in). */}
      <div
        className="md:hidden"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
        aria-hidden
      />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          // Promote to its own GPU layer so mobile pull-to-refresh / scroll
          // bounce can't repaint or displace the pinned bar.
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href

          if (tab.primary) {
            return (
              <li key={tab.href} className="flex items-end">
                <button
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  aria-label="Log reading progress"
                  className="m3-state-layer -mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 ease-emphasized active:scale-95"
                >
                  <Icon className="h-6 w-6" />
                </button>
              </li>
            )
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-primary-container text-on-primary-container" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      </nav>

      <QuickProgressDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  )
}
