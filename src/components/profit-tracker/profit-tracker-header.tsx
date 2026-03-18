'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ProfitTrackerHeaderProps = {
  className?: string
  rightSlot?: ReactNode
}

export function ProfitTrackerHeader({ className, rightSlot }: ProfitTrackerHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Strumenti · Profit Tracker
        </p>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Profit Tracker
        </h1>
      </div>
      {rightSlot ? <div className="mt-2 sm:mt-0">{rightSlot}</div> : null}
    </div>
  )
}
