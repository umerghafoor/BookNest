export interface Book {
  id: string
  userId: string
  title: string
  subtitle?: string
  authors: string[]
  genre?: string
  isbn?: string
  format: "physical" | "ebook" | "audiobook"
  coverImage?: string
  tags: string[]
  status: "not-read" | "reading" | "read" | "will-read" | "on-hold" | "abandoned"
  totalPages?: number
  pagesRead?: number
  locations?: string[] // for physical books
  links?: string[] // for ebooks
  borrowInfo?: {
    isBorrowed: boolean
    borrowerName?: string
    returnDate?: string
  }
  notes: Note[]
  isPublic?: boolean // New field for public visibility
  allowBorrow?: boolean // New field for borrowing availability
  description?: string // Book description
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  content: string
  pageNumber?: number
  createdAt: Date
}

export interface UserStats {
  totalBooks: number
  booksByStatus: Record<string, number>
  totalPagesRead: number
  booksFinishedThisMonth: number
  booksFinishedThisYear: number
  topTags: Array<{ tag: string; count: number }>
  topAuthors: Array<{ author: string; count: number }>
  averagePagesPerBook: number
}

export interface BorrowRequest {
  id?: string
  bookId: string
  borrowerUserId: string
  borrowerName: string
  borrowerEmail: string
  ownerUserId: string
  message: string
  status: "pending" | "approved" | "rejected"
  createdAt: Date
}
