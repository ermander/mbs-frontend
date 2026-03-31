'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' | 'lavender'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-medium border'

  const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-primary/15 text-primary border-primary/20',
    outline: 'border-border bg-transparent text-foreground',
    destructive: 'bg-destructive/15 text-destructive border-destructive/20',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-neon-orange/15 text-neon-orange border-neon-orange/20',
    info: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20',
    lavender: 'bg-neon-lavender/15 text-neon-lavender border-neon-lavender/20',
  }

  return <span className={cn(base, variantClasses[variant], className)} {...props} />
}
