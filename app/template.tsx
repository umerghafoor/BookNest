"use client"

import type React from "react"

/**
 * App Router re-mounts this template on every navigation (unlike layout.tsx,
 * which persists), so the enter animation replays on each route change —
 * giving a lightweight, dependency-free page transition. Uses the project's
 * M3 "emphasized" easing (see tailwind `fade-in-up`). Respects
 * prefers-reduced-motion via the `motion-reduce:` variants.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up motion-reduce:animate-none motion-reduce:opacity-100">
      {children}
    </div>
  )
}
