"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Search, Plus, Grid3X3, List, Filter } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import "../styles/components.css"

export default function LibraryPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (user) {
      loadBooks()
    }
  }, [user])

  useEffect(() => {
    filterBooks()
  }, [books, searchTerm, statusFilter, formatFilter])

  const loadBooks = async () => {
    if (!user) return

    try {
      const booksRef = collection(db, "books")
      const userBooksQuery = query(booksRef, where("userId", "==", user.uid), orderBy("title"))
      const snapshot = await getDocs(userBooksQuery)

      const booksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[]

      setBooks(booksData)
    } catch (error) {
      console.error("Error loading books:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterBooks = () => {
    let filtered = books

    if (searchTerm) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.authors.some((author) => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
          book.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((book) => book.status === statusFilter)
    }

    if (formatFilter !== "all") {
      filtered = filtered.filter((book) => book.format === formatFilter)
    }

    setFilteredBooks(filtered)
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

  const getProgressPercentage = (book: Book) => {
    if (!book.totalPages || !book.pagesRead) return 0
    return Math.round((book.pagesRead / book.totalPages) * 100)
  }

  if (!user) return null

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="page-header">
            <h1 className="page-title">My Library</h1>
            <p className="page-description">
              {filteredBooks.length} of {books.length} books
            </p>
          </div>
          <Link href="/add-book">
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search books, authors, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not-read">Not Read</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="will-read">Will Read</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="ebook">eBook</SelectItem>
                <SelectItem value="audiobook">Audiobook</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="view-toggle">
              <button
                onClick={() => setViewMode("grid")}
                className={`view-toggle-btn ${viewMode === "grid" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`view-toggle-btn ${viewMode === "list" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Books Display */}
        {loading ? (
          <div className={viewMode === "grid" ? "book-card-grid" : "book-card-list"}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="card-clean animate-pulse">
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <div className="w-16 h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              {books.length === 0 ? "No books yet" : "No books match your filters"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {books.length === 0
                ? "Start building your library by adding your first book"
                : "Try adjusting your search or filter criteria"}
            </p>
            {books.length === 0 && (
              <Link href="/add-book">
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Book
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className={viewMode === "grid" ? "book-card-grid" : "book-card-list"}>
            {filteredBooks.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`}>
                <Card className="book-card">
                  <CardContent className={viewMode === "grid" ? "p-4" : "p-4"}>
                    <div className={`flex ${viewMode === "grid" ? "flex-col" : "flex-row"} space-x-4`}>
                      <div
                        className={`${viewMode === "grid" ? "w-full h-32 mb-4" : "w-16 h-20"} bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center flex-shrink-0`}
                      >
                        <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate text-slate-900 dark:text-white">
                          {book.title}
                        </h3>
                        {book.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">{book.subtitle}</p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                          {book.authors.join(", ")}
                        </p>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`text-xs ${getStatusBadgeClass(book.status)}`}>
                            {book.status.replace("-", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {book.format}
                          </Badge>
                        </div>

                        {book.status === "reading" && book.totalPages && book.pagesRead && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">
                                {book.pagesRead} / {book.totalPages} pages
                              </span>
                              <span className="text-blue-600 dark:text-blue-400">{getProgressPercentage(book)}%</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${getProgressPercentage(book)}%` }}></div>
                            </div>
                          </div>
                        )}

                        {book.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {book.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {book.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{book.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
