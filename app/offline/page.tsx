import { BookOpen, WifiOff } from "lucide-react"

export const metadata = {
  title: "Offline — BookNest",
}

export default function OfflinePage() {
  return (
    <div className="page-container flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        <WifiOff className="h-8 w-8" />
      </span>
      <h1 className="mb-2 text-2xl font-display font-bold tracking-tight">You're offline</h1>
      <p className="mb-6 max-w-sm text-muted-foreground">
        BookNest can't reach the network right now. Check your connection — your library will load
        again once you're back online.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        <span>BookNest</span>
      </div>
    </div>
  )
}
