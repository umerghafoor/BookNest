"use client"

import type React from "react"
import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import { Plus, X, Upload, FileText, ImageIcon } from "lucide-react"
import { CSVUploader } from "@/components/csv-uploader"
import { ThumbnailUploader } from "@/components/thumbnail-uploader"
import { generateThumbnail } from "@/lib/thumbnail-utils"

export default function AddBookPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    authors: [""],
    genre: "",
    isbn: "",
    format: "physical" as "physical" | "ebook" | "audiobook",
    status: "not-read" as Book["status"],
    totalPages: "",
    pagesRead: "",
    locations: [""],
    links: [""],
    tags: [] as string[],
  })

  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: "authors" | "locations" | "links", index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }))
  }

  const addArrayItem = (field: "authors" | "locations" | "links") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }))
  }

  const removeArrayItem = (field: "authors" | "locations" | "links", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleThumbnailSelect = (file: File, preview: string) => {
    setThumbnail(file)
    setThumbnailPreview(preview)
  }

  const uploadThumbnail = async (file: File): Promise<string> => {
    const resizedFile = await generateThumbnail(file)
    const thumbnailRef = ref(storage, `thumbnails/${user!.uid}/${Date.now()}_${file.name}`)
    const snapshot = await uploadBytes(thumbnailRef, resizedFile)
    return await getDownloadURL(snapshot.ref)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      let coverImageUrl = null

      // Upload thumbnail if provided
      if (thumbnail) {
        coverImageUrl = await uploadThumbnail(thumbnail)
      }

      const bookData = {
        userId: user.uid,
        title: formData.title,
        subtitle: formData.subtitle.trim() || null,
        authors: formData.authors.filter((author) => author.trim()),
        genre: formData.genre.trim() || null,
        isbn: formData.isbn.trim() || null,
        format: formData.format,
        status: formData.status,
        totalPages: formData.totalPages ? Number.parseInt(formData.totalPages) : null,
        pagesRead: formData.pagesRead ? Number.parseInt(formData.pagesRead) : null,
        locations: formData.format === "physical" ? formData.locations.filter((loc) => loc.trim()) : null,
        links: formData.format === "ebook" ? formData.links.filter((link) => link.trim()) : null,
        tags: formData.tags,
        coverImage: coverImageUrl,
        notes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Remove null fields before sending to Firestore
      const cleanBookData = Object.fromEntries(Object.entries(bookData).filter(([_, value]) => value !== null))

      await addDoc(collection(db, "books"), cleanBookData)

      toast({
        title: "Book added!",
        description: `"${formData.title}" has been added to your library.`,
      })

      router.push("/library")
    } catch (error) {
      console.error("Error adding book:", error)
      toast({
        title: "Error",
        description: "Failed to add book. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUploadComplete = () => {
    toast({
      title: "Books imported successfully!",
      description: "All books from your CSV have been added to your library.",
    })
    router.push("/library")
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Add Books</h1>
          <p className="text-muted-foreground">Add books to your personal library individually or in bulk</p>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Single Book
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import (CSV)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Thumbnail Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Book Cover
                  </CardTitle>
                  <CardDescription>Upload a cover image for your book (optional)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ThumbnailUploader
                    onThumbnailSelect={handleThumbnailSelect}
                    preview={thumbnailPreview}
                    bookTitle={formData.title}
                  />
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Enter the basic details about your book</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => handleInputChange("subtitle", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Authors *</Label>
                    {formData.authors.map((author, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={author}
                          onChange={(e) => handleArrayChange("authors", index, e.target.value)}
                          placeholder="Author name"
                          required={index === 0}
                        />
                        {formData.authors.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeArrayItem("authors", index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("authors")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Author
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="genre">Genre</Label>
                      <Input
                        id="genre"
                        value={formData.genre}
                        onChange={(e) => handleInputChange("genre", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input
                        id="isbn"
                        value={formData.isbn}
                        onChange={(e) => handleInputChange("isbn", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Format and Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Format & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(value: any) => handleInputChange("format", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Physical Book</SelectItem>
                          <SelectItem value="ebook">eBook</SelectItem>
                          <SelectItem value="audiobook">Audiobook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reading Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => handleInputChange("status", value)}
                      >
                        <SelectTrigger>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalPages">Total Pages</Label>
                      <Input
                        id="totalPages"
                        type="number"
                        value={formData.totalPages}
                        onChange={(e) => handleInputChange("totalPages", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pagesRead">Pages Read</Label>
                      <Input
                        id="pagesRead"
                        type="number"
                        value={formData.pagesRead}
                        onChange={(e) => handleInputChange("pagesRead", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locations or Links */}
              <Card>
                <CardHeader>
                  <CardTitle>{formData.format === "physical" ? "Locations" : "Links"}</CardTitle>
                  <CardDescription>
                    {formData.format === "physical" ? "Where is this book located?" : "Add links to your digital book"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(formData.format === "physical" ? formData.locations : formData.links).map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) =>
                          handleArrayChange(
                            formData.format === "physical" ? "locations" : "links",
                            index,
                            e.target.value,
                          )
                        }
                        placeholder={formData.format === "physical" ? "e.g., Living room shelf" : "e.g., https://..."}
                      />
                      {(formData.format === "physical" ? formData.locations : formData.links).length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem(formData.format === "physical" ? "locations" : "links", index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem(formData.format === "physical" ? "locations" : "links")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {formData.format === "physical" ? "Location" : "Link"}
                  </Button>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>Add tags to organize and categorize your book</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag}>
                      Add
                    </Button>
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer">
                          {tag}
                          <X className="h-3 w-3 ml-1" onClick={() => removeTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Adding Book..." : "Add Book"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <CSVUploader onUploadComplete={handleBulkUploadComplete} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
