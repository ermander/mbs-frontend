'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  variant: 'enabled' | 'disabled' | 'exchange' | 'bookmaker'
  children: React.ReactNode
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  const base =
    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border border-transparent'

  const styles: Record<StatusBadgeProps['variant'], string> = {
    enabled: 'bg-emerald-600/10 text-emerald-700',
    disabled: 'bg-gray-500/10 text-gray-500',
    exchange: 'bg-indigo-600/10 text-indigo-700',
    bookmaker: 'bg-slate-500/10 text-slate-600',
  }

  return <span className={cn(base, styles[variant])}>{children}</span>
}
