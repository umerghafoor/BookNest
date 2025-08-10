"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookOpen, Search, Filter, User, Eye, MessageCircle, Send, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Book } from "@/lib/types"
import "@/styles/components.css"

interface PublicBook extends Book {
  userEmail?: string
  userName?: string
  userPhotoURL?: string
}

interface BorrowRequest {
  id?: string
  bookId: string
  borrowerUserId: string
  borrowerName: string
  borrowerEmail: string
  ownerUserId: string
  message: string
  status: "pending" | "approved" | "rejected"
  createdAt: Date
}

const ITEMS_PER_PAGE = 12

export default function DiscoverPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [books, setBooks] = useState<PublicBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<PublicBook[]>([])
  const [paginatedBooks, setPaginatedBooks] = useState<PublicBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [genreFilter, setGenreFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("recent")
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<PublicBook | null>(null)
  const [borrowMessage, setBorrowMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadPublicBooks()
  }, [])

  useEffect(() => {
    filterAndSortBooks()
  }, [books, searchTerm, genreFilter, statusFilter, sortBy])

  useEffect(() => {
    paginateBooks()
  }, [filteredBooks, currentPage])

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
    setCurrentPage(1) // Reset to first page when filtering
  }

  const paginateBooks = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    setPaginatedBooks(filteredBooks.slice(startIndex, endIndex))
  }

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE)

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

  const getUserInitials = (email: string) => {
    return email.split("@")[0].slice(0, 2).toUpperCase()
  }

  const handleBookClick = (book: PublicBook) => {
    // Navigate to book details page
    window.open(`/book/${book.id}`, "_blank")
  }

  const openBorrowDialog = (book: PublicBook) => {
    setSelectedBook(book)
    setBorrowMessage("")
    setBorrowDialogOpen(true)
  }

  const sendBorrowRequest = async () => {
    if (!selectedBook || !user || !borrowMessage.trim()) return

    setSending(true)
    try {
      const borrowRequest: BorrowRequest = {
        bookId: selectedBook.id,
        borrowerUserId: user.uid,
        borrowerName: user.displayName || user.email || "Anonymous",
        borrowerEmail: user.email || "",
        ownerUserId: selectedBook.userId,
        message: borrowMessage.trim(),
        status: "pending",
        createdAt: new Date(),
      }

      await addDoc(collection(db, "borrowRequests"), borrowRequest)

      toast({
        title: "Borrow request sent",
        description: `Your request to borrow "${selectedBook.title}" has been sent to the owner.`,
      })

      setBorrowDialogOpen(false)
      setSelectedBook(null)
      setBorrowMessage("")
    } catch (error) {
      console.error("Error sending borrow request:", error)
      toast({
        title: "Error",
        description: "Failed to send borrow request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="page-header mb-8">
          <h1 className="page-title">Discover Books</h1>
          <p className="page-description">
            Explore books shared by the BookNest community • {filteredBooks.length} books • Page {currentPage} of{" "}
            {totalPages || 1}
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
            {paginatedBooks.map((book) => (
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
                        {book.allowBorrow && (
                          <Badge variant="secondary" className="text-xs">
                            Borrowable
                          </Badge>
                        )}
                      </div>

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

                      {/* User Info and Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={book.userPhotoURL || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {book.userEmail ? getUserInitials(book.userEmail) : <User className="h-3 w-3" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {book.userName || book.userEmail?.split("@")[0] || "Anonymous"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {book.allowBorrow && user && book.userId !== user.uid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                openBorrowDialog(book)
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Borrow
                            </Button>
                          )}
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-400">Public</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredBooks.length)} of {filteredBooks.length} books
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Borrow Request Dialog */}
        <Dialog open={borrowDialogOpen} onOpenChange={setBorrowDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request to Borrow</DialogTitle>
              <DialogDescription>
                Send a message to the owner of "{selectedBook?.title}" to request borrowing this book.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your message to the owner:</label>
                <Textarea
                  value={borrowMessage}
                  onChange={(e) => setBorrowMessage(e.target.value)}
                  placeholder="Hi! I'd love to borrow your book. When would be a good time to pick it up?"
                  rows={4}
                />
              </div>
              <div className="text-xs text-slate-500">
                The owner will receive your contact information along with this message.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBorrowDialogOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={sendBorrowRequest} disabled={!borrowMessage.trim() || sending} className="btn-primary">
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
