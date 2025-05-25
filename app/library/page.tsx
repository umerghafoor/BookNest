"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Search, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"

export default function LibraryPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reading":
        return "bg-blue-100 text-blue-800"
      case "read":
        return "bg-green-100 text-green-800"
      case "will-read":
        return "bg-yellow-100 text-yellow-800"
      case "on-hold":
        return "bg-orange-100 text-orange-800"
      case "abandoned":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProgressPercentage = (book: Book) => {
    if (!book.totalPages || !book.pagesRead) return 0
    return Math.round((book.pagesRead / book.totalPages) * 100)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Library</h1>
            <p className="text-muted-foreground">
              {filteredBooks.length} of {books.length} books
            </p>
          </div>
          <Link href="/add-book">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books, authors, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
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
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="ebook">eBook</SelectItem>
              <SelectItem value="audiobook">Audiobook</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <div className="w-16 h-20 bg-muted rounded animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {books.length === 0 ? "No books yet" : "No books match your filters"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {books.length === 0
                ? "Start building your library by adding your first book"
                : "Try adjusting your search or filter criteria"}
            </p>
            {books.length === 0 && (
              <Link href="/add-book">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Book
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map((book) => (
              <Link key={book.id} href={`/book/${book.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-16 h-20 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage || "/placeholder.svg"}
                            alt={book.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <BookOpen className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate">{book.title}</h3>
                        {book.subtitle && (
                          <p className="text-xs text-muted-foreground mb-1 truncate">{book.subtitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground mb-2 truncate">{book.authors.join(", ")}</p>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(book.status)}`}>
                            {book.status.replace("-", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {book.format}
                          </Badge>
                        </div>

                        {book.status === "reading" && book.totalPages && book.pagesRead && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>
                                {book.pagesRead} / {book.totalPages} pages
                              </span>
                              <span>{getProgressPercentage(book)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{ width: `${getProgressPercentage(book)}%` }}
                              ></div>
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
