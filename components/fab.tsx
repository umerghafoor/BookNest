"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, X, type LucideIcon } from "lucide-react"

export interface FabAction {
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
}

interface FabProps {
  /**
   * Speed-dial actions. With a single action the FAB performs it directly;
   * with multiple, the FAB expands into a labeled stack.
   */
  actions: FabAction[]
  /** Icon for the closed/primary button (default: Plus). */
  icon?: LucideIcon
  /** Accessible label for the primary button. */
  label?: string
  className?: string
}

/**
 * Material-style floating action button with optional speed-dial. Fixed to the
 * bottom-right and offset above the mobile bottom tab bar + safe-area inset.
 * Mobile-only (hidden at md+, where pages have inline action buttons).
 */
export function Fab({ actions, icon: Icon = Plus, label = "Actions", className = "" }: FabProps) {
  const [open, setOpen] = useState(false)

  if (actions.length === 0) return null
  const single = actions.length === 1

  const renderAction = (action: FabAction, mini = true) => {
    const ActionIcon = action.icon
    const inner = (
      <span
        className={`m3-state-layer flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 ease-emphasized active:scale-95 ${
          mini ? "h-12 w-12" : "h-14 w-14"
        }`}
      >
        <ActionIcon className={mini ? "h-5 w-5" : "h-6 w-6"} />
      </span>
    )
    return inner
  }

  // Single-action FAB: a plain link/button, no expansion.
  if (single) {
    const action = actions[0]
    const ActionIcon = action.icon
    const button = (
      <button
        type="button"
        aria-label={action.label}
        onClick={action.onClick}
        className="m3-state-layer flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 ease-emphasized active:scale-95"
      >
        <ActionIcon className="h-6 w-6" />
      </button>
    )
    return (
      <div
        className={`fixed right-4 z-40 md:hidden ${className}`}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        {action.href ? (
          <Link href={action.href} aria-label={action.label}>
            {renderAction(action, false)}
          </Link>
        ) : (
          button
        )}
      </div>
    )
  }

  return (
    <div
      className={`fixed right-4 z-40 flex flex-col items-end gap-3 md:hidden ${className}`}
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Scrim to dismiss when open */}
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 -z-10 cursor-default bg-transparent"
        />
      )}

      {/* Expanded actions */}
      {open &&
        actions.map((action) => {
          const content = (
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow">
                {action.label}
              </span>
              {renderAction(action)}
            </div>
          )
          return action.href ? (
            <Link key={action.label} href={action.href} onClick={() => setOpen(false)}>
              {content}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick?.()
                setOpen(false)
              }}
            >
              {content}
            </button>
          )
        })}

      {/* Primary toggle */}
      <button
        type="button"
        aria-label={open ? "Close actions" : label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="m3-state-layer flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 ease-emphasized active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
      </button>
    </div>
  )
}
