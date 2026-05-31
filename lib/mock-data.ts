import type { Book, ReadingLog } from "@/lib/types"

// Mock data storage for demo mode
const mockBooks: Book[] = []
const mockReadingLogs: ReadingLog[] = []
let nextId = 1

export const mockFirestore = {
  addBook: async (bookData: Omit<Book, "id">) => {
    const newBook: Book = {
      ...bookData,
      id: `mock-book-${nextId++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockBooks.push(newBook)
    return newBook
  },

  getBooks: async (userId: string) => {
    return mockBooks.filter((book) => book.userId === userId)
  },

  updateBook: async (bookId: string, updateData: Partial<Book>) => {
    const index = mockBooks.findIndex((book) => book.id === bookId)
    if (index !== -1) {
      mockBooks[index] = {
        ...mockBooks[index],
        ...updateData,
        updatedAt: new Date(),
      }
      return mockBooks[index]
    }
    throw new Error("Book not found")
  },

  deleteBook: async (bookId: string) => {
    const index = mockBooks.findIndex((book) => book.id === bookId)
    if (index !== -1) {
      mockBooks.splice(index, 1)
      return true
    }
    throw new Error("Book not found")
  },

  getBook: async (bookId: string) => {
    const book = mockBooks.find((book) => book.id === bookId)
    if (!book) throw new Error("Book not found")
    return book
  },

  // Adds `pages` to the (userId, date) reading log, creating it if absent.
  logReading: async (userId: string, date: string, pages: number) => {
    const existing = mockReadingLogs.find((log) => log.userId === userId && log.date === date)
    if (existing) {
      existing.pages += pages
      existing.updatedAt = new Date()
      return existing
    }
    const entry: ReadingLog = {
      id: `mock-log-${nextId++}`,
      userId,
      date,
      pages,
      updatedAt: new Date(),
    }
    mockReadingLogs.push(entry)
    return entry
  },

  getReadingLogs: async (userId: string) => {
    return mockReadingLogs.filter((log) => log.userId === userId)
  },
}

// Add some sample books for demo
export const addSampleBooks = (userId: string) => {
  if (mockBooks.length === 0) {
    const sampleBooks: Omit<Book, "id">[] = [
      {
        userId,
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
        genre: "Classic Literature",
        format: "physical",
        status: "read",
        totalPages: 180,
        pagesRead: 180,
        tags: ["classic", "american-literature"],
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId,
        title: "Dune",
        authors: ["Frank Herbert"],
        genre: "Science Fiction",
        format: "ebook",
        status: "reading",
        totalPages: 688,
        pagesRead: 245,
        tags: ["sci-fi", "space-opera"],
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId,
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        genre: "Fantasy",
        format: "physical",
        status: "will-read",
        totalPages: 310,
        tags: ["fantasy", "adventure"],
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    sampleBooks.forEach((book) => {
      mockFirestore.addBook(book)
    })

    // Seed a plausible recent reading history so the dashboard graphs and
    // streak are populated in demo mode. Covers an unbroken run of recent days
    // (a current streak) plus scattered earlier activity.
    const today = new Date()
    const recentRun = [0, 1, 2, 3, 4, 5, 6] // last 7 days, unbroken
    const earlier = [9, 10, 12, 13, 14, 17, 20, 21, 24, 28, 31, 35, 40]
    ;[...recentRun, ...earlier].forEach((daysAgo) => {
      const d = new Date(today)
      d.setDate(d.getDate() - daysAgo)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const pages = 15 + Math.floor(Math.random() * 45)
      mockFirestore.logReading(userId, date, pages)
    })
  }
}
