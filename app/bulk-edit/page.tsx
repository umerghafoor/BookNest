"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Save, Undo2, Redo2, ArrowLeft, Search, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
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
  { key: "title", label: "Title", type: "text", width: "200px" },
  { key: "authors", label: "Authors", type: "array", width: "150px" },
  { key: "genre", label: "Genre", type: "text", width: "120px" },
  { key: "status", label: "Status", type: "select", width: "120px" },
  { key: "format", label: "Format", type: "select", width: "100px" },
  { key: "totalPages", label: "Pages", type: "number", width: "80px" },
  { key: "pagesRead", label: "Read", type: "number", width: "80px" },
  { key: "tags", label: "Tags", type: "array", width: "150px" },
  { key: "isbn", label: "ISBN", type: "text", width: "120px" },
]

const STATUS_OPTIONS = ["not-read", "reading", "read", "will-read", "on-hold", "abandoned"]
const FORMAT_OPTIONS = ["physical", "ebook", "audiobook"]

export default function BulkEditPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
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

  const tableRef = useRef<HTMLTableElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      loadBooks()
    }
  }, [user])

  useEffect(() => {
    filterBooks()
  }, [books, searchTerm, statusFilter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return // Don't handle shortcuts while editing

      // Navigation shortcuts
      if (selectedCell) {
        const currentRowIndex = filteredBooks.findIndex((book) => book.id === selectedCell.row.toString())
        const currentColIndex = COLUMNS.findIndex((col) => col.key === selectedCell.col)

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault()
            if (currentRowIndex > 0) {
              setSelectedCell({
                row: Number.parseInt(filteredBooks[currentRowIndex - 1].id),
                col: selectedCell.col,
              })
            }
            break
          case "ArrowDown":
            e.preventDefault()
            if (currentRowIndex < filteredBooks.length - 1) {
              setSelectedCell({
                row: Number.parseInt(filteredBooks[currentRowIndex + 1].id),
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
  }, [selectedCell, editingCell, filteredBooks, copiedValue])

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
  }

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

  const updateBookField = (bookId: string, field: string, value: any) => {
    const updatedBooks = books.map((book) => {
      if (book.id === bookId) {
        let processedValue = value

        // Process array fields
        if (field === "authors" || field === "tags") {
          processedValue = typeof value === "string" ? value.split(",").map((item) => item.trim()) : value
        }

        // Process number fields
        if (field === "totalPages" || field === "pagesRead") {
          processedValue = value === "" ? undefined : Number.parseInt(value) || 0
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
    addToHistory(updatedBooks)
    setHasUnsavedChanges(true)
  }

  const startEditing = () => {
    if (!selectedCell) return

    const book = filteredBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    const column = COLUMNS.find((col) => col.key === selectedCell.col)
    if (!column) return

    let currentValue = book[selectedCell.col as keyof Book]

    if (column.type === "array" && Array.isArray(currentValue)) {
      currentValue = currentValue.join(", ")
    }

    setEditValue(String(currentValue || ""))
    setEditingCell(selectedCell)

    // Focus input after state update
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }

  const finishEditing = () => {
    if (!editingCell) return

    const book = filteredBooks.find((b) => b.id === editingCell.row.toString())
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

    const book = filteredBooks.find((b) => b.id === selectedCell.row.toString())
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

    const book = filteredBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    updateBookField(book.id, selectedCell.col, copiedValue)

    toast({
      title: "Pasted",
      description: "Value pasted successfully",
    })
  }

  const clearCell = () => {
    if (!selectedCell) return

    const book = filteredBooks.find((b) => b.id === selectedCell.row.toString())
    if (!book) return

    updateBookField(book.id, selectedCell.col, "")
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
    if (selectedBooks.size === filteredBooks.length) {
      setSelectedBooks(new Set())
    } else {
      setSelectedBooks(new Set(filteredBooks.map((book) => book.id)))
    }
  }

  const getCellValue = (book: Book, columnKey: string) => {
    const value = book[columnKey as keyof Book]
    if (Array.isArray(value)) {
      return value.join(", ")
    }
    return String(value || "")
  }

  const isCellSelected = (bookId: string, columnKey: string) => {
    return selectedCell?.row.toString() === bookId && selectedCell?.col === columnKey
  }

  const isCellEditing = (bookId: string, columnKey: string) => {
    return editingCell?.row.toString() === bookId && editingCell?.col === columnKey
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
                <h1 className="page-title">Bulk Edit</h1>
                <p className="page-description">
                  {filteredBooks.length} books • {selectedBooks.size} selected
                  {hasUnsavedChanges && " • Unsaved changes"}
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
              className="btn-primary"
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <strong>Navigation:</strong> Arrow keys, Tab
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading books...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[70vh]">
                <table ref={tableRef} className="w-full border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left border-r border-slate-200 dark:border-slate-700 w-12">
                        <Checkbox
                          checked={selectedBooks.size === filteredBooks.length && filteredBooks.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      {COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          className="p-2 text-left border-r border-slate-200 dark:border-slate-700 font-medium text-sm"
                          style={{ minWidth: column.width }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book, rowIndex) => (
                      <tr
                        key={book.id}
                        className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          selectedBooks.has(book.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                          <Checkbox
                            checked={selectedBooks.has(book.id)}
                            onCheckedChange={() => toggleBookSelection(book.id)}
                          />
                        </td>
                        {COLUMNS.map((column) => (
                          <td
                            key={`${book.id}-${column.key}`}
                            className={`p-0 border-r border-slate-200 dark:border-slate-700 relative ${
                              isCellSelected(book.id, column.key)
                                ? "ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20"
                                : ""
                            }`}
                            style={{ minWidth: column.width }}
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
                                    <SelectTrigger className="h-8 text-xs border-none shadow-none p-0">
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
                                    className="h-8 text-xs border-none shadow-none p-1 bg-white dark:bg-slate-800"
                                    type={column.type === "number" ? "number" : "text"}
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                className={`p-2 text-xs cursor-cell min-h-[32px] flex items-center ${
                                  hasUnsavedChanges &&
                                  books.find((b) => b.id === book.id)?.[column.key as keyof Book] !==
                                    filteredBooks.find((b) => b.id === book.id)?.[column.key as keyof Book]
                                    ? "bg-orange-50 dark:bg-orange-900/20"
                                    : ""
                                }`}
                              >
                                {column.key === "status" ? (
                                  <Badge
                                    className={`text-xs ${
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
                                  <Badge variant="outline" className="text-xs">
                                    {book.format || "Unknown"}
                                  </Badge>
                                ) : (
                                  <span className="truncate">
                                    {getCellValue(book, column.key) || <span className="text-slate-400">Unknown</span>}
                                  </span>
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

        {filteredBooks.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No books found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your search or filter criteria</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
