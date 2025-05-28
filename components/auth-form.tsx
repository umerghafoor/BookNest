"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      })
    } catch (error: any) {
      console.error("Sign in error:", error)
      let errorMessage = "Invalid email or password."

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address."
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signUp(email, password)
      toast({
        title: "Account created!",
        description: "Welcome to BookNest. Start organizing your books!",
      })
    } catch (error: any) {
      console.error("Sign up error:", error)
      let errorMessage = "Failed to create account. Please try again."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters long."
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = "Email/password accounts are not enabled. Please contact support."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast({
        title: "Welcome!",
        description: "You've been signed in with Google successfully.",
      })
    } catch (error: any) {
      console.error("Google sign in error:", error)
      let errorMessage = "Failed to sign in with Google. Please try again."

      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign in was cancelled."
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups and try again."
      } else if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account already exists with this email using a different sign-in method."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-0 shadow-2xl glow-blue">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
          Join BookNest
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">Start your reading journey today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Sign In Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          variant="outline"
          className="w-full py-6 text-lg font-semibold rounded-xl border-2 border-blue-200 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 glow-blue transition-all duration-300"
          type="button"
        >
          {googleLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-3"></div>
          ) : (
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-gray-200 dark:bg-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-800 px-4 text-gray-500 dark:text-gray-400 font-medium">
              Or continue with email
            </span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
            <TabsTrigger
              value="signin"
              className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700"
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700"
                  placeholder="Enter your password"
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 text-lg font-semibold rounded-xl gradient-blue text-white glow-blue hover:scale-105 transition-all duration-300"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-700 dark:text-gray-300 font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700"
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-700 dark:text-gray-300 font-medium">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading || googleLoading}
                  className="py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-slate-700"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 text-lg font-semibold rounded-xl gradient-blue text-white glow-blue hover:scale-105 transition-all duration-300"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
