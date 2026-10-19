import { formatMoney, formatRating } from '@/lib/landing-format'
import { cn } from '@/lib/utils'

/** Badge, importo e rating del design system OddWise (Claude Design, §14.248). */

export type DsBadgeTone = 'neutral' | 'brand' | 'accent' | 'profit' | 'loss' | 'warning' | 'info'

const badgeTone: Record<DsBadgeTone, string> = {
  neutral: 'bg-ds-surface-sunken text-ds-ink-muted',
  brand: 'bg-ds-brand-soft text-ds-brand',
  accent: 'bg-ds-accent text-ds-on-accent',
  profit: 'bg-ds-profit-soft text-ds-profit',
  loss: 'bg-ds-loss-soft text-ds-loss',
  warning: 'bg-ds-warning-soft text-ds-warning',
  info: 'bg-ds-info-soft text-ds-info',
}

/** Una o due parole di stato accanto a un titolo. */
export function DsBadge({
  tone = 'neutral',
  title,
  className,
  children,
}: {
  tone?: DsBadgeTone
  title?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium leading-4 tracking-[0.02em]',
        badgeTone[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const moneySize = {
  sm: 'text-sm font-medium leading-5',
  md: 'text-base leading-6',
  xl: 'text-[32px] leading-9 tracking-[-0.01em]',
} as const

/** Importo in euro all'italiana con il segno esplicito e il colore del risultato (profit, loss). */
export function DsMoney({
  value,
  size = 'md',
  neutral,
  className,
}: {
  value: number
  size?: keyof typeof moneySize
  /** Un importo che non è un risultato (liquidità, responsabilità): senza segno né colore. */
  neutral?: boolean
  className?: string
}) {
  const tone = neutral ? '' : value > 0 ? 'text-ds-profit' : value < 0 ? 'text-ds-loss' : ''
  return (
    <span
      className={cn(
        'whitespace-nowrap font-semibold tabular-nums',
        moneySize[size],
        tone,
        className,
      )}
    >
      {formatMoney(value, { sign: !neutral })}
    </span>
  )
}

/** Il tono del rating: profit da 95 %, warning da 90 %, neutro sotto. */
export function ratingTone(value: number): DsBadgeTone {
  if (value >= 95) return 'profit'
  if (value >= 90) return 'warning'
  return 'neutral'
}

/** Rating di una coppia puntata/bancata: sempre la percentuale scritta, il tono dalle soglie. */
export function DsRatingBadge({ value, className }: { value: number; className?: string }) {
  return (
    <DsBadge
      tone={ratingTone(value)}
      title="Rating"
      className={cn('text-[13px] font-semibold tabular-nums tracking-normal', className)}
    >
      {formatRating(value)}
    </DsBadge>
  )
}
