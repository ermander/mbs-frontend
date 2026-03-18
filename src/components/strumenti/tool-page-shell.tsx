'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ToolPageShellProps = {
  toolName: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function ToolPageShell({
  toolName,
  description,
  actions,
  children,
  className,
}: ToolPageShellProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Strumenti: {toolName}
        </h1>
        {description ? (
          <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
      </header>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      <div className="space-y-4">{children}</div>
    </section>
  )
}
