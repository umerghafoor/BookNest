"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthForm } from "@/components/auth-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, BarChart3, Search, Tag, FileText, Users, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import "@/styles/components.css"

export default function HomePage() {
  const { user, loading, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  const scrollToAuth = () => {
    document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">BookNest</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary-container) / 0.7), transparent 70%)",
          }}
        />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            {isDemo && (
              <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-tertiary-container px-4 py-1.5 text-sm font-medium text-on-tertiary-container">
                <Star className="h-4 w-4" /> Running in demo mode — no setup required
              </span>
            )}
            <h1 className="text-5xl lg:text-7xl font-display font-bold tracking-tight mb-6">
              Organize Your Books
              <span className="text-gradient block">Beautifully</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              The simple, elegant way to track your reading progress, organize your library, and discover insights about
              your reading habits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={scrollToAuth}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="tonal" size="lg" onClick={scrollToAuth}>
                View Demo
              </Button>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="card-clean p-8 m3-elevation-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: BookOpen, tone: "bg-primary-container text-on-primary-container" },
                  { icon: BarChart3, tone: "bg-[hsl(150_55%_88%)] text-[hsl(150_70%_22%)] dark:bg-[hsl(150_30%_24%)] dark:text-[hsl(150_60%_82%)]" },
                  { icon: Star, tone: "bg-tertiary-container text-on-tertiary-container" },
                ].map((item, i) => (
                  <div key={i} className="space-y-4">
                    <div className="h-4 bg-muted rounded-full w-3/4"></div>
                    <div className={`h-32 ${item.tone} rounded-[var(--radius-lg)] flex items-center justify-center`}>
                      <item.icon className="h-8 w-8" />
                    </div>
                    <div className="h-3 bg-muted rounded-full w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth" className="py-16 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <AuthForm />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">
              Everything you need to manage your books
            </h2>
            <p className="text-lg text-muted-foreground">Simple tools for serious readers</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: BookOpen, title: "Smart Organization", description: "Organize your physical and digital books with custom tags and categories.", tone: "bg-primary-container text-on-primary-container" },
              { icon: BarChart3, title: "Reading Analytics", description: "Track your progress with beautiful charts and reading statistics.", tone: "bg-[hsl(150_55%_88%)] text-[hsl(150_70%_22%)] dark:bg-[hsl(150_30%_24%)] dark:text-[hsl(150_60%_82%)]" },
              { icon: FileText, title: "Note Taking", description: "Capture your thoughts and highlights with page-specific notes.", tone: "bg-tertiary-container text-on-tertiary-container" },
              { icon: Search, title: "Quick Search", description: "Find any book instantly by title, author, genre, or tags.", tone: "bg-muted text-foreground" },
              { icon: Tag, title: "Smart Tagging", description: "Create custom tags to organize books by any criteria you choose.", tone: "bg-primary-container text-on-primary-container" },
              { icon: Users, title: "Reading Goals", description: "Set and track reading goals to stay motivated throughout the year.", tone: "bg-tertiary-container text-on-tertiary-container" },
            ].map((feature, index) => (
              <div key={index} className="card-clean p-6 transition-all duration-200 ease-emphasized hover:m3-elevation-2">
                <div className={`w-12 h-12 ${feature.tone} rounded-2xl flex items-center justify-center mb-4`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="m3-surface-tonal mx-auto max-w-5xl px-8 py-16 text-center">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">Ready to organize your library?</h2>
            <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
              Join thousands of readers who have transformed their reading experience with BookNest.
            </p>
            <Button size="lg" onClick={scrollToAuth}>
              Start Reading Better Today
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-lg font-display font-semibold">BookNest</span>
            </div>
            <p className="text-muted-foreground">© 2024 BookNest. Made for book lovers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
