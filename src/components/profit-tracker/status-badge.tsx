'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  variant: 'enabled' | 'disabled' | 'exchange' | 'bookmaker' | 'blocked'
  children: React.ReactNode
  title?: string
  className?: string
}

export function StatusBadge({ variant, children, title, className }: StatusBadgeProps) {
  const base = 'inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-medium border'

  const styles: Record<StatusBadgeProps['variant'], string> = {
    enabled: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    disabled: 'bg-muted text-muted-foreground border-border',
    exchange: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    bookmaker: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    blocked: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  }

  return (
    <span className={cn(base, styles[variant], className)} title={title}>
      {children}
    </span>
  )
}
