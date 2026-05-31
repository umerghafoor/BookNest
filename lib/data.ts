import { collection, query, where, getDocs } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { mockFirestore, addSampleBooks } from "@/lib/mock-data"
import type { Book } from "@/lib/types"

let seeded = false

/**
 * Loads a user's books from Firestore when configured, otherwise from the
 * in-memory mock store (seeded once with sample books for demo mode).
 */
export async function loadUserBooks(userId: string): Promise<Book[]> {
  if (!isFirebaseConfigured) {
    if (!seeded) {
      addSampleBooks(userId)
      seeded = true
    }
    return mockFirestore.getBooks(userId)
  }

  const booksRef = collection(db, "books")
  const userBooksQuery = query(booksRef, where("userId", "==", userId))
  const snapshot = await getDocs(userBooksQuery)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Book[]
}
