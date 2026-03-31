'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  variant: 'enabled' | 'disabled' | 'exchange' | 'bookmaker'
  children: React.ReactNode
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  const base = 'inline-flex rounded-pill px-2.5 py-0.5 text-[11px] font-medium border'

  const styles: Record<StatusBadgeProps['variant'], string> = {
    enabled: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    disabled: 'bg-white/5 text-white/40 border-white/10',
    exchange: 'bg-neon-lavender/15 text-neon-lavender border-neon-lavender/20',
    bookmaker: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20',
  }

  return <span className={cn(base, styles[variant])}>{children}</span>
}
