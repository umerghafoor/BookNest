"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Plus, TrendingUp, Clock, Target } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalBooks: 0,
    currentlyReading: 0,
    booksRead: 0,
    totalPages: 0,
  })
  const [recentBooks, setRecentBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const booksRef = collection(db, "books")
      const userBooksQuery = query(booksRef, where("userId", "==", user.uid))
      const snapshot = await getDocs(userBooksQuery)

      const books = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[]

      // Calculate stats
      const totalBooks = books.length
      const currentlyReading = books.filter((book) => book.status === "reading").length
      const booksRead = books.filter((book) => book.status === "read").length
      const totalPages = books.reduce((sum, book) => sum + (book.pagesRead || 0), 0)

      setStats({ totalBooks, currentlyReading, booksRead, totalPages })

      // Get recent books
      const recentBooksQuery = query(booksRef, where("userId", "==", user.uid), orderBy("updatedAt", "desc"), limit(5))
      const recentSnapshot = await getDocs(recentBooksQuery)
      const recent = recentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[]

      setRecentBooks(recent)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your book collection</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBooks}</div>
                <p className="text-xs text-muted-foreground">in your collection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently Reading</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.currentlyReading}</div>
                <p className="text-xs text-muted-foreground">books in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Books Read</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.booksRead}</div>
                <p className="text-xs text-muted-foreground">completed books</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages Read</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">total pages</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with managing your books</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/add-book">
                <Button className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Book
                </Button>
              </Link>
              <Link href="/library">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Library
                </Button>
              </Link>
              <Link href="/stats">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Statistics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recently added or updated books</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBooks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No books yet. Start by adding your first book!</p>
              ) : (
                <div className="space-y-3">
                  {recentBooks.map((book) => (
                    <div key={book.id} className="flex items-center space-x-3">
                      <div className="w-8 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.authors.join(", ")}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{book.status.replace("-", " ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
