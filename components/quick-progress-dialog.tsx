"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Plus, BookOpen, Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { loadUserBooks } from "@/lib/data"
import { updateBookFields } from "@/lib/book-actions"
import { logProgressDelta } from "@/lib/reading-log"
import { useToast } from "@/hooks/use-toast"
import type { Book } from "@/lib/types"

interface QuickProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Mobile quick-progress flow opened from the bottom-nav "+" button. Presented
 * as a bottom sheet (native-app pattern): the user searches their library,
 * picks a book, and logs how far they've read. Saving updates the book's
 * `pagesRead` and records the forward delta in the reading log (driving the
 * streak/activity graphs).
 */
export function QuickProgressDialog({ open, onOpenChange }: QuickProgressDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Book | null>(null)
  const [pages, setPages] = useState("")
  const [saving, setSaving] = useState(false)

  // Load the user's books when the sheet opens; reset state when it closes.
  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelected(null)
      setPages("")
      return
    }
    if (!user) return
    let active = true
    setLoading(true)
    loadUserBooks(user.uid)
      .then((data) => {
        if (active) setBooks(data)
      })
      .catch(() => {
        if (active) toast({ title: "Couldn't load your books", variant: "destructive" })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, user, toast])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = q
      ? books.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.authors.some((a) => a.toLowerCase().includes(q)),
        )
      : books
    // Currently-reading books first, then most recently updated.
    return [...pool]
      .sort((a, b) => {
        const ar = a.status === "reading" ? 0 : 1
        const br = b.status === "reading" ? 0 : 1
        if (ar !== br) return ar - br
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 30)
  }, [books, search])

  function selectBook(book: Book) {
    setSelected(book)
    setPages(String(book.pagesRead ?? ""))
  }

  async function handleSave() {
    if (!selected || !user) return
    const next = Number.parseInt(pages, 10)
    if (Number.isNaN(next) || next < 0) {
      toast({ title: "Enter a valid page number", variant: "destructive" })
      return
    }
    if (selected.totalPages && next > selected.totalPages) {
      toast({ title: `Max is ${selected.totalPages} pages`, variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const previous = selected.pagesRead
      const reachedEnd = selected.totalPages != null && next >= selected.totalPages
      const fields: Partial<Book> = { pagesRead: next }
      // Auto-advance status from the progress we just recorded.
      if (reachedEnd) fields.status = "read"
      else if (next > 0 && selected.status !== "reading") fields.status = "reading"

      await updateBookFields(selected.id, fields)
      await logProgressDelta(user.uid, previous, next)

      toast({
        title: "Progress saved",
        description: reachedEnd
          ? `Finished “${selected.title}” 🎉`
          : `“${selected.title}” — ${next}${selected.totalPages ? ` / ${selected.totalPages}` : ""} pages`,
      })
      onOpenChange(false)
    } catch {
      toast({ title: "Couldn't save progress", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-[var(--radius-xl)] p-0 sm:mx-auto sm:max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag-handle affordance */}
        <div className="flex justify-center pt-3" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="space-y-1 px-4 pb-3 pt-2 text-left">
          <SheetTitle className="flex items-center gap-2">
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Back to search"
                className="m3-state-layer -ml-1 flex h-8 w-8 items-center justify-center rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
            {selected ? "Quick progress" : "Log reading progress"}
          </SheetTitle>
          <SheetDescription className="truncate">
            {selected ? selected.title : "Search a book to add your progress."}
          </SheetDescription>
        </SheetHeader>

        {!selected ? (
          <div className="flex flex-col">
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or author"
                  className="h-12 pl-9 text-base"
                />
              </div>
            </div>

            <div className="max-h-[50vh] min-h-[8rem] overflow-y-auto overscroll-contain px-2 pb-3">
              {loading ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  {search ? "No matching books." : "No books in your library yet."}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {results.map((book) => (
                    <li key={book.id}>
                      <button
                        type="button"
                        onClick={() => selectBook(book)}
                        className="m3-state-layer flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left"
                      >
                        <span className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {book.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={book.coverImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{book.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {book.authors.join(", ") || "Unknown author"}
                          </span>
                        </span>
                        {book.status === "reading" && (
                          <span className="shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-medium text-on-primary-container">
                            Reading
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-5 pt-1">
            <div>
              <label htmlFor="quick-pages" className="mb-1.5 block text-sm font-medium">
                Pages read
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="quick-pages"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={selected.totalPages}
                  autoFocus
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                  }}
                  className="h-12 text-base"
                />
                {selected.totalPages ? (
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    / {selected.totalPages}
                  </span>
                ) : null}
              </div>
              {selected.totalPages ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, ((Number.parseInt(pages, 10) || 0) / selected.totalPages) * 100),
                      )}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>

            <Button onClick={handleSave} disabled={saving} className="h-12 w-full text-base">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save progress
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
