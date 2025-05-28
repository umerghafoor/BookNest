"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Upload, FileText, Download, AlertCircle } from "lucide-react"
import type { Book } from "@/lib/types"
import { Input } from "@/components/ui/input"

interface CSVUploaderProps {
  onUploadComplete: () => void
}

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  title: string
  subtitle: string
  authors: string
  genre: string
  isbn: string
  format: string
  status: string
  totalPages: string
  pagesRead: string
  tags: string
}

export function CSVUploader({ onUploadComplete }: CSVUploaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: "",
    subtitle: "",
    authors: "",
    genre: "",
    isbn: "",
    format: "",
    status: "",
    totalPages: "",
    pagesRead: "",
    tags: "",
  })
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload")
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV file must have at least a header row and one data row.",
          variant: "destructive",
        })
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        return row
      })

      setCsvHeaders(headers)
      setCsvData(data)
      setStep("mapping")
    }
    reader.readAsText(file)
  }

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }))
  }

  const validateMapping = () => {
    if (!columnMapping.title) {
      toast({
        title: "Missing Required Field",
        description: "Title field is required for importing books.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const previewData = () => {
    if (!validateMapping()) return
    setStep("preview")
  }

  const processCSVData = async () => {
    if (!user) return

    setLoading(true)
    setStep("importing")

    try {
      const booksToAdd = csvData.map((row) => {
        const authors = row[columnMapping.authors]
          ? row[columnMapping.authors]
              .split(";")
              .map((a) => a.trim())
              .filter((a) => a)
          : []

        const tags = row[columnMapping.tags]
          ? row[columnMapping.tags]
              .split(";")
              .map((t) => t.trim())
              .filter((t) => t)
          : []

        const bookData = {
          userId: user.uid,
          title: row[columnMapping.title] || "Untitled",
          subtitle: row[columnMapping.subtitle] || null,
          authors: authors.length > 0 ? authors : ["Unknown Author"],
          genre: row[columnMapping.genre] || null,
          isbn: row[columnMapping.isbn] || null,
          format: (row[columnMapping.format]?.toLowerCase() as Book["format"]) || "physical",
          status: (row[columnMapping.status]?.toLowerCase().replace(/\s+/g, "-") as Book["status"]) || "not-read",
          totalPages: row[columnMapping.totalPages] ? Number.parseInt(row[columnMapping.totalPages]) : null,
          pagesRead: row[columnMapping.pagesRead] ? Number.parseInt(row[columnMapping.pagesRead]) : null,
          tags,
          notes: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        // Remove null fields
        return Object.fromEntries(Object.entries(bookData).filter(([_, value]) => value !== null))
      })

      // Add books to Firestore in batches
      const batchSize = 10
      for (let i = 0; i < booksToAdd.length; i += batchSize) {
        const batch = booksToAdd.slice(i, i + batchSize)
        await Promise.all(batch.map((bookData) => addDoc(collection(db, "books"), bookData)))
      }

      toast({
        title: "Import Successful!",
        description: `Successfully imported ${booksToAdd.length} books.`,
      })

      onUploadComplete()
    } catch (error) {
      console.error("Error importing books:", error)
      toast({
        title: "Import Failed",
        description: "Failed to import books. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      "Title,Subtitle,Authors,Genre,ISBN,Format,Status,Total Pages,Pages Read,Tags",
      "The Great Gatsby,A Classic American Novel,F. Scott Fitzgerald,Fiction,9780743273565,physical,read,180,180,classic;american literature",
      "1984,,George Orwell,Dystopian Fiction,9780451524935,ebook,reading,328,150,dystopian;political",
      "To Kill a Mockingbird,,Harper Lee,Fiction,9780061120084,physical,not-read,376,0,classic;social issues",
    ].join("\n")

    const blob = new Blob([sampleData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "booknest-sample.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const resetUploader = () => {
    setCsvData([])
    setCsvHeaders([])
    setColumnMapping({
      title: "",
      subtitle: "",
      authors: "",
      genre: "",
      isbn: "",
      format: "",
      status: "",
      totalPages: "",
      pagesRead: "",
      tags: "",
    })
    setStep("upload")
  }

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing your book data. Make sure your CSV has headers in the first row.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Choose CSV file</span>
                  <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </Label>
                <p className="text-sm text-muted-foreground">Select a CSV file with your book data</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Button variant="outline" onClick={downloadSampleCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Sample CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to BookNest fields. Found {csvData.length} rows to import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title * (Required)</Label>
                <Select
                  value={columnMapping.title}
                  onValueChange={(value) => handleColumnMappingChange("title", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for title" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Authors</Label>
                <Select
                  value={columnMapping.authors}
                  onValueChange={(value) => handleColumnMappingChange("authors", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for authors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Select
                  value={columnMapping.subtitle}
                  onValueChange={(value) => handleColumnMappingChange("subtitle", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for subtitle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={columnMapping.genre}
                  onValueChange={(value) => handleColumnMappingChange("genre", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ISBN</Label>
                <Select value={columnMapping.isbn} onValueChange={(value) => handleColumnMappingChange("isbn", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for ISBN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={columnMapping.format}
                  onValueChange={(value) => handleColumnMappingChange("format", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={columnMapping.status}
                  onValueChange={(value) => handleColumnMappingChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Pages</Label>
                <Select
                  value={columnMapping.totalPages}
                  onValueChange={(value) => handleColumnMappingChange("totalPages", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for total pages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pages Read</Label>
                <Select
                  value={columnMapping.pagesRead}
                  onValueChange={(value) => handleColumnMappingChange("pagesRead", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for pages read" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Select value={columnMapping.tags} onValueChange={(value) => handleColumnMappingChange("tags", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column for tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip this field</SelectItem>
                    {csvHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">CSV Format Tips:</p>
                  <ul className="mt-1 text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Separate multiple authors with semicolons (;)</li>
                    <li>• Separate multiple tags with semicolons (;)</li>
                    <li>• Use formats: physical, ebook, audiobook</li>
                    <li>• Use statuses: not-read, reading, read, will-read, on-hold, abandoned</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={previewData} disabled={!columnMapping.title}>
                Preview Import
              </Button>
              <Button variant="outline" onClick={resetUploader}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>
              Review the first 5 books that will be imported. Check if the mapping looks correct.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {csvData.slice(0, 5).map((row, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-medium">{row[columnMapping.title] || "Untitled"}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Authors: {row[columnMapping.authors] || "Unknown"}</div>
                    <div>Genre: {row[columnMapping.genre] || "Not specified"}</div>
                    <div>Format: {row[columnMapping.format] || "physical"}</div>
                    <div>Status: {row[columnMapping.status] || "not-read"}</div>
                  </div>
                </div>
              ))}
            </div>

            {csvData.length > 5 && (
              <p className="text-sm text-muted-foreground">...and {csvData.length - 5} more books</p>
            )}

            <div className="flex gap-4">
              <Button onClick={processCSVData} disabled={loading}>
                {loading ? "Importing..." : `Import ${csvData.length} Books`}
              </Button>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back to Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <h3 className="text-lg font-medium">Importing your books...</h3>
              <p className="text-muted-foreground">This may take a few moments for large imports.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
