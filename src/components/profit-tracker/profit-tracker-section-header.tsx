'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ProfitTrackerSectionHeaderProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function ProfitTrackerSectionHeader({
  title,
  subtitle,
  actions,
  className,
}: ProfitTrackerSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  )
}
