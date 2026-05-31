import type { ReadingLog } from "@/lib/types"
import { toDateKey } from "@/lib/reading-log"

export interface StreakSummary {
  current: number
  longest: number
  activeDays: number
  totalPages: number
  /** Set of YYYY-MM-DD date keys that had any reading activity. */
  activeDates: Set<string>
}

export interface DailyActivity {
  date: string // YYYY-MM-DD
  pages: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Parses a YYYY-MM-DD key into a local-midnight Date. */
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Whole-day difference between two date keys (a - b). */
function dayDiff(a: string, b: string): number {
  return Math.round((parseDateKey(a).getTime() - parseDateKey(b).getTime()) / DAY_MS)
}

/**
 * Computes current and longest reading streaks from raw logs. A streak is a run
 * of consecutive calendar days each with at least one page logged. The current
 * streak counts back from today; if there was no reading today it still counts
 * provided yesterday was active (today is simply not over yet).
 */
export function computeStreak(logs: ReadingLog[]): StreakSummary {
  const activeDates = new Set<string>()
  let totalPages = 0
  for (const log of logs) {
    if (log.pages > 0) {
      activeDates.add(log.date)
      totalPages += log.pages
    }
  }

  const sorted = [...activeDates].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const date of sorted) {
    if (prev !== null && dayDiff(date, prev) === 1) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) longest = run
    prev = date
  }

  // Current streak: walk backwards from today (or yesterday) over active days.
  const today = toDateKey()
  let cursor: string | null = null
  if (activeDates.has(today)) {
    cursor = today
  } else {
    const yesterday = toDateKey(new Date(Date.now() - DAY_MS))
    if (activeDates.has(yesterday)) cursor = yesterday
  }

  let current = 0
  while (cursor && activeDates.has(cursor)) {
    current += 1
    cursor = toDateKey(new Date(parseDateKey(cursor).getTime() - DAY_MS))
  }

  return { current, longest, activeDays: activeDates.size, totalPages, activeDates }
}

/**
 * Returns per-day pages for the last `days` days (inclusive of today), filling
 * gaps with zero so charts have a continuous x-axis.
 */
export function dailySeries(logs: ReadingLog[], days = 30): DailyActivity[] {
  const byDate = new Map<string, number>()
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.pages)
  }

  const series: DailyActivity[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS)
    const key = toDateKey(d)
    series.push({ date: key, pages: byDate.get(key) ?? 0 })
  }
  return series
}

/**
 * Builds a GitHub-style heatmap grid for the last `weeks` weeks. Returns columns
 * (weeks) of 7 days each, Sunday→Saturday, oldest week first. Trailing/leading
 * cells outside the range are marked with `inRange: false`.
 */
export interface HeatmapCell {
  date: string
  pages: number
  inRange: boolean
}

export function heatmapGrid(logs: ReadingLog[], weeks = 12): HeatmapCell[][] {
  const byDate = new Map<string, number>()
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.pages)
  }

  const today = new Date()
  // End on the Saturday of the current week so the grid is column-aligned.
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay()))
  const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY_MS)

  const columns: HeatmapCell[][] = []
  let cursor = new Date(start)
  for (let w = 0; w < weeks; w++) {
    const col: HeatmapCell[] = []
    for (let d = 0; d < 7; d++) {
      const key = toDateKey(cursor)
      col.push({
        date: key,
        pages: byDate.get(key) ?? 0,
        inRange: cursor <= today,
      })
      cursor = new Date(cursor.getTime() + DAY_MS)
    }
    columns.push(col)
  }
  return columns
}

/** Maps a page count to a 0–4 intensity level for heatmap coloring. */
export function intensityLevel(pages: number): 0 | 1 | 2 | 3 | 4 {
  if (pages <= 0) return 0
  if (pages < 15) return 1
  if (pages < 35) return 2
  if (pages < 60) return 3
  return 4
}
