'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
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
  /** Optional: when opening, reset search query */
  searchPlaceholder?: string
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
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value])
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase().trim()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [open])

  const handleOpenToggle = () => {
    setQuery('')
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <Label htmlFor={id} className="mb-1.5 block">
          {label}
        </Label>
      )}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${displayLabel}` : undefined}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
        onClick={handleOpenToggle}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg"
          role="listbox"
        >
          <div className="border-b border-border p-1.5">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions.length === 1) {
                  onChange(filteredOptions[0].value)
                  setOpen(false)
                }
              }}
              placeholder={searchPlaceholder}
              className="h-8 border-0 bg-muted/50 text-sm focus-visible:ring-1"
              aria-autocomplete="list"
              aria-controls="searchable-select-list"
              aria-activedescendant={undefined}
            />
          </div>
          <ul id="searchable-select-list" className="max-h-56 overflow-auto py-1" role="listbox">
            <li role="option" aria-selected={value === ''}>
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
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
            {filteredOptions.map((opt) => (
              <li key={opt.value} role="option" aria-selected={value === opt.value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
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
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nessun risultato
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
