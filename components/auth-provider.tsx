"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "firebase/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for demo purposes
const mockUser = {
  uid: "demo-user-123",
  email: "demo@booknest.com",
  emailVerified: true,
  displayName: "Demo User",
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
} as User

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Bypass authentication - automatically set mock user
    setTimeout(() => {
      setUser(mockUser)
      setLoading(false)
    }, 100)
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock sign in
    setUser(mockUser)
  }

  const signUp = async (email: string, password: string) => {
    // Mock sign up
    setUser(mockUser)
  }

  const logout = async () => {
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
