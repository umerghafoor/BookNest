"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book, Note } from "@/lib/types"
import { BookOpen, Edit, Plus, ExternalLink, MapPin, Calendar, User } from "lucide-react"
import Link from "next/link"
import React from "react"

export default function BookDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newNote, setNewNote] = useState({ content: "", pageNumber: "" })
  const [updatedProgress, setUpdatedProgress] = useState({ pagesRead: "" })

  useEffect(() => {
    if (user && unwrappedParams.id) {
      loadBook()
    }
  }, [user, unwrappedParams.id])

  const loadBook = async () => {
    if (!user) return

    try {
      const bookDoc = await getDoc(doc(db, "books", unwrappedParams.id))
      if (bookDoc.exists()) {
        const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
        if (bookData.userId === user.uid) {
          setBook(bookData)
          setUpdatedProgress({ pagesRead: bookData.pagesRead?.toString() || "" })
        } else {
          router.push("/library")
        }
      } else {
        router.push("/library")
      }
    } catch (error) {
      console.error("Error loading book:", error)
      toast({
        title: "Error",
        description: "Failed to load book details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!book || !newNote.content.trim()) return

    try {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote.content.trim(),
        pageNumber: newNote.pageNumber ? Number.parseInt(newNote.pageNumber) : undefined,
        createdAt: new Date(),
      }

      await updateDoc(doc(db, "books", book.id), {
        notes: arrayUnion(note),
        updatedAt: serverTimestamp(),
      })

      setBook((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : null))
      setNewNote({ content: "", pageNumber: "" })

      toast({
        title: "Note added",
        description: "Your note has been saved.",
      })
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "Failed to add note.",
        variant: "destructive",
      })
    }
  }

  const updateProgress = async () => {
    if (!book) return

    try {
      const pagesRead = updatedProgress.pagesRead ? Number.parseInt(updatedProgress.pagesRead) : 0

      await updateDoc(doc(db, "books", book.id), {
        pagesRead,
        updatedAt: serverTimestamp(),
      })

      setBook((prev) => (prev ? { ...prev, pagesRead } : null))

      toast({
        title: "Progress updated",
        description: "Your reading progress has been saved.",
      })
    } catch (error) {
      console.error("Error updating progress:", error)
      toast({
        title: "Error",
        description: "Failed to update progress.",
        variant: "destructive",
      })
    }
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

  const getProgressPercentage = () => {
    if (!book?.totalPages || !book?.pagesRead) return 0
    return Math.round((book.pagesRead / book.totalPages) * 100)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Book not found</h1>
          <Link href="/library">
            <Button>Back to Library</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
            {book.subtitle && <p className="text-lg text-muted-foreground mb-2">{book.subtitle}</p>}
            <p className="text-muted-foreground">by {book.authors.join(", ")}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/edit-book/${book.id}`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Book
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Book Details */}
            <Card>
              <CardHeader>
                <CardTitle>Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-32 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage || "/placeholder.svg"}
                        alt={book.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-primary" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(book.status)}>{book.status.replace("-", " ")}</Badge>
                      <Badge variant="outline">{book.format}</Badge>
                    </div>
                    {book.genre && (
                      <p className="text-sm">
                        <strong>Genre:</strong> {book.genre}
                      </p>
                    )}
                    {book.isbn && (
                      <p className="text-sm">
                        <strong>ISBN:</strong> {book.isbn}
                      </p>
                    )}
                    {book.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {book.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {book.totalPages && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Reading Progress</h4>
                      <span className="text-sm text-muted-foreground">
                        {book.pagesRead || 0} / {book.totalPages} pages ({getProgressPercentage()}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Pages read"
                        value={updatedProgress.pagesRead}
                        onChange={(e) => setUpdatedProgress({ pagesRead: e.target.value })}
                        className="w-32"
                      />
                      <Button onClick={updateProgress} size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                )}

                {/* Locations or Links */}
                {book.format === "physical" && book.locations && book.locations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Locations
                    </h4>
                    <ul className="space-y-1">
                      {book.locations.map((location, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {location}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {book.format === "ebook" && book.links && book.links.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Links
                    </h4>
                    <ul className="space-y-1">
                      {book.links.map((link, index) => (
                        <li key={index}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Borrowing Info */}
                {book.borrowInfo?.isBorrowed && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800 mb-1 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Borrowed Book
                    </h4>
                    <p className="text-sm text-yellow-700">Borrowed by: {book.borrowInfo.borrowerName}</p>
                    {book.borrowInfo.returnDate && (
                      <p className="text-sm text-yellow-700 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Return date: {book.borrowInfo.returnDate}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Your thoughts and highlights from this book</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3">
                      <Textarea
                        placeholder="Add a note..."
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pageNumber" className="text-xs">
                        Page #
                      </Label>
                      <Input
                        id="pageNumber"
                        type="number"
                        placeholder="Page"
                        value={newNote.pageNumber}
                        onChange={(e) => setNewNote({ ...newNote, pageNumber: e.target.value })}
                      />
                      <Button onClick={addNote} size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes List */}
                {book.notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No notes yet. Add your first note above!</p>
                ) : (
                  <div className="space-y-3">
                    {book.notes
                      .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0))
                      .map((note) => (
                        <div key={note.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            {note.pageNumber && (
                              <Badge variant="outline" className="text-xs">
                                Page {note.pageNumber}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/edit-book/${book.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Book Details
                  </Button>
                </Link>
                <Link href="/library">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Back to Library
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Book Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Book Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Added</span>
                  <span className="text-sm">{new Date(book.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm">{new Date(book.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <span className="text-sm">{book.notes.length}</span>
                </div>
                {book.totalPages && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm">{getProgressPercentage()}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
