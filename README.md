# 📚 BookNest — Smart Book Organizer

Manage your physical and digital books in one place. BookNest is a
[Next.js](https://nextjs.org/) Progressive Web App for tracking your library,
reading progress, and reading habits — backed by Firebase, with a built-in
demo mode that runs entirely on mock data.

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/umerghafoors-projects/v0-firebase-with-next-js)

## Features

- **Unified library** — track physical books, ebooks, and audiobooks together.
- **Rich book records** — title, authors, genre, ISBN, cover image, tags,
  description, notes, shelf locations (physical) and links (ebooks).
- **Reading status workflow** — *not read · will read · reading · on hold ·
  read · abandoned*, with per-book page progress.
- **Reading streaks & stats** — a daily reading log powers streak counters and
  dashboard activity graphs; the stats page breaks down books by status, top
  tags, top authors, pages read, and books finished this month/year.
- **Quick progress logging** — update pages read in a couple of taps.
- **Discover & borrowing** — mark books public and lend-able; browse others'
  public shelves and send borrow requests.
- **Bulk edit & CSV import** — manage many books at once and import via CSV.
- **Installable PWA** — service worker, offline page, and a mobile bottom nav.
- **Material 3 look** — Roboto / Roboto Flex typography with light & dark themes.

## Tech Stack

| Area        | Choice                                              |
| ----------- | --------------------------------------------------- |
| Framework   | Next.js 15 (App Router) + React 19                  |
| Language    | TypeScript                                          |
| Styling     | Tailwind CSS + Radix UI primitives (shadcn-style)   |
| Backend     | Firebase — Auth, Firestore, Storage                 |
| Charts      | Recharts                                            |
| Hosting     | Vercel                                              |

## Getting Started

### Prerequisites

- Node.js 18+
- A package manager — this repo uses **pnpm** (a `pnpm-lock.yaml` is committed).

### Install

```bash
pnpm install
```

### Configure Firebase (optional)

Create a `.env.local` file with your Firebase project credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

> **Demo mode:** if these variables are missing, BookNest boots without
> Firebase and runs against an in-memory mock data layer — handy for local
> previews and trying the UI without a backend.

### Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command       | Description                       |
| ------------- | --------------------------------- |
| `pnpm dev`    | Start the development server      |
| `pnpm build`  | Production build                  |
| `pnpm start`  | Serve the production build        |
| `pnpm lint`   | Run Next.js / ESLint checks       |

## Project Structure

```text
app/          Next.js App Router routes (dashboard, library, book, stats,
              discover, add/edit/bulk-edit, profile, offline)
components/    Providers (auth, books, theme) and shared UI components
lib/          Firebase setup, data access, types, reading-log & streak logic
hooks/        Reusable React hooks
public/       PWA manifest, icons, service worker assets
styles/       Global and component styles
```

## License

This project is currently unlicensed / private.
