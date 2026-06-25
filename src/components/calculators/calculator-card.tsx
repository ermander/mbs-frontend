'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Maximize2 } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
    <>
      <Card className="flex flex-col">
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
            aria-label="Espandi calcolatore"
            className="shrink-0 gap-1.5"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Espandi</span>
          </Button>
        </CardHeader>
      </Card>

      <Dialog
        open={expanded}
        onOpenChange={(open) => {
          if (!open) onToggle()
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
            </div>
          </div>
          {children}
        </DialogContent>
      </Dialog>
    </>
  )
}
