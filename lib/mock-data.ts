import type { Book } from "@/lib/types"

// Mock data storage for demo mode
const mockBooks: Book[] = []
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
  }
}
