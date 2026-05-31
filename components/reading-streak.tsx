"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, CalendarDays, BookMarked } from "lucide-react"
import type { ReadingLog } from "@/lib/types"
import {
  computeStreak,
  dailySeries,
  heatmapGrid,
  intensityLevel,
  type HeatmapCell,
} from "@/lib/streak"

interface ReadingStreakProps {
  logs: ReadingLog[]
  loading?: boolean
}

const HEATMAP_WEEKS = 14
const TREND_DAYS = 30

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

function formatDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function HeatmapTooltipCell({ cell }: { cell: HeatmapCell }) {
  if (!cell.inRange) {
    return <div className="h-3 w-3 rounded-[3px]" aria-hidden />
  }
  const label = cell.pages > 0 ? `${cell.pages} pages` : "No reading"
  return (
    <div
      className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[intensityLevel(cell.pages)]}`}
      title={`${formatDate(cell.date)} — ${label}`}
    />
  )
}

export function ReadingStreak({ logs, loading }: ReadingStreakProps) {
  const { streak, series, grid } = useMemo(
    () => ({
      streak: computeStreak(logs),
      series: dailySeries(logs, TREND_DAYS),
      grid: heatmapGrid(logs, HEATMAP_WEEKS),
    }),
    [logs],
  )

  if (loading) {
    return (
      <Card className="card-clean">
        <CardHeader>
          <CardTitle className="text-lg">Reading Streak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-clean">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle className="text-lg">Reading Streak</CardTitle>
            <CardDescription>Keep the momentum going</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Counters */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center rounded-[var(--radius-lg)] bg-primary-container/40 px-3 py-4 text-center">
            <Flame className="mb-1 h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold leading-none">{streak.current}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              day{streak.current === 1 ? "" : "s"} current
            </span>
          </div>
          <div className="flex flex-col items-center rounded-[var(--radius-lg)] bg-muted/60 px-3 py-4 text-center">
            <BookMarked className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-bold leading-none">{streak.longest}</span>
            <span className="mt-1 text-xs text-muted-foreground">longest</span>
          </div>
          <div className="flex flex-col items-center rounded-[var(--radius-lg)] bg-muted/60 px-3 py-4 text-center">
            <CalendarDays className="mb-1 h-5 w-5 text-primary" />
            <span className="text-2xl font-bold leading-none">{streak.activeDays}</span>
            <span className="mt-1 text-xs text-muted-foreground">active days</span>
          </div>
        </div>

        {/* Pages-per-day trend */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Pages read · last {TREND_DAYS} days
          </h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="streakArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  interval={6}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  width={32}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius-md)",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value: number) => [`${value} pages`, "Read"]}
                />
                <Area
                  type="monotone"
                  dataKey="pages"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#streakArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contribution heatmap */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Activity · last {HEATMAP_WEEKS} weeks
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <div className="flex flex-col gap-1 pt-[2px] text-[10px] text-muted-foreground">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="flex h-3 items-center leading-none">
                  {label}
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => (
                    <HeatmapTooltipCell key={`${wi}-${di}`} cell={cell} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[level]}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
