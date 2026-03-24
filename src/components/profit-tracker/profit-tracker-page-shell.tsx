'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ProfitTrackerPageShellProps = {
  sectionTitle: string
  sectionDescription?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function ProfitTrackerPageShell({
  sectionTitle,
  sectionDescription,
  actions,
  children,
  className,
}: ProfitTrackerPageShellProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <header
        className="flex flex-col gap-1 border-b border-border/60 pb-3 sm:flex-row sm:items-baseline sm:justify-between"
        data-pt-page-header
      >
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {sectionTitle}
        </h1>
        {sectionDescription ? (
          <p className="text-xs text-muted-foreground sm:text-sm">{sectionDescription}</p>
        ) : null}
      </header>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
