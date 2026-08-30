'use client'

import { cn } from '@/lib/utils'
import { TEAM_SCOPE_LABELS, type TeamScope } from '@/lib/calculators/markets'

interface TeamScopeToggleProps {
  value: TeamScope | ''
  onChange: (scope: TeamScope) => void
  className?: string
}

export function TeamScopeToggle({ value, onChange, className }: TeamScopeToggleProps) {
  return (
    <div
      className={cn('flex w-fit overflow-hidden rounded-md border border-border', className)}
      role="group"
      aria-label="Squadra"
    >
      {(['CASA', 'OSPITE'] as const).map((scope) => (
        <button
          key={scope}
          type="button"
          onClick={() => onChange(scope)}
          aria-pressed={value === scope}
          className={cn(
            'px-2.5 py-1 text-xs font-medium transition-colors',
            value === scope
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {TEAM_SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  )
}
