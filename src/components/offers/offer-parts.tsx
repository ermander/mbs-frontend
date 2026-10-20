import { CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react'

import { bookmakerLogoSrc } from '@/lib/bookmakers'
import { CALLOUT_TITLES, richTextParts } from '@/lib/offer-guides'
import type { GuideCalloutTone } from '@/types/offers'
import { cn } from '@/lib/utils'

/** Pezzi comuni a elenco e dettaglio delle offerte (§14.259-14.260), dai componenti del design. */

const logoSize = {
  md: { box: 'h-6', width: 96, height: 24 },
  lg: { box: 'h-8', width: 128, height: 32 },
} as const

/** Logo del sito (24px, 32px in lg); senza file, il nome in una pastiglia col bordo. */
export function BookLogo({
  slug,
  name,
  size = 'md',
}: {
  slug: string
  name: string
  size?: keyof typeof logoSize
}) {
  const src = bookmakerLogoSrc(slug)
  const s = logoSize[size]
  if (!src) {
    return (
      <span
        className={cn(
          'inline-flex items-center whitespace-nowrap rounded-ds-xs border border-ds-line bg-ds-surface-raised px-2 text-xs font-semibold leading-4 tracking-[0.02em] text-ds-ink',
          s.box,
        )}
      >
        {name}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      width={s.width}
      height={s.height}
      className={cn('block w-auto rounded-ds-xs', s.box)}
    />
  )
}

const calloutTone: Record<GuideCalloutTone, { box: string; accent: string; Icon: typeof Info }> = {
  note: { box: 'bg-ds-info-soft', accent: 'text-ds-info', Icon: Info },
  tip: { box: 'bg-ds-brand-soft', accent: 'text-ds-brand', Icon: Lightbulb },
  warning: { box: 'bg-ds-warning-soft', accent: 'text-ds-warning', Icon: TriangleAlert },
  danger: { box: 'bg-ds-loss-soft', accent: 'text-ds-loss', Icon: CircleX },
}

/** Il riquadro che interrompe la prosa: nota, consiglio, attenzione, errore comune. */
export function DsCallout({
  tone,
  title,
  children,
}: {
  tone: GuideCalloutTone
  title?: string
  children: React.ReactNode
}) {
  const t = calloutTone[tone]
  return (
    <div
      role={tone === 'warning' || tone === 'danger' ? 'note' : undefined}
      className={cn('flex gap-3 rounded-ds-md p-4', t.box)}
    >
      <t.Icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', t.accent)} />
      <div className="min-w-0">
        <p className={cn('ds-subheading mb-1', t.accent)}>{title ?? CALLOUT_TITLES[tone]}</p>
        <div className="ds-body text-ds-ink">{children}</div>
      </div>
    </div>
  )
}

/** Un testo delle guide con le parti in **grassetto**. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {richTextParts(text).map((part, i) =>
        part.strong ? (
          <strong key={i} className="font-semibold">
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </>
  )
}
