"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth"
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemo: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Lightweight stand-in user used when Firebase isn't configured (demo mode).
const DEMO_USER = {
  uid: "demo-user",
  email: "demo@booknest.app",
  displayName: "Demo Reader",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
} as unknown as User

const DEMO_FLAG_KEY = "booknest:demo-signed-in"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Demo mode: no Firebase. Persist a simple "signed in" flag locally.
    if (!isFirebaseConfigured) {
      const signedIn =
        typeof window !== "undefined" && localStorage.getItem(DEMO_FLAG_KEY) === "1"
      setUser(signedIn ? DEMO_USER : null)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.uid : "No user")
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const demoSignIn = () => {
    if (typeof window !== "undefined") localStorage.setItem(DEMO_FLAG_KEY, "1")
    setUser(DEMO_USER)
  }

  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured) return demoSignIn()
    try {
      console.log("Attempting to sign in with email:", email)
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log("Sign in successful:", result.user.uid)
    } catch (error) {
      console.error("Sign in error:", error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!isFirebaseConfigured) return demoSignIn()
    try {
      console.log("Attempting to create account with email:", email)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log("Account created successfully:", result.user.uid)
    } catch (error) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) return demoSignIn()
    try {
      console.log("Attempting to sign in with Google")
      const result = await signInWithPopup(auth, googleProvider)
      console.log("Google sign in successful:", result.user.uid)
    } catch (error) {
      console.error("Google sign in error:", error)
      throw error
    }
  }

  const logout = async () => {
    if (!isFirebaseConfigured) {
      if (typeof window !== "undefined") localStorage.removeItem(DEMO_FLAG_KEY)
      setUser(null)
      return
    }
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isDemo: !isFirebaseConfigured, signIn, signUp, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
