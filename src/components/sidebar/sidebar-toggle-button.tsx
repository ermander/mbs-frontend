'use client'

import * as React from 'react'
import { ChevronLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SidebarToggleButtonProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarToggleButton({ collapsed, onToggle }: SidebarToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Espandi sidebar' : 'Collassa sidebar'}
      aria-pressed={collapsed}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <ChevronLeft
        className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')}
      />
    </button>
  )
}
