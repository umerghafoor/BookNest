"use client"

import type React from "react"
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
  Pin,
  PinOff,
  ImageIcon,
  Upload,
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
import { doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useBooks } from "@/components/books-provider"
import { mockFirestore } from "@/lib/mock-data"
import { setBookPinned } from "@/lib/book-actions"
import { generateThumbnailDataUrl } from "@/lib/thumbnail-utils"
import { useToast } from "@/hooks/use-toast"
import { Fab } from "@/components/fab"
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

// Material 3 "input chip" used to surface and dismiss an active filter.
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container capitalize">
      {label}
      <button onClick={onClear} aria-label={`Remove ${label} filter`} className="hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export default function LibraryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  // Shared cache: books render instantly on navigation and revalidate in the
  // background. Mutations go through applyLocalUpdate / refresh.
  const { books, loading, applyLocalUpdate, refresh } = useBooks()
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [paginatedBooks, setPaginatedBooks] = useState<Book[]>([])
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
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    filterAndSortBooks()
  }, [books, searchTerm, statusFilter, formatFilter, genreFilter, sortField, sortDirection])

  useEffect(() => {
    paginateBooks()
  }, [filteredBooks, currentPage])

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
      if (isFirebaseConfigured) {
        await deleteDoc(doc(db, "books", book.id))
      } else {
        await mockFirestore.deleteBook(book.id)
      }
      await refresh()
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
      coverImage: book.coverImage,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingBook) return

    setSaving(true)
    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, "books", editingBook.id), {
          ...editFormData,
          updatedAt: new Date(),
        })
      } else {
        await mockFirestore.updateBook(editingBook.id, { ...editFormData })
      }

      applyLocalUpdate(editingBook.id, { ...editFormData, updatedAt: new Date() })
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

  const handleTogglePin = async (book: Book) => {
    const nextPinned = !book.pinned
    // Optimistic update so the UI feels instant.
    applyLocalUpdate(book.id, { pinned: nextPinned })
    try {
      await setBookPinned(book.id, nextPinned)
      toast({
        title: nextPinned ? "Pinned to favorites" : "Unpinned",
        description: `"${book.title}" ${nextPinned ? "now appears on your dashboard." : "removed from favorites."}`,
      })
    } catch (error) {
      console.error("Error toggling pin:", error)
      // Roll back on failure.
      applyLocalUpdate(book.id, { pinned: book.pinned })
      toast({
        title: "Error",
        description: "Failed to update favorite. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" })
      return
    }
    try {
      const dataUrl = await generateThumbnailDataUrl(file)
      setEditFormData((prev) => ({ ...prev, coverImage: dataUrl }))
    } catch (error) {
      console.error("Error processing cover image:", error)
      toast({
        title: "Error",
        description: "Failed to process image. Please try a different file.",
        variant: "destructive",
      })
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
      <Navigation title="Library" />

      <div className="content-container">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6">
          <div className="page-header">
            <h1 className="page-title hidden sm:block">My Library</h1>
            <p className="page-description">
              {filteredBooks.length} of {books.length} books • Page {currentPage} of {totalPages || 1}
              {selectedBooks.size > 0 && ` • ${selectedBooks.size} selected`}
            </p>
          </div>
          {/* Header actions — desktop only; mobile uses the floating action button */}
          <div className="hidden sm:flex gap-2">
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

        {/* Advanced Search and Filters — bare on mobile, carded on desktop */}
        <Card className="mb-6 border-0 bg-transparent md:border md:bg-card">
          <CardHeader className="hidden md:flex pb-4 flex-row items-center justify-between">
            <CardTitle className="text-lg">Search & Filter</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredBooks.length} of {books.length} books
            </span>
          </CardHeader>
          <CardContent className="space-y-4 p-0 md:p-6 md:pt-0">
            {/* Search Bar (single bar; on mobile a Filters toggle sits beside it) */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 rounded-full"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-full md:hidden"
                aria-label="Toggle filters"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters Row — always shown on desktop; toggled on mobile */}
            <div
              className={`${showFilters ? "flex" : "hidden"} md:flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center`}
            >
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
                <SelectTrigger className="w-full sm:w-40">
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
                <SelectTrigger className="w-full sm:w-48">
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

              {/* View Toggle — desktop only; mobile is always the card/grid view */}
              <div className="view-toggle ml-auto hidden md:flex">
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

            {/* Active filter chips */}
            {(statusFilter !== "all" || formatFilter !== "all" || genreFilter !== "all" || searchTerm) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-medium text-muted-foreground">Active:</span>
                {searchTerm && (
                  <FilterChip label={`"${searchTerm}"`} onClear={() => setSearchTerm("")} />
                )}
                {statusFilter !== "all" && (
                  <FilterChip label={`Status: ${statusFilter}`} onClear={() => setStatusFilter("all")} />
                )}
                {formatFilter !== "all" && (
                  <FilterChip label={`Format: ${formatFilter}`} onClear={() => setFormatFilter("all")} />
                )}
                {genreFilter !== "all" && (
                  <FilterChip label={`Genre: ${genreFilter}`} onClear={() => setGenreFilter("all")} />
                )}
                <button
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setFormatFilter("all")
                    setGenreFilter("all")
                  }}
                  className="ml-1 text-xs font-medium text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Books Display */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-[var(--radius-md)] animate-pulse"></div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {books.length === 0 ? "No books yet" : "No books match your filters"}
              </h3>
              <p className="text-muted-foreground mb-4">
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
        ) : (
          <>
          {/* Card/grid view — always used on mobile; on desktop when grid is selected.
              The visibility wrapper is a plain div so its `md:hidden` reliably wins
              over the `.book-card-grid` component class's own `display: grid`. */}
          <div className={viewMode === "grid" ? "block" : "block md:hidden"}>
          <div className="book-card-grid">
            {paginatedBooks.map((book) => (
              <Card key={book.id} className="book-card group">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="relative w-full h-32 bg-primary-container rounded flex items-center justify-center">
                      {book.pinned && (
                        <span className="absolute top-1.5 right-1.5 z-10 rounded-full bg-primary p-1 text-on-primary shadow">
                          <Pin className="h-3 w-3" />
                        </span>
                      )}
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

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                        {book.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
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
                            <span className="text-muted-foreground">
                              {book.pagesRead} / {book.totalPages} pages
                            </span>
                            <span className="text-primary">{getProgressPercentage(book)}%</span>
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
                            <DropdownMenuItem onClick={() => handleTogglePin(book)}>
                              {book.pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Pin to favorites
                                </>
                              )}
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>

          {/* Table view — desktop only, and only when the table view is selected */}
          {viewMode === "table" && (
          <Card className="hidden md:block">
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
                  <thead className="bg-muted/50 border-b">
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
                        className={`border-b hover:bg-accent/60 ${
                          selectedBooks.has(book.id) ? "bg-primary-container/40" : ""
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
                            <div className="w-8 h-10 bg-primary-container rounded flex items-center justify-center flex-shrink-0">
                              {book.coverImage ? (
                                <img
                                  src={book.coverImage || "/placeholder.svg"}
                                  alt={book.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <BookOpen className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link href={`/book/${book.id}`}>
                                <p className="font-medium text-foreground hover:text-primary cursor-pointer truncate">
                                  {book.title || "Untitled"}
                                </p>
                              </Link>
                              {book.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">{book.subtitle}</p>
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
                          <p className="text-sm text-muted-foreground truncate">
                            {book.authors && book.authors.length > 0 ? book.authors.join(", ") : "Unknown Author"}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-muted-foreground truncate">
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
                                <span className="text-muted-foreground">
                                  {book.pagesRead} / {book.totalPages}
                                </span>
                                <span className="text-primary">{getProgressPercentage(book)}%</span>
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${getProgressPercentage(book)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
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
                              <DropdownMenuItem onClick={() => handleTogglePin(book)}>
                                {book.pinned ? (
                                  <>
                                    <PinOff className="h-4 w-4 mr-2" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Pin to favorites
                                  </>
                                )}
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
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
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
                    <span className="hidden sm:inline">Previous</span>
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
                    <span className="hidden sm:inline">Next</span>
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
              {/* Cover image */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Cover Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-28 bg-primary-container rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {editFormData.coverImage ? (
                      <img
                        src={editFormData.coverImage || "/placeholder.svg"}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {editFormData.coverImage ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleCoverSelect}
                        />
                      </label>
                    </Button>
                    {editFormData.coverImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => setEditFormData({ ...editFormData, coverImage: "" })}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Mobile floating actions */}
      <Fab
        label="Library actions"
        actions={[
          { label: "Add Book", icon: Plus, href: "/add-book" },
          { label: "Bulk Edit", icon: Edit, href: "/bulk-edit" },
        ]}
      />
    </div>
  )
}
