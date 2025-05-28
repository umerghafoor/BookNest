"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookOpen, Search, Filter, User, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import "@/styles/components.css"

interface PublicBook extends Book {
  userEmail?: string
  userName?: string
  userPhotoURL?: string
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<PublicBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<PublicBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [genreFilter, setGenreFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    loadPublicBooks()
  }, [])

  useEffect(() => {
    filterAndSortBooks()
  }, [books, searchTerm, genreFilter, statusFilter, sortBy])

  const loadPublicBooks = async () => {
    try {
      const booksRef = collection(db, "books")
      const publicBooksQuery = query(booksRef, where("isPublic", "==", true), orderBy("createdAt", "desc"), limit(500))
      const snapshot = await getDocs(publicBooksQuery)

      // Get user data for each book
      const booksWithUserData = await Promise.all(
        snapshot.docs.map(async (bookDoc) => {
          const bookData = { id: bookDoc.id, ...bookDoc.data() } as PublicBook

          // Fetch user data from auth users (this would need a users collection in real app)
          // For now, we'll use the userId to get basic info
          bookData.userEmail = `user${bookData.userId.slice(-4)}@example.com` // Mock email
          bookData.userName = `Reader ${bookData.userId.slice(-4)}` // Mock name

          return bookData
        }),
      )

      setBooks(booksWithUserData)
    } catch (error) {
      console.error("Error loading public books:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortBooks = () => {
    let filtered = books

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.authors.some((author) => author.toLowerCase().includes(searchTerm.toLowerCase())) ||
          book.genre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filter by genre
    if (genreFilter !== "all") {
      filtered = filtered.filter((book) => book.genre === genreFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((book) => book.status === statusFilter)
    }

    // Sort books
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "author":
        filtered.sort((a, b) => a.authors[0]?.localeCompare(b.authors[0] || "") || 0)
        break
      case "pages":
        filtered.sort((a, b) => (b.totalPages || 0) - (a.totalPages || 0))
        break
    }

    setFilteredBooks(filtered)
  }

  const getUniqueGenres = () => {
    const genres = books.map((book) => book.genre).filter((genre): genre is string => Boolean(genre))
    return [...new Set(genres)].sort()
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

  const getUserInitials = (email: string) => {
    return email.split("@")[0].slice(0, 2).toUpperCase()
  }

  const handleBookClick = (book: PublicBook) => {
    // Navigate to book details page
    window.open(`/book/${book.id}`, "_blank")
  }

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="page-title">Discover Books</h1>
          <p className="page-description">
            Explore books shared by the BookNest community • {filteredBooks.length} books
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search books, authors, genres, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {getUniqueGenres().map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="will-read">Will Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="author">Author A-Z</SelectItem>
                <SelectItem value="pages">Page Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="book-card-grid">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="card-clean animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">No public books found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="book-card-grid">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="book-card group cursor-pointer" onClick={() => handleBookClick(book)}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Book Cover */}
                    <div className="w-full h-32 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage || "/placeholder.svg"}
                          alt={book.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 dark:text-white">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        by {book.authors.join(", ")}
                      </p>

                      {book.genre && <p className="text-xs text-slate-600 dark:text-slate-300">{book.genre}</p>}

                      {/* Status and Format */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${getStatusBadgeClass(book.status)}`}>
                          {book.status.replace("-", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {book.format}
                        </Badge>
                      </div>

                      {/* Progress for reading books */}
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

                      {/* Tags */}
                      {book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {book.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {book.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{book.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={book.userPhotoURL || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {book.userEmail ? getUserInitials(book.userEmail) : <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {book.userName || book.userEmail?.split("@")[0] || "Anonymous"}
                        </span>
                        <div className="flex items-center gap-1 ml-auto">
                          <Eye className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-400">Public</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
