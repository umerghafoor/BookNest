"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Search,
  Plus,
  Grid3X3,
  Table,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Eye,
  Trash2,
  MoreHorizontal,
  Star,
  Clock,
  CheckCircle,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import type { Book } from "@/lib/types"
import "@/styles/components.css"

type SortField =
  | "title"
  | "authors"
  | "genre"
  | "status"
  | "format"
  | "totalPages"
  | "pagesRead"
  | "createdAt"
  | "updatedAt"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE = 20

export default function LibraryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [paginatedBooks, setPaginatedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")
  const [genreFilter, setGenreFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>("updatedAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Book>>({})
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (user) {
      loadBooks()
    }
  }, [user])

  useEffect(() => {
    filterAndSortBooks()
  }, [books, searchTerm, statusFilter, formatFilter, genreFilter, sortField, sortDirection])

  useEffect(() => {
    paginateBooks()
  }, [filteredBooks, currentPage])

  const loadBooks = async () => {
    if (!user) return

    try {
      const booksRef = collection(db, "books")
      const userBooksQuery = query(booksRef, where("userId", "==", user.uid))
      const snapshot = await getDocs(userBooksQuery)

      const booksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[]

      setBooks(booksData)
    } catch (error) {
      console.error("Error loading books:", error)
      toast({
        title: "Error",
        description: "Failed to load books. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortBooks = () => {
    let filtered = books

    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(term) ||
          book.authors.some((author) => author.toLowerCase().includes(term)) ||
          book.genre?.toLowerCase().includes(term) ||
          book.tags.some((tag) => tag.toLowerCase().includes(term)) ||
          book.isbn?.toLowerCase().includes(term),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((book) => book.status === statusFilter)
    }

    if (formatFilter !== "all") {
      filtered = filtered.filter((book) => book.format === formatFilter)
    }

    if (genreFilter !== "all") {
      filtered = filtered.filter((book) => book.genre === genreFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle special cases
      if (sortField === "authors") {
        aValue = a.authors.join(", ")
        bValue = b.authors.join(", ")
      } else if (sortField === "createdAt" || sortField === "updatedAt") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === "asc" ? -1 : 1
      if (bValue == null) return sortDirection === "asc" ? 1 : -1

      // Compare values
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    setFilteredBooks(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const paginateBooks = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    setPaginatedBooks(filteredBooks.slice(startIndex, endIndex))
  }

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const toggleBookSelection = (bookId: string) => {
    const newSelected = new Set(selectedBooks)
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId)
    } else {
      newSelected.add(bookId)
    }
    setSelectedBooks(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedBooks.size === paginatedBooks.length) {
      setSelectedBooks(new Set())
    } else {
      setSelectedBooks(new Set(paginatedBooks.map((book) => book.id)))
    }
  }

  const handleDeleteBook = async (book: Book) => {
    try {
      await deleteDoc(doc(db, "books", book.id))
      setBooks(books.filter((b) => b.id !== book.id))
      toast({
        title: "Book deleted",
        description: `"${book.title}" has been removed from your library.`,
      })
    } catch (error) {
      console.error("Error deleting book:", error)
      toast({
        title: "Error",
        description: "Failed to delete book. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (book: Book) => {
    setEditingBook(book)
    setEditFormData({
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      genre: book.genre,
      status: book.status,
      format: book.format,
      totalPages: book.totalPages,
      pagesRead: book.pagesRead,
      tags: book.tags,
      isbn: book.isbn,
      description: book.description,
      isPublic: book.isPublic,
      allowBorrow: book.allowBorrow,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingBook) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "books", editingBook.id), {
        ...editFormData,
        updatedAt: new Date(),
      })

      setBooks(books.map((b) => (b.id === editingBook.id ? { ...b, ...editFormData, updatedAt: new Date() } : b)))
      setEditDialogOpen(false)
      setEditingBook(null)
      setEditFormData({})

      toast({
        title: "Book updated",
        description: `"${editFormData.title}" has been updated successfully.`,
      })
    } catch (error) {
      console.error("Error updating book:", error)
      toast({
        title: "Error",
        description: "Failed to update book. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  const getUniqueGenres = () => {
    const genres = books.map((book) => book.genre).filter((genre): genre is string => Boolean(genre))
    return [...new Set(genres)].sort()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "reading":
        return <Clock className="h-3 w-3" />
      case "read":
        return <CheckCircle className="h-3 w-3" />
      case "will-read":
        return <Star className="h-3 w-3" />
      default:
        return null
    }
  }

  if (!user) return null

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="page-header">
            <h1 className="page-title">My Library</h1>
            <p className="page-description">
              {filteredBooks.length} of {books.length} books • Page {currentPage} of {totalPages || 1}
              {selectedBooks.size > 0 && ` • ${selectedBooks.size} selected`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/bulk-edit">
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit
              </Button>
            </Link>
            <Link href="/add-book">
              <Button className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Book
              </Button>
            </Link>
          </div>
        </div>

        {/* Advanced Search and Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, author, genre, tags, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4">
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

              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="w-48">
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

              {/* View Toggle */}
              <div className="view-toggle ml-auto">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`view-toggle-btn ${viewMode === "grid" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`view-toggle-btn ${viewMode === "table" ? "view-toggle-btn-active" : "view-toggle-btn-inactive"}`}
                >
                  <Table className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books Display */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
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
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="book-card-grid">
            {paginatedBooks.map((book) => (
              <Card key={book.id} className="book-card group">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-3">
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

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 dark:text-white">
                        {book.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {book.authors.length > 0 ? book.authors.join(", ") : "Unknown Author"}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${getStatusBadgeClass(book.status)}`}>
                          {getStatusIcon(book.status)}
                          <span className="ml-1">{book.status.replace("-", " ")}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {book.format}
                        </Badge>
                        {book.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
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

                      <div className="flex justify-between items-center pt-2">
                        <Link href={`/book/${book.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(book)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Quick Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/edit-book/${book.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Full Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setBookToDelete(book)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View - Fixed responsive columns */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-[25%]" />
                    <col className="w-[20%]" />
                    <col className="w-[15%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[14%]" />
                  </colgroup>
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={selectedBooks.size === paginatedBooks.length && paginatedBooks.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("title")}
                          className="font-medium hover:bg-transparent"
                        >
                          Title {getSortIcon("title")}
                        </Button>
                      </th>
                      <th className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("authors")}
                          className="font-medium hover:bg-transparent"
                        >
                          Authors {getSortIcon("authors")}
                        </Button>
                      </th>
                      <th className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("genre")}
                          className="font-medium hover:bg-transparent"
                        >
                          Genre {getSortIcon("genre")}
                        </Button>
                      </th>
                      <th className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("status")}
                          className="font-medium hover:bg-transparent"
                        >
                          Status {getSortIcon("status")}
                        </Button>
                      </th>
                      <th className="p-3 text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort("format")}
                          className="font-medium hover:bg-transparent"
                        >
                          Format {getSortIcon("format")}
                        </Button>
                      </th>
                      <th className="p-3 text-left">Progress</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBooks.map((book) => (
                      <tr
                        key={book.id}
                        className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          selectedBooks.has(book.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={selectedBooks.has(book.id)}
                            onCheckedChange={() => toggleBookSelection(book.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-10 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center flex-shrink-0">
                              {book.coverImage ? (
                                <img
                                  src={book.coverImage || "/placeholder.svg"}
                                  alt={book.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link href={`/book/${book.id}`}>
                                <p className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate">
                                  {book.title || "Untitled"}
                                </p>
                              </Link>
                              {book.subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{book.subtitle}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                {book.isPublic && (
                                  <Badge variant="secondary" className="text-xs">
                                    Public
                                  </Badge>
                                )}
                                {book.allowBorrow && (
                                  <Badge variant="outline" className="text-xs">
                                    Borrowable
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                            {book.authors && book.authors.length > 0 ? book.authors.join(", ") : "Unknown Author"}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                            {book.genre || "Unknown"}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs ${getStatusBadgeClass(book.status)}`}>
                            {getStatusIcon(book.status)}
                            <span className="ml-1">{book.status ? book.status.replace("-", " ") : "Unknown"}</span>
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {book.format || "Unknown"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {book.status === "reading" && book.totalPages && book.pagesRead ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">
                                  {book.pagesRead} / {book.totalPages}
                                </span>
                                <span className="text-blue-600 dark:text-blue-400">{getProgressPercentage(book)}%</span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${getProgressPercentage(book)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/book/${book.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(book)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Quick Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/edit-book/${book.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Full Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setBookToDelete(book)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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

        {/* Quick Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quick Edit Book</DialogTitle>
              <DialogDescription>
                Make quick changes to "{editingBook?.title}". For advanced editing, use the full edit page.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editFormData.title || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    placeholder="Book title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subtitle</label>
                  <Input
                    value={editFormData.subtitle || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, subtitle: e.target.value })}
                    placeholder="Book subtitle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Authors</label>
                <Input
                  value={editFormData.authors?.join(", ") || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      authors: e.target.value
                        .split(",")
                        .map((a) => a.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Author names (comma separated)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Genre</label>
                  <Input
                    value={editFormData.genre || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, genre: e.target.value })}
                    placeholder="Book genre"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ISBN</label>
                  <Input
                    value={editFormData.isbn || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, isbn: e.target.value })}
                    placeholder="ISBN number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editFormData.status || ""}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not-read">Not Read</SelectItem>
                      <SelectItem value="reading">Reading</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="will-read">Will Read</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select
                    value={editFormData.format || ""}
                    onValueChange={(value) => setEditFormData({ ...editFormData, format: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="ebook">eBook</SelectItem>
                      <SelectItem value="audiobook">Audiobook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Public</label>
                  <Select
                    value={editFormData.isPublic ? "true" : "false"}
                    onValueChange={(value) => setEditFormData({ ...editFormData, isPublic: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Private</SelectItem>
                      <SelectItem value="true">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Borrowable</label>
                  <Select
                    value={editFormData.allowBorrow ? "true" : "false"}
                    onValueChange={(value) => setEditFormData({ ...editFormData, allowBorrow: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Pages</label>
                  <Input
                    type="number"
                    value={editFormData.totalPages || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        totalPages: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Total pages"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pages Read</label>
                  <Input
                    type="number"
                    value={editFormData.pagesRead || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        pagesRead: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="Pages read"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <Input
                  value={editFormData.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Tags (comma separated)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Book description"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Book</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{bookToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (bookToDelete) {
                    handleDeleteBook(bookToDelete)
                    setDeleteDialogOpen(false)
                    setBookToDelete(null)
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
