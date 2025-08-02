"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import { Save, Download, Search, Filter, Undo, Redo } from "lucide-react"
import "@/styles/components.css"

interface EditableBook extends Book {
  isEdited?: boolean
  isSelected?: boolean
}

interface CellPosition {
  row: number
  col: number
}

interface EditingCell {
  row: number
  col: string
  value: string
}

const COLUMNS = [
  { key: "title", label: "Title", width: "200px", editable: true },
  { key: "authors", label: "Authors", width: "150px", editable: true },
  { key: "genre", label: "Genre", width: "120px", editable: true },
  { key: "status", label: "Status", width: "120px", editable: true, type: "select" },
  { key: "format", label: "Format", width: "100px", editable: true, type: "select" },
  { key: "totalPages", label: "Total Pages", width: "100px", editable: true, type: "number" },
  { key: "pagesRead", label: "Pages Read", width: "100px", editable: true, type: "number" },
  { key: "tags", label: "Tags", width: "150px", editable: true },
  { key: "isPublic", label: "Public", width: "80px", editable: true, type: "boolean" },
]

const STATUS_OPTIONS = ["not-read", "reading", "read", "will-read", "on-hold", "abandoned"]
const FORMAT_OPTIONS = ["physical", "ebook", "audiobook"]

export default function BulkEditPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [books, setBooks] = useState<EditableBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<EditableBook[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")
  const [selectedCount, setSelectedCount] = useState(0)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [clipboard, setClipboard] = useState<string>("")
  const [undoStack, setUndoStack] = useState<EditableBook[][]>([])
  const [redoStack, setRedoStack] = useState<EditableBook[][]>([])

  const tableRef = useRef<HTMLTableElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      loadBooks()
    }
  }, [user])

  useEffect(() => {
    filterBooks()
  }, [books, searchTerm, statusFilter, formatFilter])

  useEffect(() => {
    setSelectedCount(filteredBooks.filter((book) => book.isSelected).length)
  }, [filteredBooks])

  // Auto-focus edit input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || editingCell) return

      const { row, col } = selectedCell
      let newRow = row
      let newCol = col

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          newRow = Math.max(0, row - 1)
          break
        case "ArrowDown":
          e.preventDefault()
          newRow = Math.min(filteredBooks.length - 1, row + 1)
          break
        case "ArrowLeft":
          e.preventDefault()
          newCol = Math.max(0, col - 1)
          break
        case "ArrowRight":
        case "Tab":
          e.preventDefault()
          newCol = Math.min(COLUMNS.length - 1, col + 1)
          break
        case "Enter":
          e.preventDefault()
          startEditing(row, COLUMNS[col].key)
          break
        case "Delete":
        case "Backspace":
          e.preventDefault()
          clearCell(row, COLUMNS[col].key)
          break
        case "c":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            copyCell(row, COLUMNS[col].key)
          }
          break
        case "v":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            pasteCell(row, COLUMNS[col].key)
          }
          break
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
      }

      if (newRow !== row || newCol !== col) {
        setSelectedCell({ row: newRow, col: newCol })
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedCell, editingCell, filteredBooks.length, clipboard])

  const loadBooks = async () => {
    if (!user) return

    try {
      const booksRef = collection(db, "books")
      const userBooksQuery = query(booksRef, where("userId", "==", user.uid))
      const snapshot = await getDocs(userBooksQuery)

      const booksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isEdited: false,
        isSelected: false,
      })) as EditableBook[]

      setBooks(booksData)
      setUndoStack([booksData])
    } catch (error) {
      console.error("Error loading books:", error)
      toast({
        title: "Error",
        description: "Failed to load books.",
        variant: "destructive",
      })
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
          book.authors.some((author) => author.toLowerCase().includes(searchTerm.toLowerCase())),
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

  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), [...books]])
    setRedoStack([])
  }, [books])

  const updateBook = (bookId: string, field: keyof Book, value: any) => {
    saveToUndoStack()
    setBooks((prevBooks) =>
      prevBooks.map((book) => (book.id === bookId ? { ...book, [field]: value, isEdited: true } : book)),
    )
  }

  const startEditing = (rowIndex: number, field: string) => {
    const book = filteredBooks[rowIndex]
    if (!book) return

    let value = ""
    switch (field) {
      case "authors":
        value = book.authors.join(", ")
        break
      case "tags":
        value = book.tags.join(", ")
        break
      case "isPublic":
        value = book.isPublic ? "true" : "false"
        break
      default:
        value = String(book[field as keyof Book] || "")
    }

    setEditingCell({ row: rowIndex, col: field, value })
  }

  const finishEditing = (save = true) => {
    if (!editingCell) return

    if (save) {
      const book = filteredBooks[editingCell.row]
      if (book) {
        let processedValue: any = editingCell.value

        switch (editingCell.col) {
          case "authors":
            processedValue = editingCell.value
              .split(",")
              .map((a) => a.trim())
              .filter((a) => a)
            break
          case "tags":
            processedValue = editingCell.value
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t)
            break
          case "totalPages":
          case "pagesRead":
            processedValue = editingCell.value ? Number.parseInt(editingCell.value) : null
            break
          case "isPublic":
            processedValue = editingCell.value === "true"
            break
        }

        updateBook(book.id, editingCell.col as keyof Book, processedValue)
      }
    }

    setEditingCell(null)
  }

  const handleCellClick = (rowIndex: number, colIndex: number, field: string) => {
    setSelectedCell({ row: rowIndex, col: colIndex })

    // Double click to edit
    if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
      startEditing(rowIndex, field)
    }
  }

  const handleCellDoubleClick = (rowIndex: number, field: string) => {
    startEditing(rowIndex, field)
  }

  const clearCell = (rowIndex: number, field: string) => {
    const book = filteredBooks[rowIndex]
    if (!book) return

    let clearValue: any = ""
    switch (field) {
      case "authors":
      case "tags":
        clearValue = []
        break
      case "totalPages":
      case "pagesRead":
        clearValue = null
        break
      case "isPublic":
        clearValue = false
        break
    }

    updateBook(book.id, field as keyof Book, clearValue)
  }

  const copyCell = (rowIndex: number, field: string) => {
    const book = filteredBooks[rowIndex]
    if (!book) return

    let value = ""
    switch (field) {
      case "authors":
        value = book.authors.join(", ")
        break
      case "tags":
        value = book.tags.join(", ")
        break
      case "isPublic":
        value = book.isPublic ? "true" : "false"
        break
      default:
        value = String(book[field as keyof Book] || "")
    }

    setClipboard(value)
    toast({
      title: "Copied",
      description: "Cell value copied to clipboard",
    })
  }

  const pasteCell = (rowIndex: number, field: string) => {
    if (!clipboard) return

    const book = filteredBooks[rowIndex]
    if (!book) return

    let processedValue: any = clipboard

    switch (field) {
      case "authors":
        processedValue = clipboard
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a)
        break
      case "tags":
        processedValue = clipboard
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
        break
      case "totalPages":
      case "pagesRead":
        processedValue = clipboard ? Number.parseInt(clipboard) : null
        break
      case "isPublic":
        processedValue = clipboard === "true"
        break
    }

    updateBook(book.id, field as keyof Book, processedValue)
  }

  const undo = () => {
    if (undoStack.length <= 1) return

    const currentState = undoStack[undoStack.length - 1]
    const previousState = undoStack[undoStack.length - 2]

    setRedoStack((prev) => [...prev, currentState])
    setUndoStack((prev) => prev.slice(0, -1))
    setBooks(previousState)
  }

  const redo = () => {
    if (redoStack.length === 0) return

    const nextState = redoStack[redoStack.length - 1]
    setUndoStack((prev) => [...prev, nextState])
    setRedoStack((prev) => prev.slice(0, -1))
    setBooks(nextState)
  }

  const toggleBookSelection = (bookId: string) => {
    setBooks((prevBooks) =>
      prevBooks.map((book) => (book.id === bookId ? { ...book, isSelected: !book.isSelected } : book)),
    )
  }

  const selectAllVisible = () => {
    const allSelected = filteredBooks.every((book) => book.isSelected)
    setBooks((prevBooks) =>
      prevBooks.map((book) => {
        const isVisible = filteredBooks.some((fb) => fb.id === book.id)
        return isVisible ? { ...book, isSelected: !allSelected } : book
      }),
    )
  }

  const bulkUpdateField = (field: keyof Book, value: any) => {
    saveToUndoStack()
    setBooks((prevBooks) =>
      prevBooks.map((book) => (book.isSelected ? { ...book, [field]: value, isEdited: true } : book)),
    )
  }

  const saveChanges = async () => {
    if (!user) return

    const editedBooks = books.filter((book) => book.isEdited)
    if (editedBooks.length === 0) {
      toast({
        title: "No changes",
        description: "No books have been modified.",
      })
      return
    }

    setSaving(true)
    try {
      const batch = writeBatch(db)

      editedBooks.forEach((book) => {
        const bookRef = doc(db, "books", book.id)
        const { isEdited, isSelected, ...bookData } = book
        batch.update(bookRef, {
          ...bookData,
          updatedAt: new Date(),
        })
      })

      await batch.commit()

      setBooks((prevBooks) => prevBooks.map((book) => ({ ...book, isEdited: false })))

      toast({
        title: "Changes saved",
        description: `Updated ${editedBooks.length} books successfully.`,
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

  const exportToCSV = () => {
    const headers = COLUMNS.map((col) => col.label)

    const csvContent = [
      headers.join(","),
      ...filteredBooks.map((book) =>
        COLUMNS.map((col) => {
          let value = ""
          switch (col.key) {
            case "authors":
              value = book.authors.join("; ")
              break
            case "tags":
              value = book.tags.join("; ")
              break
            case "isPublic":
              value = book.isPublic ? "Yes" : "No"
              break
            default:
              value = String(book[col.key as keyof Book] || "")
          }
          return `"${value}"`
        }).join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `booknest-bulk-edit-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getCellValue = (book: EditableBook, field: string) => {
    switch (field) {
      case "authors":
        return book.authors.join(", ")
      case "tags":
        return book.tags.join(", ")
      case "isPublic":
        return book.isPublic ? "Yes" : "No"
      default:
        return String(book[field as keyof Book] || "")
    }
  }

  const renderCell = (book: EditableBook, rowIndex: number, colIndex: number, column: any) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === column.key
    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
    const isEdited = book.isEdited

    if (isEditing) {
      if (column.type === "select") {
        const options = column.key === "status" ? STATUS_OPTIONS : FORMAT_OPTIONS
        return (
          <Select
            value={editingCell.value}
            onValueChange={(value) => setEditingCell((prev) => (prev ? { ...prev, value } : null))}
            onOpenChange={(open) => !open && finishEditing()}
          >
            <SelectTrigger className="h-8 border-0 focus:ring-2 focus:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      return (
        <Input
          ref={editInputRef}
          type={column.type === "number" ? "number" : "text"}
          value={editingCell.value}
          onChange={(e) => setEditingCell((prev) => (prev ? { ...prev, value: e.target.value } : null))}
          onBlur={() => finishEditing()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              finishEditing()
            } else if (e.key === "Escape") {
              finishEditing(false)
            }
          }}
          className="h-8 border-0 focus:ring-2 focus:ring-blue-500"
        />
      )
    }

    return (
      <div
        className={`
          h-8 px-2 py-1 cursor-cell hover:bg-slate-50 dark:hover:bg-slate-800 
          ${isSelected ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500" : ""}
          ${isEdited ? "bg-orange-50 dark:bg-orange-900/20" : ""}
          transition-colors duration-150
        `}
        onClick={() => handleCellClick(rowIndex, colIndex, column.key)}
        onDoubleClick={() => handleCellDoubleClick(rowIndex, column.key)}
      >
        {getCellValue(book, column.key)}
      </div>
    )
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="page-container">
        <Navigation />
        <div className="content-container">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="page-header">
            <h1 className="page-title">Excel-Style Bulk Editor</h1>
            <p className="page-description">
              Edit books like a spreadsheet • {filteredBooks.length} books • {selectedCount} selected
            </p>
            <div className="text-xs text-slate-500 mt-1">
              Use arrow keys to navigate • Enter to edit • Ctrl+C/V to copy/paste • Ctrl+Z/Y to undo/redo
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={undo} disabled={undoStack.length <= 1} variant="outline" size="sm">
              <Undo className="h-4 w-4" />
            </Button>
            <Button onClick={redo} disabled={redoStack.length === 0} variant="outline" size="sm">
              <Redo className="h-4 w-4" />
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={saveChanges}
              disabled={saving || !books.some((book) => book.isEdited)}
              className="btn-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bulk Actions ({selectedCount} books selected)</CardTitle>
              <CardDescription>Apply changes to all selected books</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select onValueChange={(value) => bulkUpdateField("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change status" />
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
                  <Select onValueChange={(value) => bulkUpdateField("format", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="ebook">eBook</SelectItem>
                      <SelectItem value="audiobook">Audiobook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select onValueChange={(value) => bulkUpdateField("isPublic", value === "true")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Private</SelectItem>
                      <SelectItem value="true">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Excel-Style Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[70vh]">
              <table ref={tableRef} className="w-full border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 text-left border-r border-slate-200 dark:border-slate-700 w-12">
                      <Checkbox
                        checked={filteredBooks.length > 0 && filteredBooks.every((book) => book.isSelected)}
                        onCheckedChange={selectAllVisible}
                      />
                    </th>
                    {COLUMNS.map((column, index) => (
                      <th
                        key={column.key}
                        className="p-2 text-left font-medium border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        style={{ width: column.width, minWidth: column.width }}
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
                      className={`
                        border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50
                        ${book.isEdited ? "bg-orange-50 dark:bg-orange-900/10" : ""}
                      `}
                    >
                      <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                        <Checkbox
                          checked={book.isSelected || false}
                          onCheckedChange={() => toggleBookSelection(book.id)}
                        />
                      </td>
                      {COLUMNS.map((column, colIndex) => (
                        <td
                          key={column.key}
                          className="border-r border-slate-200 dark:border-slate-700 p-0"
                          style={{ width: column.width, minWidth: column.width }}
                        >
                          {renderCell(book, rowIndex, colIndex, column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No books match your filters.</p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Excel-Style Controls:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-200">
            <div>• Click to select cell, double-click to edit</div>
            <div>• Arrow keys to navigate between cells</div>
            <div>• Enter to start editing, Escape to cancel</div>
            <div>• Tab to move to next cell</div>
            <div>• Ctrl+C to copy, Ctrl+V to paste</div>
            <div>• Ctrl+Z to undo, Ctrl+Y to redo</div>
            <div>• Delete/Backspace to clear cell</div>
            <div>• Changes auto-save when you move to another cell</div>
          </div>
        </div>
      </div>
    </div>
  )
}
