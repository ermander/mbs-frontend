'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  id?: string
  label?: string
  placeholder?: string
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  searchPlaceholder?: string
  /** When false, no empty option (value '') is shown; use for required selection. Default true */
  allowEmpty?: boolean
  disabled?: boolean
  size?: 'default' | 'sm'
  /** When inside a modal (e.g. Radix Dialog), pass the container element so the dropdown is portaled there and receives pointer events. Use a callback ref to capture: ref={(el) => setPortalContainer(el)}. */
  portalContainer?: HTMLElement | null
}

export function SearchableSelect({
  id,
  label,
  placeholder = 'Tutti',
  options,
  value,
  onChange,
  className,
  searchPlaceholder = 'Cerca...',
  allowEmpty = true,
  disabled = false,
  size = 'default',
  portalContainer,
}: SearchableSelectProps) {
  const isSmall = size === 'sm'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
    useAbsolute?: boolean
  }>({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value])
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase().trim()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    if (portalContainer) {
      const portalEl = portalContainer
      const portalRect = portalEl.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom - portalRect.top + 4,
        left: rect.left - portalRect.left,
        width: Math.max(rect.width, 220),
        useAbsolute: true,
      })
    }
    if (!portalContainer) {
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
        useAbsolute: false,
      })
    }
  }, [portalContainer])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updatePosition])

  const handleOpenToggle = () => {
    setQuery('')
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return
      }
      if (target instanceof Element && target.closest?.('[data-searchable-select]')) {
        return
      }
      setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const portalTarget = portalContainer ?? document.body

  const dropdownPanel = open
    ? createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          data-searchable-select
          className={cn(
            'pointer-events-auto z-[9999] overflow-hidden rounded-md border border-border bg-popover shadow-lg',
            dropdownPos.useAbsolute ? 'absolute' : 'fixed',
          )}
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
        >
          <div className="border-b border-border p-1.5">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions.length === 1) {
                  onChange(filteredOptions[0].value)
                  setOpen(false)
                }
              }}
              placeholder={searchPlaceholder}
              className={cn(
                'border-0 bg-muted/50 focus-visible:ring-1',
                isSmall ? 'h-6 text-xs' : 'h-8 text-sm',
              )}
              aria-autocomplete="list"
              aria-controls="searchable-select-list"
              aria-activedescendant={undefined}
            />
          </div>
          <ul id="searchable-select-list" className="max-h-56 overflow-auto py-1" role="listbox">
            {allowEmpty && (
              <li role="option" aria-selected={value === ''}>
                <button
                  type="button"
                  className={cn(
                    'w-full text-left hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
                    isSmall ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    !value && 'bg-muted/50 font-medium',
                  )}
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  {placeholder}
                </button>
              </li>
            )}
            {filteredOptions.map((opt) => (
              <li key={opt.value} role="option" aria-selected={value === opt.value}>
                <button
                  type="button"
                  className={cn(
                    'w-full text-left hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
                    isSmall ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    value === opt.value && 'bg-muted/50 font-medium',
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {filteredOptions.length === 0 && query.trim() && (
              <li
                className={cn(
                  'text-center text-muted-foreground',
                  isSmall ? 'px-2 py-3 text-xs' : 'px-3 py-4 text-sm',
                )}
              >
                Nessun risultato
              </li>
            )}
          </ul>
        </div>,
        portalTarget,
      )
    : null

  return (
    <div className={cn('relative', className)}>
      {label && (
        <Label htmlFor={id} className="mb-1.5 block">
          {label}
        </Label>
      )}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${displayLabel}` : undefined}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background text-left text-foreground transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isSmall ? 'h-7 gap-1 px-2 py-1 text-xs' : 'h-9 gap-2 px-3 py-2 text-sm',
          disabled && 'cursor-not-allowed opacity-70',
        )}
        onClick={() => !disabled && handleOpenToggle()}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            isSmall ? 'size-3' : 'size-4',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {dropdownPanel}
    </div>
  )
}
