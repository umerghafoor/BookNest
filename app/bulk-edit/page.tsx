"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import { Save, Download, Search, Filter, Eye, EyeOff } from "lucide-react"
import "@/styles/components.css"

interface EditableBook extends Book {
  isEdited?: boolean
  isSelected?: boolean
}

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

  const updateBook = (bookId: string, field: keyof Book, value: any) => {
    setBooks((prevBooks) =>
      prevBooks.map((book) => (book.id === bookId ? { ...book, [field]: value, isEdited: true } : book)),
    )
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
    const headers = [
      "Title",
      "Subtitle",
      "Authors",
      "Genre",
      "ISBN",
      "Format",
      "Status",
      "Total Pages",
      "Pages Read",
      "Tags",
      "Public",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredBooks.map((book) =>
        [
          `"${book.title}"`,
          `"${book.subtitle || ""}"`,
          `"${book.authors.join("; ")}"`,
          `"${book.genre || ""}"`,
          `"${book.isbn || ""}"`,
          `"${book.format}"`,
          `"${book.status}"`,
          book.totalPages || "",
          book.pagesRead || "",
          `"${book.tags.join("; ")}"`,
          book.isPublic ? "Yes" : "No",
        ].join(","),
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
            <h1 className="page-title">Bulk Edit Books</h1>
            <p className="page-description">
              Edit multiple books at once • {filteredBooks.length} books • {selectedCount} selected
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Books Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={filteredBooks.length > 0 && filteredBooks.every((book) => book.isSelected)}
                        onCheckedChange={selectAllVisible}
                      />
                    </th>
                    <th className="p-3 text-left font-medium">Title</th>
                    <th className="p-3 text-left font-medium">Authors</th>
                    <th className="p-3 text-left font-medium">Genre</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Format</th>
                    <th className="p-3 text-left font-medium">Pages</th>
                    <th className="p-3 text-left font-medium">Progress</th>
                    <th className="p-3 text-left font-medium">Public</th>
                    <th className="p-3 text-left font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr
                      key={book.id}
                      className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        book.isEdited ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={book.isSelected || false}
                          onCheckedChange={() => toggleBookSelection(book.id)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={book.title}
                          onChange={(e) => updateBook(book.id, "title", e.target.value)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={book.authors.join(", ")}
                          onChange={(e) =>
                            updateBook(
                              book.id,
                              "authors",
                              e.target.value.split(", ").filter((a) => a.trim()),
                            )
                          }
                          className="min-w-[150px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={book.genre || ""}
                          onChange={(e) => updateBook(book.id, "genre", e.target.value)}
                          className="min-w-[120px]"
                        />
                      </td>
                      <td className="p-3">
                        <Select value={book.status} onValueChange={(value) => updateBook(book.id, "status", value)}>
                          <SelectTrigger className="min-w-[120px]">
                            <SelectValue />
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
                      </td>
                      <td className="p-3">
                        <Select value={book.format} onValueChange={(value) => updateBook(book.id, "format", value)}>
                          <SelectTrigger className="min-w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Physical</SelectItem>
                            <SelectItem value="ebook">eBook</SelectItem>
                            <SelectItem value="audiobook">Audiobook</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={book.totalPages || ""}
                          onChange={(e) =>
                            updateBook(
                              book.id,
                              "totalPages",
                              e.target.value ? Number.parseInt(e.target.value) : undefined,
                            )
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={book.pagesRead || ""}
                          onChange={(e) =>
                            updateBook(
                              book.id,
                              "pagesRead",
                              e.target.value ? Number.parseInt(e.target.value) : undefined,
                            )
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateBook(book.id, "isPublic", !book.isPublic)}
                          className={book.isPublic ? "text-green-600" : "text-slate-400"}
                        >
                          {book.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="p-3">
                        <Input
                          value={book.tags.join(", ")}
                          onChange={(e) =>
                            updateBook(
                              book.id,
                              "tags",
                              e.target.value.split(", ").filter((t) => t.trim()),
                            )
                          }
                          className="min-w-[150px]"
                        />
                      </td>
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
      </div>
    </div>
  )
}
