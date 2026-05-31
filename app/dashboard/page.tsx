"use client"

import type React from "react"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, Plus, TrendingUp, Clock, Target, Calendar, Users, Search, Zap, Pin, PinOff, Upload } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { loadUserBooks } from "@/lib/data"
import { setBookPinned, setBookCover } from "@/lib/book-actions"
import { generateThumbnailDataUrl } from "@/lib/thumbnail-utils"
import { useToast } from "@/hooks/use-toast"
import type { Book, ReadingLog } from "@/lib/types"
import { loadReadingLogs } from "@/lib/reading-log"
import { Fab } from "@/components/fab"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

// Lazy-load the reading-streak section so its recharts dependency is split out
// of the dashboard's initial bundle and only fetched when this page renders.
const ReadingStreak = dynamic(() => import("@/components/reading-streak"), {
  ssr: false,
  loading: () => (
    <div className="h-72 animate-pulse rounded-[var(--radius-lg)] border border-border/60 bg-card" />
  ),
})
import "@/styles/components.css"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState({
    totalBooks: 0,
    currentlyReading: 0,
    booksRead: 0,
    totalPages: 0,
  })
  const [recentBooks, setRecentBooks] = useState<Book[]>([])
  const [currentlyReading, setCurrentlyReading] = useState<Book[]>([])
  const [pinnedBooks, setPinnedBooks] = useState<Book[]>([])
  const [readingLogs, setReadingLogs] = useState<ReadingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [quickSearch, setQuickSearch] = useState("")

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const books = await loadUserBooks(user.uid)

      const totalBooks = books.length
      const currentlyReadingBooks = books.filter((book) => book.status === "reading")
      const booksRead = books.filter((book) => book.status === "read").length
      const totalPages = books.reduce((sum, book) => sum + (book.pagesRead || 0), 0)

      setStats({ totalBooks, currentlyReading: currentlyReadingBooks.length, booksRead, totalPages })
      setCurrentlyReading(currentlyReadingBooks.slice(0, 3))

      // Pinned favorites, most recently updated first.
      const pinned = books
        .filter((book) => book.pinned)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setPinnedBooks(pinned)

      // Recent activity (last updated)
      const recent = [...books]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
      setRecentBooks(recent)

      const logs = await loadReadingLogs(user.uid)
      setReadingLogs(logs)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickSearch.trim()) {
      router.push(`/library?search=${encodeURIComponent(quickSearch.trim())}`)
    }
  }

  const handleUnpin = async (book: Book) => {
    setPinnedBooks((prev) => prev.filter((b) => b.id !== book.id))
    try {
      await setBookPinned(book.id, false)
      toast({ title: "Unpinned", description: `"${book.title}" removed from favorites.` })
    } catch (error) {
      console.error("Error unpinning book:", error)
      setPinnedBooks((prev) => [...prev, book])
      toast({
        title: "Error",
        description: "Failed to unpin. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCoverUpload = async (book: Book, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" })
      return
    }
    try {
      const dataUrl = await generateThumbnailDataUrl(file)
      setPinnedBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, coverImage: dataUrl } : b)))
      await setBookCover(book.id, dataUrl)
      toast({ title: "Cover updated", description: `Updated the cover for "${book.title}".` })
    } catch (error) {
      console.error("Error uploading cover:", error)
      toast({
        title: "Error",
        description: "Failed to update cover. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getProgressPercentage = (book: Book) => {
    if (!book.totalPages || book.totalPages === 0) return 0
    return Math.round(((book.pagesRead || 0) / book.totalPages) * 100)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "reading":
        return "status-reading"
      case "read":
        return "status-read"
      case "will-read":
        return "status-will-read"
      case "on-hold":
        return "status-on-hold"
      case "abandoned":
        return "status-abandoned"
      default:
        return "status-not-read"
    }
  }

  if (!user) return null

  return (
    <div className="page-container">
      <Navigation title="Dashboard" />

      <div className="content-container">
        {/* Header with Quick Search — desktop only; mobile uses the top app bar */}
        <div className="mb-8 hidden md:block">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="page-header">
              <h1 className="page-title">Welcome back, {user.displayName || user.email?.split("@")[0] || "Reader"}!</h1>
              <p className="page-description">Here's what's happening with your reading journey.</p>
            </div>

            {/* Quick Search */}
            <Card className="lg:w-96">
              <CardContent className="p-4">
                <form onSubmit={handleQuickSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Quick search your library..."
                      value={quickSearch}
                      onChange={(e) => setQuickSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" size="sm" className="btn-primary">
                    <Zap className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compact KPI row — mobile only */}
        <div className="mb-6 grid grid-cols-4 gap-2 md:hidden">
          {(loading
            ? [null, null, null, null]
            : [
                { label: "Books", value: stats.totalBooks, href: "/library" },
                { label: "Reading", value: stats.currentlyReading, href: "/library?status=reading" },
                { label: "Read", value: stats.booksRead, href: "/library?status=read" },
                { label: "Pages", value: stats.totalPages, href: "/stats" },
              ]
          ).map((kpi, i) =>
            kpi ? (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="flex flex-col items-center justify-center rounded-[var(--radius-md)] bg-card border border-border/60 px-1 py-3 text-center"
              >
                <span className="text-lg font-bold leading-none text-foreground">
                  {kpi.value.toLocaleString()}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">{kpi.label}</span>
              </Link>
            ) : (
              <div
                key={i}
                className="h-16 animate-pulse rounded-[var(--radius-md)] bg-muted"
              />
            ),
          )}
        </div>

        {/* Stats Grid — desktop */}
        {loading ? (
          <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-4"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Link href="/library">
              <div className="stat-card stat-card-blue transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Books</h3>
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stats.totalBooks}</div>
                <p className="text-sm text-muted-foreground">in your collection</p>
              </div>
            </Link>

            <Link href="/library?status=reading">
              <div className="stat-card stat-card-emerald transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Currently Reading</h3>
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stats.currentlyReading}</div>
                <p className="text-sm text-muted-foreground">books in progress</p>
              </div>
            </Link>

            <Link href="/library?status=read">
              <div className="stat-card stat-card-violet transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Books Read</h3>
                  <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stats.booksRead}</div>
                <p className="text-sm text-muted-foreground">completed this year</p>
              </div>
            </Link>

            <Link href="/stats">
              <div className="stat-card stat-card-slate transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Pages Read</h3>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stats.totalPages.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">total pages</p>
              </div>
            </Link>
          </div>
        )}

        {/* Pinned Favorites */}
        {!loading && pinnedBooks.length > 0 && (
          <Card className="card-clean mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Pin className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Pinned Favorites</CardTitle>
                    <CardDescription>Your favorite books, front and center</CardDescription>
                  </div>
                </div>
                <Link href="/library">
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {pinnedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="group relative flex flex-col rounded-[var(--radius-md)] border border-border/60 bg-card p-3"
                  >
                    {/* Unpin button */}
                    <button
                      type="button"
                      onClick={() => handleUnpin(book)}
                      aria-label={`Unpin ${book.title}`}
                      className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground opacity-0 shadow transition-opacity hover:text-foreground group-hover:opacity-100"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                    </button>

                    <Link href={`/book/${book.id}`}>
                      <div className="relative mb-2 flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded bg-primary-container">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage || "/placeholder.svg"}
                            alt={book.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-8 w-8 text-primary" />
                        )}
                      </div>
                    </Link>

                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">{book.title}</h3>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {book.authors.length > 0 ? book.authors.join(", ") : "Unknown Author"}
                    </p>

                    <Button type="button" variant="outline" size="sm" className="mt-2 w-full" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {book.coverImage ? "Replace cover" : "Add cover"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleCoverUpload(book, e)}
                        />
                      </label>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reading Streak */}
        <div className="mb-8">
          <ReadingStreak logs={readingLogs} loading={loading} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Currently Reading */}
          <div className="lg:col-span-2">
            <Card className="card-clean">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <CardTitle className="text-lg">Currently Reading</CardTitle>
                      <CardDescription>Your books in progress</CardDescription>
                    </div>
                  </div>
                  <Link href="/library?status=reading">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {currentlyReading.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No books currently being read</p>
                    <Link href="/library">
                      <Button variant="outline">Browse Library</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentlyReading.map((book) => (
                      <Link key={book.id} href={`/book/${book.id}`}>
                        <div className="flex items-center space-x-4 p-4 rounded-lg hover:bg-accent transition-colors border">
                          <div className="w-12 h-16 bg-primary-container rounded flex items-center justify-center flex-shrink-0">
                            {book.coverImage ? (
                              <img
                                src={book.coverImage || "/placeholder.svg"}
                                alt={book.title}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <BookOpen className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{book.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {book.authors.join(", ")}
                            </p>
                            {book.totalPages && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>
                                    {book.pagesRead || 0} / {book.totalPages} pages
                                  </span>
                                  <span>{getProgressPercentage(book)}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${getProgressPercentage(book)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="space-y-6">
            {/* Quick Actions — desktop only; mobile uses the floating action button */}
            <Card className="card-clean hidden md:block">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 text-primary mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage your reading collection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/add-book" className="block">
                  <Button className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Book
                  </Button>
                </Link>
                <Link href="/library" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Library
                  </Button>
                </Link>
                <Link href="/bulk-edit" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Bulk Edit Books
                  </Button>
                </Link>
                <Link href="/stats" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Statistics
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-clean">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Your recently updated books</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recentBooks.length === 0 ? (
                  <div className="text-center py-6">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No recent activity</p>
                    <Link href="/add-book">
                      <Button size="sm" className="btn-primary">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Book
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBooks.slice(0, 4).map((book) => (
                      <Link key={book.id} href={`/book/${book.id}`}>
                        <div className="flex items-center space-x-3 p-2 rounded hover:bg-accent transition-colors">
                          <div className="w-8 h-10 bg-primary-container rounded flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {book.authors.join(", ")}
                            </p>
                          </div>
                          <div className={`status-badge text-xs ${getStatusBadgeClass(book.status)}`}>
                            {book.status.replace("-", " ")}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile floating quick actions */}
      <Fab
        label="Quick actions"
        actions={[
          { label: "Add Book", icon: Plus, href: "/add-book" },
          { label: "Browse Library", icon: BookOpen, href: "/library" },
          { label: "Bulk Edit", icon: TrendingUp, href: "/bulk-edit" },
          { label: "Statistics", icon: Target, href: "/stats" },
        ]}
      />
    </div>
  )
}
