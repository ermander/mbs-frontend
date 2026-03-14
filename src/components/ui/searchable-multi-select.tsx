'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export interface SearchableMultiSelectOption {
  id: string
  name: string
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  buttonLabel: string
  searchPlaceholder?: string
  searchInputAriaLabel?: string
  className?: string
  emptyMessage?: string
}

const PANEL_OFFSET = 4
const PANEL_MAX_HEIGHT = 280
const LIST_MAX_HEIGHT = 240

/**
 * Multi-select con ricerca: nessun Radix, nessun focus scope.
 * Il focus resta sull'input mentre digiti. Pannello in portal e posizione fissa.
 */
export function SearchableMultiSelect({
  options,
  selectedIds,
  onToggle,
  buttonLabel,
  searchPlaceholder = 'Cerca...',
  searchInputAriaLabel = 'Filtra opzioni',
  className,
  emptyMessage = 'Nessun risultato',
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) => opt.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : options

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn || typeof document === 'undefined') return
    const rect = btn.getBoundingClientRect()
    setPosition({
      top: rect.bottom + PANEL_OFFSET,
      left: rect.left,
      width: Math.max(rect.width, 140),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setSearchQuery(''))
    updatePosition()
    const id = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, updatePosition])

  // Se qualcosa ruba il focus mentre digiti (es. re-render), rimettilo sull'input
  useEffect(() => {
    if (!open || !searchQuery) return
    const id = requestAnimationFrame(() => {
      const input = searchInputRef.current
      const panel = panelRef.current
      const active = document.activeElement
      if (!input || !panel) return
      const focusStolen = active !== input && !panel.contains(active)
      if (focusStolen) input.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, searchQuery])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const handleScrollOrResize = () => updatePosition()
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open, updatePosition])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="min-w-[140px] justify-between"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-50', open && 'rotate-180')}
          aria-hidden
        />
      </Button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="flex flex-col overflow-hidden rounded-md border border-white/10 bg-white/5 text-foreground shadow-lg backdrop-blur-md"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: PANEL_MAX_HEIGHT,
              zIndex: 9999,
            }}
          >
            <div className="shrink-0 border-b border-border p-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 border-0 bg-muted/50 pl-8 text-sm focus-visible:ring-1"
                  aria-label={searchInputAriaLabel}
                  autoComplete="off"
                  data-searchable-multi-select-input
                />
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto py-1" style={{ maxHeight: LIST_MAX_HEIGHT }}>
              {filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  role="option"
                  aria-selected={selectedIds.includes(opt.id)}
                  className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-white/10 focus:bg-white/10 focus:text-foreground"
                  onClick={() => onToggle(opt.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggle(opt.id)
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedIds.includes(opt.id)}
                    onChange={() => onToggle(opt.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-hidden
                  />
                  <span>{opt.name}</span>
                </div>
              ))}
              {filteredOptions.length === 0 && searchQuery.trim() && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
