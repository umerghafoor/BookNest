"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, BarChart3, User, Tag, FileText, Search, Star, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent glow-blue"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Header */}
      <header className="relative z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl gradient-blue glow-blue">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                BookNest
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-400/20 dark:to-indigo-400/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 text-glow">
                Your Personal Book Universe
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Transform your reading journey with intelligent organization, progress tracking, and beautiful insights
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  className="gradient-blue text-white px-8 py-4 text-lg font-semibold rounded-xl glow-blue hover:scale-105 transition-all duration-300"
                >
                  Start Your Journey
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold rounded-xl border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="relative mt-16">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 glass-effect glow-blue float-animation">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="h-32 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-800 dark:to-indigo-900 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 rounded-lg flex items-center justify-center">
                    <Star className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">BookNest Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section className="py-16 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-blue-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              How BookNest Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Four simple steps to transform your reading experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Sign Up",
                description: "Create your account in seconds with Google or email",
                icon: User,
                gradient: "gradient-blue",
              },
              {
                step: "02",
                title: "Add Books",
                description: "Build your digital library with physical and digital books",
                icon: BookOpen,
                gradient: "gradient-teal",
              },
              {
                step: "03",
                title: "Track Progress",
                description: "Monitor reading progress and take notes as you go",
                icon: TrendingUp,
                gradient: "gradient-purple",
              },
              {
                step: "04",
                title: "View Stats",
                description: "Get insights into your reading habits and achievements",
                icon: BarChart3,
                gradient: "gradient-pink",
              },
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div
                  className={`w-20 h-20 ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 glow-blue group-hover:scale-110 transition-all duration-300`}
                >
                  <item.icon className="h-10 w-10 text-white" />
                </div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Powerful features designed for book lovers</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Organization",
                description: "Organize books with custom tags, locations, and smart filtering",
                icon: BookOpen,
                gradient: "from-blue-500 to-blue-600",
              },
              {
                title: "Progress Tracking",
                description: "Visual progress bars and detailed reading statistics",
                icon: BarChart3,
                gradient: "from-indigo-500 to-indigo-600",
              },
              {
                title: "Note Taking",
                description: "Add notes with page numbers to capture your thoughts",
                icon: FileText,
                gradient: "from-purple-500 to-purple-600",
              },
              {
                title: "Smart Tags",
                description: "Discover patterns in your reading with intelligent tagging",
                icon: Tag,
                gradient: "from-teal-500 to-teal-600",
              },
              {
                title: "Quick Search",
                description: "Find any book instantly by title, author, or tags",
                icon: Search,
                gradient: "from-pink-500 to-pink-600",
              },
              {
                title: "Reading Insights",
                description: "Beautiful charts and statistics about your reading habits",
                icon: TrendingUp,
                gradient: "from-orange-500 to-orange-600",
              },
            ].map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 glow-blue">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white text-glow">Trusted by Book Lovers</h2>
            <p className="text-xl text-blue-100">Join thousands of readers organizing their libraries</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { number: "10,000+", label: "Books Organized", icon: BookOpen },
              { number: "5,000+", label: "Active Readers", icon: Users },
              { number: "50,000+", label: "Pages Tracked", icon: TrendingUp },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-blue-dark">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-white mb-2 text-glow-dark">{stat.number}</div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Ready to Transform Your Reading?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Start organizing your books today and discover insights about your reading journey
            </p>
            <Button
              size="lg"
              className="gradient-blue text-white px-12 py-4 text-xl font-semibold rounded-xl glow-blue hover:scale-105 transition-all duration-300"
            >
              Start for Free
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No credit card required • Free forever</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="p-2 rounded-xl gradient-blue glow-blue">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">BookNest</span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>© 2024 BookNest. Built for book lovers, by book lovers.</p>
              <p className="text-sm mt-1">Transform your reading journey today</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
