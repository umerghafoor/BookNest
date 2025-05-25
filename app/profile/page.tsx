"use client"

import type React from "react"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useState, useRef } from "react"
import { updatePassword } from "firebase/auth"
import { Download, Upload, User, Settings, FileText } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await updatePassword(user, passwordData.newPassword)
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
      setPasswordData({ newPassword: "", confirmPassword: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = async () => {
    if (!user) return

    try {
      const booksRef = collection(db, "books")
      const userBooksQuery = query(booksRef, where("userId", "==", user.uid))
      const snapshot = await getDocs(userBooksQuery)

      const books = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[]

      // Create CSV content
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
        "Locations",
        "Links",
        "Created At",
      ]

      const csvContent = [
        headers.join(","),
        ...books.map((book) =>
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
            `"${book.locations?.join("; ") || ""}"`,
            `"${book.links?.join("; ") || ""}"`,
            `"${new Date(book.createdAt).toISOString()}"`,
          ].join(","),
        ),
      ].join("\n")

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `booknest-library-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: "Your library has been exported to CSV.",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Export failed",
        description: "Failed to export your library. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== "text/csv") {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      })
      return
    }

    // For now, just show a message about the import feature
    toast({
      title: "Import feature coming soon",
      description: "CSV import with column mapping will be available in the next update.",
    })

    // Reset the file input
    event.target.value = ""
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Account Created</Label>
                <Input
                  value={user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : ""}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Import & Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Import & Export
              </CardTitle>
              <CardDescription>Backup and restore your book collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Export Library</h4>
                <p className="text-sm text-muted-foreground">Download your complete book collection as a CSV file</p>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Import Library</h4>
                <p className="text-sm text-muted-foreground">Import books from a CSV file (coming soon)</p>
                <Button onClick={handleImportClick} variant="outline" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  style={{ display: "none" }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={logout} variant="destructive">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
