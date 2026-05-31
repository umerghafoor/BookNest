"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { loadUserBooks } from "@/lib/data"
import { loadReadingLogs } from "@/lib/reading-log"
import type { Book, ReadingLog } from "@/lib/types"

interface BooksContextType {
  books: Book[]
  readingLogs: ReadingLog[]
  /** True only on the very first load when there's no cached data to show. */
  loading: boolean
  /** True while a background revalidation is in flight (cache already shown). */
  refreshing: boolean
  /** Force a refetch (e.g. after creating/deleting/editing a book). */
  refresh: () => Promise<void>
  /** Optimistically patch the cache so UI updates instantly, no refetch. */
  applyLocalUpdate: (bookId: string, fields: Partial<Book>) => void
}

const BooksContext = createContext<BooksContextType | undefined>(undefined)

const cacheKey = (uid: string) => `booknest:books-cache:${uid}`

interface CachedPayload {
  books: Book[]
  readingLogs: ReadingLog[]
}

/** Reads the per-user cached payload from sessionStorage, if present/valid. */
function readCache(uid: string): CachedPayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(cacheKey(uid))
    if (!raw) return null
    return JSON.parse(raw) as CachedPayload
  } catch {
    return null
  }
}

function writeCache(uid: string, payload: CachedPayload) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(cacheKey(uid), JSON.stringify(payload))
  } catch {
    // sessionStorage can throw when full / disabled — non-fatal, just skip.
  }
}

/**
 * Shared, app-wide cache for the signed-in user's books and reading logs.
 *
 * Pages read from this instead of fetching on every mount, so navigating
 * between pages (or reopening the app) renders the last-known data instantly
 * and revalidates in the background — a stale-while-revalidate model. The
 * persistent app shell (top bar, bottom nav) never unmounts, and content just
 * updates in place.
 */
export function BooksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Tracks which user we've hydrated from cache, to hydrate once per user.
  const hydratedFor = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const [nextBooks, nextLogs] = await Promise.all([
        loadUserBooks(user.uid),
        loadReadingLogs(user.uid),
      ])
      setBooks(nextBooks)
      setReadingLogs(nextLogs)
      writeCache(user.uid, { books: nextBooks, readingLogs: nextLogs })
    } catch (error) {
      console.error("Error refreshing books cache:", error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setBooks([])
      setReadingLogs([])
      setLoading(true)
      hydratedFor.current = null
      return
    }

    // Hydrate instantly from cache so the UI paints with no spinner, then
    // revalidate in the background.
    if (hydratedFor.current !== user.uid) {
      hydratedFor.current = user.uid
      const cached = readCache(user.uid)
      if (cached) {
        setBooks(cached.books)
        setReadingLogs(cached.readingLogs)
        setLoading(false) // we have something to show immediately
      } else {
        setLoading(true)
      }
    }

    void refresh()
  }, [user, refresh])

  const applyLocalUpdate = useCallback(
    (bookId: string, fields: Partial<Book>) => {
      setBooks((prev) => {
        const next = prev.map((b) => (b.id === bookId ? { ...b, ...fields } : b))
        if (user) writeCache(user.uid, { books: next, readingLogs })
        return next
      })
    },
    [user, readingLogs],
  )

  return (
    <BooksContext.Provider
      value={{ books, readingLogs, loading, refreshing, refresh, applyLocalUpdate }}
    >
      {children}
    </BooksContext.Provider>
  )
}

export function useBooks() {
  const ctx = useContext(BooksContext)
  if (!ctx) throw new Error("useBooks must be used within a BooksProvider")
  return ctx
}
