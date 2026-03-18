'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium'

  const variantClasses =
    variant === 'outline'
      ? 'border border-border bg-transparent text-foreground'
      : 'bg-primary text-primary-foreground'

  return <span className={cn(base, variantClasses, className)} {...props} />
}
