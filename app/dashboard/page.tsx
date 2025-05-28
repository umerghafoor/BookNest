"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Plus, TrendingUp, Clock, Target, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book } from "@/lib/types"
import "@/styles/components.css"

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

      const totalBooks = books.length
      const currentlyReading = books.filter((book) => book.status === "reading").length
      const booksRead = books.filter((book) => book.status === "read").length
      const totalPages = books.reduce((sum, book) => sum + (book.pagesRead || 0), 0)

      setStats({ totalBooks, currentlyReading, booksRead, totalPages })

      const recentBooksQuery = query(booksRef, where("userId", "==", user.uid), orderBy("updatedAt", "desc"), limit(6))
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

  const getProgressPercentage = (book: Book) => {
    if (!book.totalPages || book.totalPages === 0) return 0
    return Math.round(((book.pagesRead || 0) / book.totalPages) * 100)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "reading":
        return "status-reading"
      case "read":
        return "status-read"
      case "will-read":
        return "status-will-read"
      case "on-hold":
        return "status-on-hold"
      case "abandoned":
        return "status-abandoned"
      default:
        return "status-not-read"
    }
  }

  if (!user) return null

  return (
    <div className="page-container">
      <Navigation />

      <div className="content-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Welcome back, {user.displayName || user.email?.split("@")[0] || "Reader"}!</h1>
          <p className="page-description">Here's what's happening with your reading journey.</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-4"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="stat-card stat-card-blue">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Books</h3>
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stats.totalBooks}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">in your collection</p>
            </div>

            <div className="stat-card stat-card-emerald">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Currently Reading</h3>
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stats.currentlyReading}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">books in progress</p>
            </div>

            <div className="stat-card stat-card-violet">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Books Read</h3>
                <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stats.booksRead}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">completed this year</p>
            </div>

            <div className="stat-card stat-card-slate">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Pages Read</h3>
                <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {stats.totalPages.toLocaleString()}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">total pages</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="card-clean">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage your reading collection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/add-book">
                  <Button className="w-full justify-start btn-primary">
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
          </div>

          {/* Recent Books */}
          <div className="lg:col-span-2">
            <Card className="card-clean">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Your recently updated books</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recentBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                      No books yet. Start building your library!
                    </p>
                    <Link href="/add-book">
                      <Button className="btn-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Book
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBooks.slice(0, 4).map((book) => (
                      <Link key={book.id} href={`/book/${book.id}`}>
                        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="w-12 h-16 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 dark:text-white truncate">{book.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {book.authors.join(", ")}
                            </p>
                            {book.status === "reading" && book.totalPages && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                  <span>Progress</span>
                                  <span>{getProgressPercentage(book)}%</span>
                                </div>
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${getProgressPercentage(book)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className={`status-badge ${getStatusBadgeClass(book.status)}`}>
                            {book.status.replace("-", " ")}
                          </div>
                        </div>
                      </Link>
                    ))}
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
