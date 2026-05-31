import { doc, updateDoc } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { mockFirestore } from "@/lib/mock-data"
import type { Book } from "@/lib/types"

/**
 * Persists a partial update to a book, transparently routing to Firestore when
 * configured or the in-memory mock store in demo mode. Always stamps
 * `updatedAt`. Used for lightweight actions (pinning, cover updates) that need
 * to work from any page.
 */
export async function updateBookFields(bookId: string, fields: Partial<Book>): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, "books", bookId), { ...fields, updatedAt: new Date() })
  } else {
    await mockFirestore.updateBook(bookId, fields)
  }
}

/** Toggles whether a book is pinned as a favorite. */
export async function setBookPinned(bookId: string, pinned: boolean): Promise<void> {
  await updateBookFields(bookId, { pinned })
}

/** Stores a (data-URL) cover image on the book. */
export async function setBookCover(bookId: string, coverImage: string): Promise<void> {
  await updateBookFields(bookId, { coverImage })
}
