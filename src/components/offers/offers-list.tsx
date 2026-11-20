'use client'

import { useEffect, useId, useOptimistic, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BadgePercent, ChevronDown } from 'lucide-react'

import {
  ALL_BOOKS,
  OFFERS_COPY,
  OFFERS_PAGE_SIZE,
  OFFER_TYPES,
  bookOptions,
  emptyTitle,
  formatOfferDate,
  isExpired,
  offerBadge,
  offerHref,
  offersListHref,
  pageSections,
  type Offer,
  type OfferType,
} from '@/lib/offers-content'
import type { OfferSectionApi } from '@/types/offers'
import { cn } from '@/lib/utils'
import { DsBadge, DsMoney } from '@/components/landing/ds-data'
import { DsButton, DsCard, dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { BookLogo } from '@/components/offers/offer-parts'
import { OmPagination } from '@/components/strumenti/scanner-v2/om-ds'

interface OffersView {
  type: OfferType
  book: string
  page: number
}

/**
 * L'elenco delle offerte dal design «OddWise Offerte» (§14.259): le tre schede del tipo, il filtro
 * per sito, una sezione per gruppo con le carte su tre colonne (due da md, una sul telefono) e le
 * scadute in fondo. Dal §14.345 una pagina di OFFERS_PAGE_SIZE carte alla volta, letta dal server
 * di Next: tipo, sito e pagina stanno nell'indirizzo (?tipo=&sito=&pagina=), quindi il link
 * «indietro» del dettaglio e il tasto indietro del browser riaprono la stessa vista. Cambiare tipo
 * azzera il sito, come nel design, e cambiare tipo o sito riporta alla pagina 1. Schede, filtro e
 * numero di pagina cambiano subito (useOptimistic); le carte restano quelle di prima, attenuate,
 * finché non arriva la pagina nuova.
 */
export function OffersList({
  type,
  book,
  page,
  total,
  offers,
  sections,
  activeByType,
  books,
}: OffersView & {
  total: number
  offers: readonly Offer[]
  sections: readonly OfferSectionApi[]
  activeByType: Record<OfferType, number>
  books: readonly string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useOptimistic<OffersView>({ type, book, page })
  const panelId = useId()
  const topRef = useRef<HTMLDivElement>(null)
  const scrollOnArrival = useRef(false)

  // Tipo e sito sostituiscono la voce della cronologia (come prima del §14.345); la pagina ne
  // aggiunge una, così «indietro» torna alla pagina di prima.
  const navigate = (next: OffersView, history: 'push' | 'replace') => {
    startTransition(() => {
      setView(next)
      router[history](offersListHref(next.type, next.book, next.page), { scroll: false })
    })
  }
  const selectType = (value: OfferType) =>
    navigate({ type: value, book: ALL_BOOKS, page: 1 }, 'replace')
  const setBook = (value: string) => navigate({ type: view.type, book: value, page: 1 }, 'replace')
  const goToPage = (value: number) => {
    scrollOnArrival.current = true
    navigate({ ...view, page: value }, 'push')
  }

  // Con la pagina nuova arrivata, si riparte dall'inizio dell'elenco (le schede).
  useEffect(() => {
    if (!scrollOnArrival.current) return
    scrollOnArrival.current = false
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [page])

  const shown = pageSections(offers, sections)

  return (
    <>
      <div ref={topRef} className="scroll-mt-[calc(var(--topnav-h)+1.5rem)]">
        <TypeTabs counts={activeByType} value={view.type} onChange={selectType} panelId={panelId} />
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-busy={pending}
        className={cn(
          'flex flex-col gap-8 transition-opacity',
          pending && 'pointer-events-none opacity-60',
        )}
      >
        <div className="-mt-2 flex justify-end">
          <BookSelect
            options={bookOptions(books, view.book)}
            value={view.book}
            onChange={setBook}
            className="w-full sm:w-[220px]"
          />
        </div>

        {shown.map((section) => (
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

        {total === 0 && (
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

        {total > OFFERS_PAGE_SIZE && (
          <OmPagination
            page={view.page - 1}
            pageSize={OFFERS_PAGE_SIZE}
            total={total}
            unit={OFFERS_COPY.pageUnit}
            onChange={(index) => goToPage(index + 1)}
          />
        )}
      </div>
    </>
  )
}

/** Le schede del tipo: card da 10px con nome, «N attive» e descrizione; quella scelta in brand-soft. */
function TypeTabs({
  counts,
  value,
  onChange,
  panelId,
}: {
  counts: Record<OfferType, number>
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
                {counts[t.value] ?? 0} attive
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
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ds-ink">
        {OFFERS_COPY.bookFilterLabel}
      </label>
      <div className="relative flex h-8 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised text-ds-ink transition-[border-color,box-shadow] focus-within:border-ds-brand focus-within:shadow-ds-focus">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-8 pl-3 text-base outline-hidden"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-ds-ink-muted"
        />
      </div>
    </div>
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
              <span className="text-base leading-6 font-semibold">
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
          <dd className="text-base leading-6 font-semibold">{offer.difficulty}</dd>
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
