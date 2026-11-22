'use client'

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgePercent, ChevronDown, Lock } from 'lucide-react'

import {
  ALL_BOOKS,
  OFFERS_COPY,
  OFFERS_PAGE_SIZE,
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
import { DsButton, DsCard, dsButtonClass } from '@/components/landing/ds-primitives'
import { BookLogo } from '@/components/offers/offer-parts'
import { OffersSignupDialog } from '@/components/offers/offers-signup'
import { OmPagination } from '@/components/strumenti/scanner-v2/om-ds'

interface OffersView {
  book: string
  page: number
}

/**
 * L'elenco delle offerte dal design «OddWise Offerte» (§14.259): il filtro per sito, una sezione
 * per gruppo con le carte su tre colonne (due da md, una sul telefono) e le scadute in fondo. Dal
 * §14.345 una pagina di OFFERS_PAGE_SIZE carte alla volta, letta dal server di Next: tipo, sito e
 * pagina stanno nell'indirizzo, quindi il link «indietro» del dettaglio e il tasto indietro del
 * browser riaprono la stessa vista. Cambiare sito riporta alla pagina 1. Filtro e numero di pagina
 * cambiano subito (useOptimistic); le carte restano quelle di prima, attenuate, finché non arriva
 * la pagina nuova.
 *
 * §14.358: il tipo non si sceglie più qui. Benvenuto, ricorrenti ed esclusive sono tre pagine
 * (/offerte/<tipo>, dalla tendina «Offerte» della barra) e `type` è quello della pagina; la select
 * del tipo che dal §14.351 stava accanto a quella del sito non c'è più. Con `guest` l'elenco è
 * quello per chi non è entrato: il filtro per sito è spento (direbbe di che sito è ogni carta
 * chiusa), le carte chiuse non hanno logo e il loro «Apri la guida» apre l'invito a iscriversi
 * invece della guida.
 */
export function OffersList({
  type,
  book,
  page,
  total,
  offers,
  sections,
  books,
  guest = false,
}: OffersView & {
  /** Il tipo della pagina (§14.358): non cambia dentro l'elenco. */
  type: OfferType
  total: number
  offers: readonly Offer[]
  sections: readonly OfferSectionApi[]
  books: readonly string[]
  /** §14.351: l'elenco per chi non è entrato (carte chiuse, niente filtro per sito). */
  guest?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [view, setView] = useOptimistic<OffersView>({ book, page })
  const [signupOpen, setSignupOpen] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollOnArrival = useRef(false)

  // Il sito sostituisce la voce della cronologia (come prima del §14.345); la pagina ne aggiunge
  // una, così «indietro» torna alla pagina di prima.
  const navigate = (next: OffersView, history: 'push' | 'replace') => {
    startTransition(() => {
      setView(next)
      router[history](offersListHref(type, next.book, next.page), { scroll: false })
    })
  }
  const setBook = (value: string) => navigate({ book: value, page: 1 }, 'replace')
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

  const shown = pageSections(offers, sections, type)

  return (
    <>
      <div
        ref={topRef}
        className="flex scroll-mt-[calc(var(--topnav-h)+1.5rem)] flex-col gap-3 sm:flex-row sm:items-end"
      >
        <FilterSelect
          label={OFFERS_COPY.bookFilterLabel}
          options={guest ? bookOptions([]) : bookOptions(books, view.book)}
          value={guest ? ALL_BOOKS : view.book}
          onChange={setBook}
          disabled={guest}
          hint={guest ? OFFERS_COPY.guestBookFilterHint : undefined}
          className="w-full sm:w-[220px]"
        />
      </div>

      <div
        aria-busy={pending}
        className={cn(
          'flex flex-col gap-8 transition-opacity',
          pending && 'pointer-events-none opacity-60',
        )}
      >
        {shown.map((section) => (
          <section key={section.key} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ds-line pb-3">
              <h2 className="ds-heading">{section.title}</h2>
              <span className="ds-body-sm text-ds-ink-muted">{section.countLabel}</span>
            </div>
            <ul className="grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 min-[87.5rem]:grid-cols-4 min-[112.5rem]:grid-cols-5 min-[140rem]:grid-cols-6">
              {section.offers.map((offer) => (
                <li key={offer.id} className="flex min-w-0">
                  <OfferCard offer={offer} onLockedGuide={() => setSignupOpen(true)} />
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
            {!guest && (
              <>
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
              </>
            )}
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

      {guest && (
        <OffersSignupDialog
          open={signupOpen}
          onOpenChange={setSignupOpen}
          from={offersListHref(type, ALL_BOOKS, view.page)}
        />
      )}
    </>
  )
}

/**
 * Il Select del design in taglia sm: etichetta sopra, controllo da 32px con la freccia a destra.
 * Dal §14.358 serve solo al sito; spento (ospiti) mostra `hint` al passaggio.
 */
function FilterSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  hint,
  className,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hint?: string
  className?: string
}) {
  const id = useId()
  const hintId = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} title={hint}>
      <label
        htmlFor={id}
        className={cn(
          'flex items-center gap-1.5 text-sm leading-5 font-semibold',
          disabled ? 'text-ds-ink-muted' : 'text-ds-ink',
        )}
      >
        {label}
        {disabled && <Lock aria-hidden className="h-3.5 w-3.5" />}
      </label>
      <div
        className={cn(
          'relative flex h-8 rounded-ds-sm border border-ds-line-strong text-ds-ink transition-[border-color,box-shadow] focus-within:border-ds-brand focus-within:shadow-ds-focus',
          disabled ? 'bg-ds-surface-sunken text-ds-ink-muted' : 'bg-ds-surface-raised',
        )}
      >
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-full min-w-0 flex-1 appearance-none border-0 bg-transparent pr-8 pl-3 text-base outline-hidden',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
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
      {hint && (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      )}
    </div>
  )
}

/**
 * La carta di un'offerta: logo e stato, titolo, riquadro con profitto e difficoltà, guida in fondo.
 * §14.351: una carta chiusa (ospiti) ha uno skeleton al posto del logo, il titolo coperto che
 * arriva dal backend e un «Apri la guida» che chiama `onLockedGuide` (l'invito a iscriversi).
 */
function OfferCard({ offer, onLockedGuide }: { offer: Offer; onLockedGuide: () => void }) {
  const expired = isExpired(offer)
  const badge = offerBadge(offer)
  const guideLabel = expired ? OFFERS_COPY.readGuide : OFFERS_COPY.openGuide

  return (
    <DsCard className="flex w-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        {offer.locked ? (
          <span
            aria-label={OFFERS_COPY.lockedLogoLabel}
            role="img"
            className="inline-flex h-6 w-24 items-center justify-center rounded-ds-xs bg-ds-surface-sunken text-ds-ink-muted"
          >
            <Lock aria-hidden className="h-3.5 w-3.5" />
          </span>
        ) : (
          <BookLogo slug={offer.bookSlug} name={offer.bookName} />
        )}
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
        {offer.locked ? (
          <button
            type="button"
            onClick={onLockedGuide}
            aria-haspopup="dialog"
            className={cn(dsButtonClass('secondary', 'sm'), 'ml-auto')}
          >
            {guideLabel}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : (
          <DsButton
            href={offerHref(offer)}
            variant="secondary"
            size="sm"
            iconEnd="arrow-right"
            className="ml-auto"
          >
            {guideLabel}
          </DsButton>
        )}
      </div>
    </DsCard>
  )
}
