"use client"

import { useEffect } from "react"

/**
 * Registers the PWA service worker once on mount. Registration is skipped in
 * development so the SW cache doesn't interfere with hot reloading.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[BookNest] Service worker registration failed:", err)
      })
    }

    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
