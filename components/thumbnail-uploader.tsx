"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"

interface ThumbnailUploaderProps {
  onThumbnailSelect: (file: File, preview: string) => void
  preview: string | null
  bookTitle: string
}

export function ThumbnailUploader({ onThumbnailSelect, preview, bookTitle }: ThumbnailUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string
      onThumbnailSelect(file, previewUrl)
    }
    reader.readAsDataURL(file)
  }

  const clearThumbnail = () => {
    onThumbnailSelect(null as any, null as any)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const generateInitialThumbnail = (title: string) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return ""

    // Book-like dimensions (A4 ratio: 210x297mm ≈ 3:4.2)
    canvas.width = 200
    canvas.height = 280

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#3b82f6")
    gradient.addColorStop(1, "#1e40af")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add subtle border
    ctx.strokeStyle = "#1e3a8a"
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

    // Add first letter
    const firstLetter = title.charAt(0).toUpperCase() || "B"
    ctx.fillStyle = "white"
    ctx.font = "bold 80px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(firstLetter, canvas.width / 2, canvas.height / 2)

    // Add title at bottom (if it fits)
    if (title.length > 0) {
      ctx.font = "bold 14px Arial"
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"

      // Word wrap for title
      const words = title.split(" ")
      const maxWidth = canvas.width - 20
      let line = ""
      let y = canvas.height - 40

      for (let i = 0; i < words.length && y > canvas.height - 80; i++) {
        const testLine = line + words[i] + " "
        const metrics = ctx.measureText(testLine)

        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), canvas.width / 2, y)
          line = words[i] + " "
          y += 16
        } else {
          line = testLine
        }
      }

      if (line.trim() && y <= canvas.height - 20) {
        ctx.fillText(line.trim(), canvas.width / 2, y)
      }
    }

    return canvas.toDataURL("image/png")
  }

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <div className="flex gap-4">
        {/* Upload Area */}
        <div className="flex-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-dashed border-2 flex flex-col items-center justify-center gap-2"
          >
            <Upload className="h-6 w-6" />
            <span>Upload Cover Image</span>
            <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
          </Button>
        </div>

        {/* Preview */}
        <div className="w-32">
          <Card className="p-2 h-32 flex items-center justify-center relative overflow-hidden">
            {preview ? (
              <>
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Book cover preview"
                  className="max-w-full max-h-full object-cover rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={clearThumbnail}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : bookTitle ? (
              <img
                src={generateInitialThumbnail(bookTitle) || "/placeholder.svg"}
                alt="Generated cover"
                className="max-w-full max-h-full object-cover rounded"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {preview
          ? "Custom cover image selected"
          : bookTitle
            ? "Auto-generated cover will be used"
            : "Upload an image or enter a title to see preview"}
      </p>
    </div>
  )
}
