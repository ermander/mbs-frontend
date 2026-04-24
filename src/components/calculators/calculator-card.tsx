'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Maximize2, Minimize2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalculatorCardProps {
  title: string
  description: string
  icon: LucideIcon
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function CalculatorCard({
  title,
  description,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: CalculatorCardProps) {
  return (
    <Card className={cn('flex flex-col transition-all duration-200', expanded && 'lg:col-span-2')}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Comprimi calcolatore' : 'Espandi calcolatore'}
          className="shrink-0 gap-1.5"
        >
          {expanded ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Comprimi</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Espandi</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent data-compact={!expanded} className="flex-1">
        {children}
      </CardContent>
    </Card>
  )
}
