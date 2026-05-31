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
      {/* Spacer reserves layout height so the floating bar never overlaps page
          content (mobile only, and only while signed in). Accounts for the bar
          height plus its bottom gap and the safe-area inset. */}
      <div
        className="md:hidden"
        style={{ height: "calc(5.25rem + env(safe-area-inset-bottom))" }}
        aria-hidden
      />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 z-50 mx-auto max-w-md rounded-[1.75rem] border border-primary/20 bg-primary-container px-2 text-on-primary-container shadow-xl shadow-black/10 backdrop-blur-sm backdrop-saturate-150 supports-[backdrop-filter]:bg-primary-container/60 md:hidden"
        style={{
          left: "max(1rem, env(safe-area-inset-left))",
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          // NOTE: deliberately no `transform` / `will-change: transform` here.
          // Both promote the bar to its own composited layer, which creates a
          // containing block that clips `backdrop-filter` and silently kills
          // the blur. The fixed bar stays put without them.
        }}
      >
      <ul className="flex items-stretch justify-around">
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
                  className="m3-state-layer -mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform duration-200 ease-emphasized hover:scale-105 active:scale-95"
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
                className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-300 ease-emphasized ${
                  isActive ? "text-on-primary-container" : "text-on-primary-container/60"
                }`}
              >
                {/* Active state: a colored pill behind the icon, with the label
                    in the same accent color below it. Equal-width slots keep the
                    bar balanced. */}
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300 ease-emphasized ${
                    isActive ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={isActive ? "text-primary" : ""}>{tab.label}</span>
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
