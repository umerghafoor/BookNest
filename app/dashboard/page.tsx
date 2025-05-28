"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Plus, TrendingUp, Clock, Target, Star, Calendar, Award } from "lucide-react"
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reading":
        return "bg-blue-500"
      case "read":
        return "bg-green-500"
      case "want-to-read":
        return "bg-yellow-500"
      case "paused":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <Navigation />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-6 py-2 border border-blue-200 dark:border-blue-800">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Welcome back to BookNest</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-300 bg-clip-text text-transparent">
            Hello, {user.displayName || user.email?.split("@")[0] || "Reader"}! 📚
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Ready to dive into your reading journey? Here's what's happening with your collection.
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="relative overflow-hidden border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse" />
                <CardHeader className="relative z-10 pb-2">
                  <div className="h-4 bg-white/50 dark:bg-slate-600/50 rounded w-20 animate-pulse" />
                  <div className="h-4 w-4 bg-white/50 dark:bg-slate-600/50 rounded animate-pulse" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="h-8 bg-white/50 dark:bg-slate-600/50 rounded w-16 animate-pulse mb-1" />
                  <div className="h-3 bg-white/50 dark:bg-slate-600/50 rounded w-24 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Books */}
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="absolute inset-0 gradient-blue opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Books</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1">{stats.totalBooks}</div>
                <p className="text-xs text-white/80">in your collection</p>
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Currently Reading */}
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="absolute inset-0 gradient-teal opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Currently Reading</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1">{stats.currentlyReading}</div>
                <p className="text-xs text-white/80">books in progress</p>
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.currentlyReading > 0 ? (stats.currentlyReading / Math.max(stats.totalBooks, 1)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Books Read */}
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="absolute inset-0 gradient-purple opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Books Read</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1">{stats.booksRead}</div>
                <p className="text-xs text-white/80">completed books</p>
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.booksRead > 0 ? (stats.booksRead / Math.max(stats.totalBooks, 1)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pages Read */}
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
              <div className="absolute inset-0 gradient-pink opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-white/10 dark:bg-black/20" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Pages Read</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-white mb-1">{stats.totalPages.toLocaleString()}</div>
                <p className="text-xs text-white/80">total pages</p>
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/60 rounded-full w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Quick Actions
              </CardTitle>
              <CardDescription>Get started with managing your books</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/add-book" className="block">
                <Button className="w-full justify-start h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Plus className="h-5 w-5 mr-3" />
                  Add New Book
                </Button>
              </Link>
              <Link href="/library" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-300 hover:scale-105"
                >
                  <BookOpen className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
                  Browse Library
                </Button>
              </Link>
              <Link href="/stats" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 border-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-all duration-300 hover:scale-105"
                >
                  <TrendingUp className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400" />
                  View Statistics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Books */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent">
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your recently added or updated books</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recentBooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="h-10 w-10 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    No books yet. Start by adding your first book!
                  </p>
                  <Link href="/add-book">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Book
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {recentBooks.map((book) => (
                    <Link key={book.id} href={`/book/${book.id}`}>
                      <Card className="group cursor-pointer border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden">
                        <div className="relative">
                          {/* Book Cover Placeholder */}
                          <div className="h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white/80" />
                          </div>

                          {/* Status Badge */}
                          <div className="absolute top-2 right-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(book.status)}`}
                            >
                              {book.status.replace("-", " ")}
                            </span>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {book.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{book.authors.join(", ")}</p>

                          {/* Progress Bar */}
                          {book.status === "reading" && book.totalPages && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Progress</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {getProgressPercentage(book)}%
                                </span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                                  style={{ width: `${getProgressPercentage(book)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
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
