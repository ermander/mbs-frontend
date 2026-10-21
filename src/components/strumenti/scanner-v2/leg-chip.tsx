'use client'

import { shortBookmakerName } from '@/lib/bookmakers'
import type { MatcherLeg } from '@/types/matcher'
import { cn } from '@/lib/utils'

/** The bookmaker's event page, opened in a new tab by clicking the logo itself (no extra icon); the click must not reach the row (which opens the calculator). */
export function BookmakerLink({
  leg,
  children,
  className,
}: {
  leg: Pick<MatcherLeg, 'bookmakerName' | 'eventUrl'>
  children: React.ReactNode
  className?: string
}) {
  if (!leg.eventUrl) return <>{children}</>
  return (
    <a
      href={leg.eventUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-1 rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      title={`Apri l'evento su ${shortBookmakerName(leg.bookmakerName)}`}
      aria-label={`Apri l'evento su ${shortBookmakerName(leg.bookmakerName)}`}
    >
      {children}
    </a>
  )
}
