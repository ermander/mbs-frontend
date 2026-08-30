'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BET_CATEGORIES } from '@/lib/profit-tracker/categories'
import type { BetCategory } from '@/types/profit-tracker'

interface BetCategorySelectProps {
  value: BetCategory
  onChange: (value: BetCategory) => void
  className?: string
}

/**
 * Selettore mutuamente esclusivo della categoria del profitto
 * (Matched Betting / Surebet / Valuebet) usato nei calcolatori offline
 * e nella modale della giocata singola.
 */
export function BetCategorySelect({ value, onChange, className }: BetCategorySelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs text-muted-foreground">Categoria</Label>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-input bg-muted/30 p-1">
        {BET_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            aria-pressed={value === cat.value}
            className={cn(
              'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              value === cat.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
