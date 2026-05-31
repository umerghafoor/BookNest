"use client"

import { useAuth } from "@/components/auth-provider"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Book, UserStats } from "@/lib/types"
import { BookOpen, TrendingUp, Target, Calendar, Tag, User } from "lucide-react"

export default function StatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
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
      const booksByStatus = books.reduce(
        (acc, book) => {
          acc[book.status] = (acc[book.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const totalPagesRead = books.reduce((sum, book) => sum + (book.pagesRead || 0), 0)

      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      const booksFinishedThisMonth = books.filter((book) => {
        if (book.status !== "read") return false
        const updatedDate = new Date(book.updatedAt)
        return updatedDate.getMonth() === currentMonth && updatedDate.getFullYear() === currentYear
      }).length

      const booksFinishedThisYear = books.filter((book) => {
        if (book.status !== "read") return false
        const updatedDate = new Date(book.updatedAt)
        return updatedDate.getFullYear() === currentYear
      }).length

      // Top tags
      const tagCounts = books.reduce(
        (acc, book) => {
          book.tags.forEach((tag) => {
            acc[tag] = (acc[tag] || 0) + 1
          })
          return acc
        },
        {} as Record<string, number>,
      )

      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }))

      // Top authors
      const authorCounts = books.reduce(
        (acc, book) => {
          book.authors.forEach((author) => {
            acc[author] = (acc[author] || 0) + 1
          })
          return acc
        },
        {} as Record<string, number>,
      )

      const topAuthors = Object.entries(authorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([author, count]) => ({ author, count }))

      const booksWithPages = books.filter((book) => book.totalPages)
      const averagePagesPerBook =
        booksWithPages.length > 0
          ? Math.round(booksWithPages.reduce((sum, book) => sum + (book.totalPages || 0), 0) / booksWithPages.length)
          : 0

      const userStats: UserStats = {
        totalBooks,
        booksByStatus,
        totalPagesRead,
        booksFinishedThisMonth,
        booksFinishedThisYear,
        topTags,
        topAuthors,
        averagePagesPerBook,
      }

      setStats(userStats)
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    return status.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reading":
        return "bg-primary-container text-on-primary-container"
      case "read":
        return "bg-[hsl(150_55%_88%)] text-[hsl(150_70%_22%)] dark:bg-[hsl(150_30%_24%)] dark:text-[hsl(150_60%_82%)]"
      case "will-read":
        return "bg-tertiary-container text-on-tertiary-container"
      case "on-hold":
        return "bg-[hsl(38_92%_88%)] text-[hsl(30_80%_28%)] dark:bg-[hsl(38_40%_24%)] dark:text-[hsl(38_90%_78%)]"
      case "abandoned":
        return "bg-destructive/15 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to load statistics</h1>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reading Statistics</h1>
          <p className="text-muted-foreground">Insights into your reading habits and progress</p>
        </div>

        {/* Overview Stats */}
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
              <CardTitle className="text-sm font-medium">Pages Read</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPagesRead.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">total pages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.booksFinishedThisYear}</div>
              <p className="text-xs text-muted-foreground">books completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Pages</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averagePagesPerBook}</div>
              <p className="text-xs text-muted-foreground">per book</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Reading Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Reading Status</CardTitle>
              <CardDescription>Books by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.booksByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Popular Tags
              </CardTitle>
              <CardDescription>Your most used tags</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topTags.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tags used yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topTags.map(({ tag, count }) => (
                    <div key={tag} className="flex items-center justify-between">
                      <Badge variant="secondary">{tag}</Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Authors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Favorite Authors
              </CardTitle>
              <CardDescription>Authors you read most</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topAuthors.length === 0 ? (
                <p className="text-muted-foreground text-sm">No authors tracked yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topAuthors.map(({ author, count }) => (
                    <div key={author} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{author}</span>
                      <span className="text-sm font-medium ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Progress */}
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>Your reading progress this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.booksFinishedThisMonth}</div>
                <p className="text-sm text-muted-foreground">books completed</p>
                {stats.booksFinishedThisMonth > 0 && (
                  <p className="text-xs text-green-600 mt-2">Great job! Keep it up!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reading Insights */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Reading Insights</CardTitle>
              <CardDescription>Interesting facts about your reading habits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Collection Overview</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• You have {stats.totalBooks} books in your collection</li>
                    <li>• You've read {stats.totalPagesRead.toLocaleString()} pages total</li>
                    <li>• Average book length: {stats.averagePagesPerBook} pages</li>
                    <li>• You use {stats.topTags.length} different tags</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Reading Progress</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {stats.booksFinishedThisYear} books completed this year</li>
                    <li>• {stats.booksFinishedThisMonth} books completed this month</li>
                    <li>• {stats.booksByStatus.reading || 0} books currently in progress</li>
                    <li>• {stats.topAuthors.length} different authors in your library</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
