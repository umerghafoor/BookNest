import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { mockFirestore } from "@/lib/mock-data"
import type { ReadingLog } from "@/lib/types"

/** Formats a Date as a local-timezone YYYY-MM-DD key. */
export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

/**
 * Records `pages` of reading for `userId` on the given day (defaults to today),
 * accumulating into a per-day total. Firestore docs are keyed `${userId}_${date}`
 * so each day is a single upsert. No-ops for non-positive page counts.
 */
export async function logReadingActivity(
  userId: string,
  pages: number,
  date: string = toDateKey(),
): Promise<void> {
  if (!userId || pages <= 0) return

  if (!isFirebaseConfigured) {
    await mockFirestore.logReading(userId, date, pages)
    return
  }

  const ref = doc(db, "readingLogs", `${userId}_${date}`)
  await setDoc(
    ref,
    {
      userId,
      date,
      pages: increment(pages),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * Logs the delta when a book's pagesRead moves from `previous` to `next`.
 * Only forward progress is logged (re-reads / corrections downward are ignored).
 */
export async function logProgressDelta(
  userId: string,
  previous: number | undefined,
  next: number | undefined,
): Promise<void> {
  const delta = (next ?? 0) - (previous ?? 0)
  if (delta > 0) {
    await logReadingActivity(userId, delta)
  }
}

/** Loads all reading-log entries for a user. */
export async function loadReadingLogs(userId: string): Promise<ReadingLog[]> {
  if (!isFirebaseConfigured) {
    return mockFirestore.getReadingLogs(userId)
  }

  const logsRef = collection(db, "readingLogs")
  const snapshot = await getDocs(query(logsRef, where("userId", "==", userId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ReadingLog[]
}
