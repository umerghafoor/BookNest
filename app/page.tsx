"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { BookOpen, BarChart3, User, Tag, FileText, Search } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BookNest</h1>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Your Personal <span className="text-primary">Book Organizer</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Manage your physical and digital books in one place. Track reading progress, take notes, and get insights
            into your reading habits.
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
            Whether you're a casual reader or a book enthusiast, BookNest helps you organize your collection, track your
            progress, and discover patterns in your reading journey.
          </p>

          {/* Auth Form */}
          <div className="max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Organize Everything</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track physical books, eBooks, and audiobooks with custom tags and locations
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor reading progress with visual indicators and detailed statistics
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Take Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add notes with page numbers to capture your thoughts and highlights
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Smart Tags</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Organize books with custom tags and discover your reading patterns
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Easy Search</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Find books quickly by title, author, tags, or reading status
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Personal Insights</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get insights into your reading habits and track your yearly goals
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to organize your books?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of readers who have transformed their reading experience with BookNest.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-800 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary mr-2" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              © 2024 BookNest. Built for book lovers, by book lovers.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
