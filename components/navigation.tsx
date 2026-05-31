"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, BarChart3, Plus, Library, User, LogOut, Edit, Globe } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavigationProps {
  /** Page title shown in the mobile app bar (left side). Defaults to "BookNest". */
  title?: string
}

export function Navigation({ title = "BookNest" }: NavigationProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/library", label: "Library", icon: Library },
    { href: "/add-book", label: "Add Book", icon: Plus },
    { href: "/bulk-edit", label: "Bulk Edit", icon: Edit },
    { href: "/discover", label: "Discover", icon: Globe },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            {/* Desktop: logo + wordmark */}
            <Link href="/dashboard" className="hidden md:flex items-center space-x-2 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-transform duration-200 ease-emphasized group-hover:scale-105">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="font-display font-bold text-xl tracking-tight">BookNest</span>
            </Link>

            {/* Mobile: page title app-bar style */}
            <span className="md:hidden font-display font-bold text-xl tracking-tight truncate">
              {title}
            </span>

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`m3-state-layer flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-emphasized ${
                      isActive
                        ? "bg-primary-container text-on-primary-container"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <ThemeToggle />

            {/* User Menu (avatar dropdown) — consistent on mobile and desktop */}
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                      <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.displayName && <p className="font-medium">{user.displayName}</p>}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/stats" className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Statistics</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
