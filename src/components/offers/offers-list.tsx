'use client'

import { useId, useRef, useState } from 'react'
import { BadgePercent, ChevronDown } from 'lucide-react'

import { bookmakerLogoSrc } from '@/lib/bookmakers'
import {
  ALL_BOOKS,
  OFFERS_COPY,
  OFFER_TYPES,
  activeCount,
  bookOptions,
  emptyTitle,
  formatOfferDate,
  isExpired,
  offerBadge,
  offerHref,
  offerSections,
  type Offer,
  type OfferType,
} from '@/lib/offers-content'
import { cn } from '@/lib/utils'
import { DsBadge, DsMoney } from '@/components/landing/ds-data'
import { DsButton, DsCard, dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'

/**
 * L'elenco delle offerte dal design «OddWise Offerte» (§14.259): le tre schede del tipo, il filtro
 * per sito, una sezione per gruppo con le carte su tre colonne (due da md, una sul telefono) e le
 * scadute in fondo. Cambiare tipo azzera il filtro, come nel design.
 */
export function OffersList({ offers }: { offers: readonly Offer[] }) {
  const [type, setType] = useState<OfferType>('benvenuto')
  const [book, setBook] = useState<string>(ALL_BOOKS)
  const panelId = useId()

  const selectType = (value: OfferType) => {
    setType(value)
    setBook(ALL_BOOKS)
  }

  const sections = offerSections(offers, type, book)

  return (
    <>
      <TypeTabs offers={offers} value={type} onChange={selectType} panelId={panelId} />

      <div id={panelId} role="tabpanel" className="flex flex-col gap-8">
        <div className="-mt-2 flex justify-end">
          <BookSelect
            options={bookOptions(offers, type)}
            value={book}
            onChange={setBook}
            className="w-full sm:w-[220px]"
          />
        </div>

        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ds-line pb-3">
              <h2 className="ds-heading">{section.title}</h2>
              <span className="ds-body-sm text-ds-ink-muted">{section.countLabel}</span>
            </div>
            <ul className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
              {section.offers.map((offer) => (
                <li key={offer.id} className="flex min-w-0">
                  <OfferCard offer={offer} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {sections.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span
              aria-hidden
              className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted"
            >
              <BadgePercent className="h-8 w-8" />
            </span>
            <h2 className="ds-heading">{emptyTitle(type, book)}</h2>
            <p className="ds-body max-w-[440px] text-ds-ink-muted">
              {OFFERS_COPY.emptyDescription}
            </p>
            <button
              type="button"
              onClick={() => setBook(ALL_BOOKS)}
              className={cn(dsButtonClass('secondary', 'md'), 'mt-3')}
            >
              {OFFERS_COPY.emptyAction}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/** Le schede del tipo: card da 10px con nome, «N attive» e descrizione; quella scelta in brand-soft. */
function TypeTabs({
  offers,
  value,
  onChange,
  panelId,
}: {
  offers: readonly Offer[]
  value: OfferType
  onChange: (value: OfferType) => void
  panelId: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // Frecce, Home e Fine spostano la scheda scelta (tablist con attivazione automatica).
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = OFFER_TYPES.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    onChange(OFFER_TYPES[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={OFFERS_COPY.tablistLabel}
      className="grid gap-3 sm:grid-cols-3 sm:gap-6"
    >
      {OFFER_TYPES.map((t, i) => {
        const selected = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              'flex flex-col gap-1.5 rounded-ds-md border px-5 py-4 text-left text-ds-ink shadow-ds-sm transition-[border-color,background-color,box-shadow] hover:shadow-ds-md',
              selected ? 'border-ds-brand bg-ds-brand-soft' : 'border-ds-line bg-ds-surface-raised',
              dsFocusRing,
            )}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className={cn('ds-heading', selected ? 'text-ds-brand' : 'text-ds-ink')}>
                {t.label}
              </span>
              <span className="ds-num-sm whitespace-nowrap text-ds-ink-muted">
                {activeCount(offers, t.value)} attive
              </span>
            </span>
            <span className="ds-body-sm text-pretty text-ds-ink-muted">{t.description}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Il Select del design in taglia sm: etichetta sopra, controllo da 32px con la freccia a destra. */
function BookSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-semibold leading-5 text-ds-ink">
        {OFFERS_COPY.bookFilterLabel}
      </label>
      <div className="relative flex h-8 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised text-ds-ink transition-[border-color,box-shadow] focus-within:border-ds-brand focus-within:shadow-ds-focus">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pl-3 pr-8 text-base outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ds-ink-muted"
        />
      </div>
    </div>
  )
}

/** Logo del sito alto 24px; senza file, il nome in una pastiglia col bordo. */
function BookLogo({ slug, name }: { slug: string; name: string }) {
  const src = bookmakerLogoSrc(slug)
  if (!src) {
    return (
      <span className="inline-flex h-6 items-center whitespace-nowrap rounded-ds-xs border border-ds-line bg-ds-surface-raised px-2 text-xs font-semibold leading-4 tracking-[0.02em] text-ds-ink">
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
      width={96}
      height={24}
      className="block h-6 w-auto rounded-ds-xs"
    />
  )
}

/** La carta di un'offerta: logo e stato, titolo, riquadro con profitto e difficoltà, guida in fondo. */
function OfferCard({ offer }: { offer: Offer }) {
  const expired = isExpired(offer)
  const badge = offerBadge(offer)

  return (
    <DsCard className="flex w-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        <BookLogo slug={offer.bookSlug} name={offer.bookName} />
        <DsBadge tone={badge.tone}>{badge.label}</DsBadge>
      </div>

      <h3
        className={cn(
          'ds-heading mt-3 flex-1 text-pretty',
          expired ? 'text-ds-ink-muted' : 'text-ds-ink',
        )}
      >
        {offer.title}
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-ds-sm bg-ds-surface-sunken px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <dt className="ds-caption tracking-[0.02em] text-ds-ink-muted">
            {OFFERS_COPY.profitLabel}
          </dt>
          <dd>
            {offer.profit === null ? (
              <span className="text-base font-semibold leading-6">
                {OFFERS_COPY.variableProfit}
              </span>
            ) : (
              <DsMoney value={offer.profit} neutral={expired} />
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="ds-caption tracking-[0.02em] text-ds-ink-muted">
            {OFFERS_COPY.difficultyLabel}
          </dt>
          <dd className="text-base font-semibold leading-6">{offer.difficulty}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        {expired && offer.expiredOn && (
          <span className="ds-caption tracking-[0.02em] text-ds-ink-muted">
            Scaduta il {formatOfferDate(offer.expiredOn)}
          </span>
        )}
        <DsButton
          href={offerHref(offer)}
          variant="secondary"
          size="sm"
          iconEnd="arrow-right"
          className="ml-auto"
        >
          {expired ? OFFERS_COPY.readGuide : OFFERS_COPY.openGuide}
        </DsButton>
      </div>
    </DsCard>
  )
}
