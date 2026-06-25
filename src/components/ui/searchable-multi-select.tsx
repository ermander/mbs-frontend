'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SearchableMultiSelectOption {
  id: string
  name: string
}

interface SearchableMultiSelectProps {
  options: SearchableMultiSelectOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  /** Called to remove a specific id (defaults to calling onToggle) */
  onRemove?: (id: string) => void
  buttonLabel: string
  /** Form label displayed above the control */
  label?: string
  searchPlaceholder?: string
  searchInputAriaLabel?: string
  className?: string
  emptyMessage?: string
  /** Placeholder shown when nothing is selected */
  placeholder?: string
  /** Show selected items as badges with remove button. Default false (legacy button mode). */
  showBadges?: boolean
  size?: 'default' | 'sm'
  /** Custom render for each option in the dropdown list */
  renderOption?: (option: SearchableMultiSelectOption) => React.ReactNode
  /** When inside a modal (e.g. Radix Dialog), pass the container element so the dropdown is portaled there and receives pointer events. Use a callback ref to capture: ref={(el) => setPortalContainer(el)}. */
  portalContainer?: HTMLElement | null
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
  onRemove,
  buttonLabel,
  label: formLabel,
  searchPlaceholder = 'Cerca...',
  searchInputAriaLabel = 'Filtra opzioni',
  className,
  emptyMessage = 'Nessun risultato',
  placeholder = 'Tutti',
  showBadges = false,
  size = 'default',
  renderOption,
  portalContainer,
}: SearchableMultiSelectProps) {
  const isSmall = size === 'sm'
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, useAbsolute: false })
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  )

  const filteredOptions = useMemo(() => {
    const base = searchQuery.trim()
      ? options.filter((opt) => opt.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      : options
    return [...base].sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 0 : 1
      const bSelected = selectedIds.includes(b.id) ? 0 : 1
      return aSelected - bSelected
    })
  }, [options, searchQuery, selectedIds])

  const handleRemove = onRemove ?? onToggle

  const getAnchorRect = useCallback(() => {
    const el = showBadges ? triggerRef.current : buttonRef.current
    return el?.getBoundingClientRect() ?? null
  }, [showBadges])

  const updatePosition = useCallback(() => {
    if (typeof document === 'undefined') return
    const rect = getAnchorRect()
    if (!rect) return
    if (portalContainer) {
      const portalRect = portalContainer.getBoundingClientRect()
      setPosition({
        top: rect.bottom - portalRect.top + PANEL_OFFSET,
        left: rect.left - portalRect.left,
        width: Math.max(rect.width, 140),
        useAbsolute: true,
      })
      return
    }
    setPosition({
      top: rect.bottom + PANEL_OFFSET,
      left: rect.left,
      width: Math.max(rect.width, 140),
      useAbsolute: false,
    })
  }, [getAnchorRect, portalContainer])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setSearchQuery('')
      updatePosition()
    })
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

  const portalTarget = typeof document !== 'undefined' ? (portalContainer ?? document.body) : null

  const dropdownPanel =
    open &&
    portalTarget &&
    createPortal(
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        className={cn(
          'pointer-events-auto flex flex-col overflow-hidden rounded-md border border-border bg-popover text-foreground shadow-lg',
          position.useAbsolute ? 'absolute' : 'fixed',
        )}
        style={{
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
              className={cn(
                'border-0 bg-muted/50 pl-8 focus-visible:ring-1',
                isSmall ? 'h-6 text-xs' : 'h-8 text-sm',
              )}
              aria-label={searchInputAriaLabel}
              autoComplete="off"
              data-searchable-multi-select-input
            />
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto py-1" style={{ maxHeight: LIST_MAX_HEIGHT }}>
          {filteredOptions.map((opt) => {
            const isSelected = selectedIds.includes(opt.id)
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 outline-none transition-colors hover:bg-muted/80 focus:bg-muted/80',
                  isSmall ? 'text-xs' : 'text-sm',
                )}
                onClick={() => onToggle(opt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggle(opt.id)
                  }
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggle(opt.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-hidden
                />
                {renderOption ? renderOption(opt) : <span>{opt.name}</span>}
              </div>
            )
          })}
          {filteredOptions.length === 0 && searchQuery.trim() && (
            <div
              className={cn(
                'px-2 text-center text-muted-foreground',
                isSmall ? 'py-3 text-xs' : 'py-4 text-sm',
              )}
            >
              {emptyMessage}
            </div>
          )}
        </div>
      </div>,
      portalTarget,
    )

  // Badge mode: shows selected items as removable badges
  if (showBadges) {
    return (
      <div ref={containerRef} className={cn('relative', className)}>
        {formLabel && <Label className="mb-1.5 block">{formLabel}</Label>}
        <div
          ref={triggerRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={formLabel ?? buttonLabel}
          tabIndex={0}
          className={cn(
            'flex w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border border-input bg-background text-left text-foreground transition-colors',
            'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            isSmall ? 'min-h-[1.75rem] px-2 py-1' : 'min-h-[2.25rem] px-3 py-1.5',
          )}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen((prev) => !prev)
            }
          }}
        >
          {selectedOptions.length === 0 && (
            <span className={cn('text-muted-foreground', isSmall ? 'text-xs' : 'text-sm')}>
              {placeholder}
            </span>
          )}
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 font-medium text-foreground',
                isSmall ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
              )}
            >
              <span className="max-w-[120px] truncate">{opt.name}</span>
              <button
                type="button"
                className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(opt.id)
                }}
                aria-label={`Rimuovi ${opt.name}`}
              >
                <X className={isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              </button>
            </span>
          ))}
          <ChevronDown
            className={cn(
              'ml-auto shrink-0 text-muted-foreground transition-transform',
              isSmall ? 'size-3' : 'size-4',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
        {dropdownPanel}
      </div>
    )
  }

  // Legacy button mode (backward compatible)
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {formLabel && <Label className="mb-1.5 block">{formLabel}</Label>}
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
      {dropdownPanel}
    </div>
  )
}
