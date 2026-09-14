'use client'

import { ExternalLink } from 'lucide-react'
import { BookmakerBadge } from './bookmaker-badge'
import { shortBookmakerName } from '@/lib/bookmakers'
import { ageClass, ageLabel, ageSeconds, formatClock, outcomeName } from '@/lib/matcher/format'
import type { MatcherLeg } from '@/types/matcher'
import { cn } from '@/lib/utils'

export type LegRole = 'punta' | 'banca' | 'dutch'

interface LegChipProps {
  leg: MatcherLeg
  role: LegRole
  /** The price to show (gross on an exchange dutch leg). */
  displayOdds: number
  /** Set on an exchange dutch leg: the stored net price, for the tooltip. */
  netOdds?: number | null
  commissionPercent?: number
  now: number
  staleAfterSeconds?: number
  className?: string
}

const TONES: Record<LegRole, { box: string; odds: string; tag: string | null; tagClass: string }> = {
  punta: {
    box: 'border-primary/30 bg-primary/10',
    odds: 'text-primary',
    tag: 'PUNTA',
    tagClass: 'bg-primary/20 text-primary',
  },
  banca: {
    box: 'border-destructive/30 bg-destructive/10',
    odds: 'text-destructive',
    tag: 'BANCA',
    tagClass: 'bg-destructive/20 text-destructive',
  },
  dutch: {
    box: 'border-sky-500/30 bg-sky-500/10',
    odds: 'text-sky-300',
    tag: null,
    tagClass: '',
  },
}

/** The bookmaker's event page, opened in a new tab; the click must not reach the row (which opens the calculator). */
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
      className={cn('inline-flex items-center gap-1 rounded hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}
      title={`Apri l'evento su ${shortBookmakerName(leg.bookmakerName)}`}
      aria-label={`Apri l'evento su ${shortBookmakerName(leg.bookmakerName)}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  )
}

/** One leg of a combination: bookmaker (a link to its event page when known), outcome, price, role and the age of the price as a dot. */
export function LegChip({
  leg,
  role,
  displayOdds,
  netOdds,
  commissionPercent,
  now,
  staleAfterSeconds,
  className,
}: LegChipProps) {
  const tone = TONES[role]
  const age = leg.lastSeenAt ? ageSeconds(leg.lastSeenAt, now) : null
  const priceTitle =
    netOdds != null && commissionPercent != null
      ? `Quota lorda ${displayOdds.toFixed(2)} · netta ${netOdds.toFixed(3)} con commissione ${commissionPercent.toLocaleString('it-IT')}%`
      : undefined
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 align-middle',
        tone.box,
        className,
      )}
    >
      <BookmakerLink leg={leg}>
        <BookmakerBadge slug={leg.bookmakerSlug} name={leg.bookmakerName} />
      </BookmakerLink>
      <span className="truncate text-xs text-foreground">{outcomeName(leg)}</span>
      <span className={cn('font-mono text-sm font-bold tabular-nums', tone.odds)} title={priceTitle}>
        {displayOdds.toFixed(2)}
      </span>
      {tone.tag && (
        <span className={cn('rounded px-1 py-0 text-[9px] font-bold tracking-wide', tone.tagClass)}>
          {tone.tag}
        </span>
      )}
      {age != null && leg.lastSeenAt && (
        <span
          className={cn('inline-block h-2 w-2 shrink-0 rounded-full bg-current', ageClass(age, staleAfterSeconds))}
          title={`Quota vista ${ageLabel(age)} fa (alle ${formatClock(leg.lastSeenAt)})`}
          aria-label={`Quota vista ${ageLabel(age)} fa`}
        />
      )}
    </span>
  )
}
