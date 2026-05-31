"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Save, Undo2, Redo2, ArrowLeft, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"

interface CellPosition {
  row: number
  col: string
}

interface EditHistory {
  books: Book[]
  timestamp: number
}

const COLUMNS = [
  { key: "title", label: "Title", type: "text", width: "20%" },
  { key: "authors", label: "Authors", type: "array", width: "15%" },
  { key: "genre", label: "Genre", type: "text", width: "12%" },
  { key: "status", label: "Status", type: "select", width: "10%" },
  { key: "format", label: "Format", type: "select", width: "8%" },
  { key: "totalPages", label: "Pages", type: "number", width: "8%" },
  { key: "pagesRead", label: "Read", type: "number", width: "8%" },
  { key: "isPublic", label: "Public", type: "boolean", width: "7%" },
  { key: "allowBorrow", label: "Borrowable", type: "boolean", width: "7%" },
  { key: "tags", label: "Tags", type: "array", width: "15%" },
]

const STATUS_OPTIONS = ["not-read", "reading", "read", "will-read", "on-hold", "abandoned"]
const FORMAT_OPTIONS = ["physical", "ebook", "audiobook"]
const ITEMS_PER_PAGE = 20

export default function BulkEditPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [paginatedBooks, setPaginatedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [editValue, setEditValue] = useState("")
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [history, setHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [copiedValue, setCopiedValue] = useState<string>("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const tableRef = useRef<HTMLTableElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (user) {
      loadBooks()
    }
  }, [user])

  useEffect(() => {
    filterBooks()
  }, [books, searchTerm, statusFilter])

  useEffect(() => {
    paginateBooks()
  }, [filteredBooks, currentPage])

  // Focus and position cursor properly when editing starts
  useEffect(() => {
    if (editingCell && (editInputRef.current || editTextareaRef.current)) {
      const input = editInputRef.current || editTextareaRef.current
      if (input) {
        input.focus()
        // Don't select all text, just position cursor at end
        const length = input.value.length
        input.setSelectionRange(length, length)
      }
    }
  }, [editingCell])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return // Don't handle shortcuts while editing

      // Navigation shortcuts
      if (selectedCell) {
        const currentRowIndex = paginatedBooks.findIndex((book) => book.id === selectedCell.row.toString())
        const currentColIndex = COLUMNS.findIndex((col) => col.key === selectedCell.col)

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault()
            if (currentRowIndex > 0) {
              setSelectedCell({
                row: Number.parseInt(paginatedBooks[currentRowIndex - 1].id),
                col: selectedCell.col,
              })
            }
            break
          case "ArrowDown":
            e.preventDefault()
            if (currentRowIndex < paginatedBooks.length - 1) {
              setSelectedCell({
                row: Number.parseInt(paginatedBooks[currentRowIndex + 1].id),
                col: selectedCell.col,
              })
            }
            break
          case "ArrowLeft":
            e.preventDefault()
            if (currentColIndex > 0) {
              setSelectedCell({
                row: selectedCell.row,
                col: COLUMNS[currentColIndex - 1].key,
              })
            }
            break
          case "ArrowRight":
          case "Tab":
            e.preventDefault()
            if (currentColIndex < COLUMNS.length - 1) {
              setSelectedCell({
                row: selectedCell.row,
                col: COLUMNS[currentColIndex + 1].key,
              })
            }
            break
          case "Enter":
            e.preventDefault()
            startEditing()
            break
          case "Delete":
          case "Backspace":
            e.preventDefault()
            clearCell()
            break
        }
      }

      // Global shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "c":
            e.preventDefault()
            copyCell()
            break
          case "v":
            e.preventDefault()
            pasteCell()
            break
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case "y":
            e.preventDefault()
            redo()
            break
          case "s":
            e.preventDefault()
            saveChanges()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedCell, editingCell, paginatedBooks, copiedValue])

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
      addToHistory(booksData)
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

  const filterBooks = () => {
    let filtered = books

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(term) ||
          book.authors.some((author) => author.toLowerCase().includes(term)) ||
          book.genre?.toLowerCase().includes(term),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((book) => book.status === statusFilter)
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

  const addToHistory = (newBooks: Book[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      books: JSON.parse(JSON.stringify(newBooks)),
      timestamp: Date.now(),
    })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setBooks(JSON.parse(JSON.stringify(history[historyIndex - 1].books)))
      setHasUnsavedChanges(true)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setBooks(JSON.parse(JSON.stringify(history[historyIndex + 1].books)))
      setHasUnsavedChanges(true)
    }
  }

  const updateBookField = useCallback(
    (bookId: string, field: string, value: any) => {
      const updatedBooks = books.map((book) => {
        if (book.id === bookId) {
          let processedValue = value

          // Process array fields
          if (field === "authors" || field === "tags") {
            processedValue =
              typeof value === "string"
                ? value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : value
          }

          // Process number fields
          if (field === "totalPages" || field === "pagesRead") {
            processedValue = value === "" ? undefined : Number.parseInt(value) || 0
          }

          // Process boolean fields
          if (field === "isPublic" || field === "allowBorrow") {
            processedValue = value === "true" || value === true
          }

          return {
            ...book,
            [field]: processedValue,
            updatedAt: new Date(),
          }
        }
        return book
      })

      setBooks(updatedBooks)
      setHasUnsavedChanges(true)
    },
    [books],
  )

  const startEditing = () => {
    if (!selectedCell) return

    const book = paginatedBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    const column = COLUMNS.find((col) => col.key === selectedCell.col)
    if (!column) return

    let currentValue = book[selectedCell.col as keyof Book]

    if (column.type === "array" && Array.isArray(currentValue)) {
      currentValue = currentValue.join(", ")
    } else if (column.type === "boolean") {
      currentValue = currentValue ? "true" : "false"
    }

    setEditValue(String(currentValue || ""))
    setEditingCell(selectedCell)
  }

  const finishEditing = () => {
    if (!editingCell) return

    const book = paginatedBooks.find((b) => b.id === editingCell.row.toString())
    if (!book) return

    updateBookField(book.id, editingCell.col, editValue)
    setEditingCell(null)
    setEditValue("")
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditValue("")
  }

  const copyCell = () => {
    if (!selectedCell) return

    const book = paginatedBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    const value = book[selectedCell.col as keyof Book]
    const stringValue = Array.isArray(value) ? value.join(", ") : String(value || "")

    setCopiedValue(stringValue)
    navigator.clipboard.writeText(stringValue)

    toast({
      title: "Copied",
      description: "Cell value copied to clipboard",
    })
  }

  const pasteCell = () => {
    if (!selectedCell || !copiedValue) return

    const book = paginatedBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    updateBookField(book.id, selectedCell.col, copiedValue)

    toast({
      title: "Pasted",
      description: "Value pasted successfully",
    })
  }

  const clearCell = () => {
    if (!selectedCell) return

    const book = paginatedBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    const column = COLUMNS.find((col) => col.key === selectedCell.col)
    if (column?.type === "boolean") {
      updateBookField(book.id, selectedCell.col, false)
    } else {
      updateBookField(book.id, selectedCell.col, "")
    }
  }

  const saveChanges = async () => {
    if (!hasUnsavedChanges) return

    setSaving(true)
    try {
      const batch = writeBatch(db)

      books.forEach((book) => {
        const bookRef = doc(db, "books", book.id)
        batch.update(bookRef, {
          ...book,
          updatedAt: new Date(),
        })
      })

      await batch.commit()
      setHasUnsavedChanges(false)

      toast({
        title: "Changes saved",
        description: "All book updates have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving changes:", error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  const getCellValue = (book: Book, columnKey: string) => {
    const value = book[columnKey as keyof Book]
    if (Array.isArray(value)) {
      return value.join(", ")
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    }
    return String(value || "")
  }

  const isCellSelected = (bookId: string, columnKey: string) => {
    return selectedCell?.row.toString() === bookId && selectedCell?.col === columnKey
  }

  const isCellEditing = (bookId: string, columnKey: string) => {
    return editingCell?.row.toString() === bookId && editingCell?.col === columnKey
  }

  const isLongText = (text: string) => {
    return text.length > 30 || text.includes(",")
  }

  if (!user) return null

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="page-header">
            <div className="flex items-center gap-4">
              <Link href="/library">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
              <div>
                <h1 className="page-title">Excel-Style Bulk Editor</h1>
                <p className="page-description">
                  {filteredBooks.length} books • Page {currentPage} of {totalPages} • {selectedBooks.size} selected
                  {hasUnsavedChanges && " • ⚠️ Unsaved changes"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={saveChanges}
              disabled={!hasUnsavedChanges || saving}
              className={`${hasUnsavedChanges ? "bg-tertiary hover:bg-tertiary/90" : "btn-primary"}`}
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "All Saved"}
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <Card className="mb-6 bg-primary-container/40 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-foreground flex items-center gap-2">
              ⌨️ Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
              <div>
                <strong>Navigate:</strong> Arrow keys, Tab
              </div>
              <div>
                <strong>Edit:</strong> Enter, Double-click
              </div>
              <div>
                <strong>Copy/Paste:</strong> Ctrl+C, Ctrl+V
              </div>
              <div>
                <strong>Clear:</strong> Delete, Backspace
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search books..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Excel-style Table */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading books...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden border rounded-lg">
                <table ref={tableRef} className="w-full border-collapse bg-card">
                  <thead className="bg-gradient-to-r from-muted to-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left border-r border-border w-12 bg-muted">
                        <Checkbox
                          checked={selectedBooks.size === paginatedBooks.length && paginatedBooks.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          className="p-3 text-left border-r border-border font-semibold text-sm bg-muted text-foreground"
                          style={{ width: column.width }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBooks.map((book, rowIndex) => (
                      <tr
                        key={book.id}
                        className={`border-b border-border hover:bg-accent transition-colors ${
                          selectedBooks.has(book.id) ? "bg-primary-container/40" : ""
                        } ${rowIndex % 2 === 0 ? "bg-muted/30" : ""}`}
                      >
                        <td className="p-3 border-r border-border bg-muted/50">
                          <Checkbox
                            checked={selectedBooks.has(book.id)}
                            onCheckedChange={() => toggleBookSelection(book.id)}
                          />
                        </td>
                        {COLUMNS.map((column) => (
                          <td
                            key={`${book.id}-${column.key}`}
                            className={`border-r border-border relative transition-all duration-150 ${
                              isCellSelected(book.id, column.key)
                                ? "ring-2 ring-primary ring-inset bg-primary-container"
                                : "hover:bg-accent/30"
                            }`}
                            style={{ width: column.width }}
                            onClick={() =>
                              setSelectedCell({
                                row: Number.parseInt(book.id),
                                col: column.key,
                              })
                            }
                            onDoubleClick={() => {
                              setSelectedCell({
                                row: Number.parseInt(book.id),
                                col: column.key,
                              })
                              setTimeout(startEditing, 0)
                            }}
                          >
                            {isCellEditing(book.id, column.key) ? (
                              <div className="p-2">
                                {column.type === "select" ? (
                                  <Select
                                    value={editValue}
                                    onValueChange={(value) => {
                                      setEditValue(value)
                                      updateBookField(book.id, column.key, value)
                                      setEditingCell(null)
                                    }}
                                    open={true}
                                  >
                                    <SelectTrigger className="h-8 text-xs border-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(column.key === "status" ? STATUS_OPTIONS : FORMAT_OPTIONS).map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option.replace("-", " ")}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : column.type === "boolean" ? (
                                  <Select
                                    value={editValue}
                                    onValueChange={(value) => {
                                      setEditValue(value)
                                      updateBookField(book.id, column.key, value)
                                      setEditingCell(null)
                                    }}
                                    open={true}
                                  >
                                    <SelectTrigger className="h-8 text-xs border-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Yes</SelectItem>
                                      <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : isLongText(editValue) ? (
                                  <textarea
                                    ref={editTextareaRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={finishEditing}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        finishEditing()
                                      } else if (e.key === "Escape") {
                                        cancelEditing()
                                      }
                                    }}
                                    className="w-full h-20 text-xs border border-input rounded px-2 py-1 resize-none focus:ring-2 focus:ring-ring focus:border-primary bg-card"
                                    style={{ minHeight: "60px" }}
                                  />
                                ) : (
                                  <Input
                                    ref={editInputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={finishEditing}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        finishEditing()
                                      } else if (e.key === "Escape") {
                                        cancelEditing()
                                      }
                                    }}
                                    className="h-8 text-xs border-input focus:ring-2 focus:ring-ring focus:border-primary"
                                    type={column.type === "number" ? "number" : "text"}
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                className={`p-2 text-xs cursor-cell min-h-[36px] flex items-center transition-colors ${
                                  hasUnsavedChanges &&
                                  books.find((b) => b.id === book.id)?.[column.key as keyof Book] !==
                                    paginatedBooks.find((b) => b.id === book.id)?.[column.key as keyof Book]
                                    ? "bg-tertiary-container/50 border-l-2 border-tertiary"
                                    : ""
                                }`}
                              >
                                {column.key === "status" ? (
                                  <Badge
                                    className={`text-xs font-medium ${
                                      book.status === "reading"
                                        ? "status-reading"
                                        : book.status === "read"
                                          ? "status-read"
                                          : book.status === "will-read"
                                            ? "status-will-read"
                                            : book.status === "on-hold"
                                              ? "status-on-hold"
                                              : book.status === "abandoned"
                                                ? "status-abandoned"
                                                : "status-not-read"
                                    }`}
                                  >
                                    {book.status?.replace("-", " ") || "Unknown"}
                                  </Badge>
                                ) : column.key === "format" ? (
                                  <Badge variant="outline" className="text-xs font-medium">
                                    {book.format || "Unknown"}
                                  </Badge>
                                ) : column.key === "isPublic" ? (
                                  <Badge
                                    variant={book.isPublic ? "default" : "secondary"}
                                    className="text-xs font-medium"
                                  >
                                    {book.isPublic ? "Public" : "Private"}
                                  </Badge>
                                ) : column.key === "allowBorrow" ? (
                                  <Badge
                                    variant={book.allowBorrow ? "default" : "secondary"}
                                    className="text-xs font-medium"
                                  >
                                    {book.allowBorrow ? "Yes" : "No"}
                                  </Badge>
                                ) : (
                                  <div className="w-full overflow-hidden">
                                    <div className="truncate" title={getCellValue(book, column.key) || "Unknown"}>
                                      {getCellValue(book, column.key) || (
                                        <span className="text-muted-foreground italic">Unknown</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        ))}
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
                <div className="text-sm text-muted-foreground">
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

        {filteredBooks.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No books found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        )}

        {/* Status Bar */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-4 right-4 bg-tertiary-container text-on-tertiary-container border border-border rounded-[var(--radius-md)] p-3">
            <div className="flex items-center gap-2 text-on-tertiary-container">
              <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Unsaved changes</span>
              <Button size="sm" onClick={saveChanges} className="ml-2 bg-tertiary hover:bg-tertiary/90 text-white">
                Save Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
