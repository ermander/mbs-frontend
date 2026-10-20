'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calculator, ChevronLeft, CircleCheck, ExternalLink, Search } from 'lucide-react'

import {
  GUIDE_COPY,
  formatLongDate,
  guideMetaLine,
  stepAnchor,
  stepsTitle,
} from '@/lib/offer-guides'
import {
  OFFERS_COPY,
  OFFER_TYPES,
  formatOfferDate,
  isExpired,
  offerBadge,
  offersListHref,
  type Offer,
} from '@/lib/offers-content'
import { cn } from '@/lib/utils'
import type { GuideBlock, GuideButton as GuideButtonData, OfferGuide } from '@/types/offers'
import { DsBadge, DsMoney } from '@/components/landing/ds-data'
import {
  DsCard,
  DsContainer,
  dsButtonClass,
  dsFocusRing,
  type DsButtonSize,
  type DsButtonVariant,
} from '@/components/landing/ds-primitives'
import { BookLogo, DsCallout, RichText } from '@/components/offers/offer-parts'

/**
 * Dettaglio di un'offerta dal design «OddWise Offerta» (§14.260): a sinistra la colonna da 720px
 * con testata, dati chiave, introduzione, passi, domande e termini; a destra, da lg, l'indice dei
 * passi da 280px che resta fisso e segna il passo che si sta leggendo. Senza guida restano la
 * testata, profitto e difficoltà e l'avviso «in preparazione». Dal §14.262 la guida ha la forma
 * dell'API (passi fatti di blocchi) e ogni parte vuota non si mostra: lo stesso componente fa da
 * anteprima nell'editor del backoffice. Gli stati personali del design («Segna come completata»,
 * il riquadro «Finito?») restano fuori finché la pagina è pubblica.
 */
export function OfferDetail({
  offer,
  guide,
  updatedOn,
}: {
  offer: Offer
  guide: OfferGuide | null
  /** AAAA-MM-GG dell'ultimo aggiornamento, nella riga sotto il titolo. */
  updatedOn?: string
}) {
  const expired = isExpired(offer)
  const badge = offerBadge(offer)
  const typeLabel = OFFER_TYPES.find((t) => t.value === offer.type)?.label ?? offer.type
  const crumbs = [GUIDE_COPY.back, typeLabel, offer.group].filter(Boolean).join(' · ')
  const activeStep = useActiveStep(guide?.steps.length ?? 0)

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: GUIDE_COPY.profit,
      value:
        offer.profit === null ? (
          OFFERS_COPY.variableProfit
        ) : (
          <DsMoney value={offer.profit} neutral={expired} />
        ),
    },
  ]
  if (guide?.facts.budget != null) {
    facts.push({ label: GUIDE_COPY.budget, value: <DsMoney value={guide.facts.budget} neutral /> })
  }
  if (guide?.facts.time) facts.push({ label: GUIDE_COPY.time, value: guide.facts.time })
  facts.push({ label: GUIDE_COPY.difficulty, value: offer.difficulty })
  if (guide?.facts.minOdds) facts.push({ label: GUIDE_COPY.minOdds, value: guide.facts.minOdds })
  if (guide?.facts.depositWithin) {
    facts.push({ label: GUIDE_COPY.depositWithin, value: guide.facts.depositWithin })
  }

  return (
    <DsContainer className="pb-24 pt-6">
      <div className="grid items-start gap-y-10 lg:grid-cols-[minmax(0,720px)_280px] lg:justify-between lg:gap-x-16">
        <article className="min-w-0">
          <Link
            href={offersListHref(offer.type)}
            className={cn(
              'ds-body-sm inline-flex items-center gap-1.5 rounded-sm text-ds-ink-muted transition-colors hover:text-ds-brand hover:underline',
              dsFocusRing,
            )}
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
            {crumbs}
          </Link>

          <header className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <BookLogo slug={offer.bookSlug} name={offer.bookName} size="lg" />
              <DsBadge tone={badge.tone}>{badge.label}</DsBadge>
            </div>
            <h1 className="ds-display text-pretty">{offer.title}</h1>
            <p className="ds-body-sm text-ds-ink-muted">
              {guideMetaLine(offer, guide ? updatedOn : undefined)}
            </p>
          </header>

          {expired && offer.expiredOn && (
            <div className="mt-6">
              <DsCallout tone="note">
                <p>{GUIDE_COPY.expiredNote(formatOfferDate(offer.expiredOn))}</p>
              </DsCallout>
            </div>
          )}

          <FactsGrid facts={facts} />

          {guide ? (
            <GuideBody guide={guide} expired={expired} activeStep={activeStep} />
          ) : (
            <div className="mt-8 flex flex-col items-start gap-4">
              <DsCallout tone="note">
                <p>{GUIDE_COPY.missingGuide}</p>
              </DsCallout>
              <Link href={offersListHref(offer.type)} className={dsButtonClass('secondary', 'md')}>
                <ChevronLeft aria-hidden className="h-5 w-5" />
                {GUIDE_COPY.backToOffers}
              </Link>
            </div>
          )}

          <p className="ds-caption mt-12 tracking-[0.02em] text-ds-ink-muted lg:hidden">
            {OFFERS_COPY.responsibleGaming}
          </p>
        </article>

        <aside className="hidden flex-col gap-6 pt-[52px] lg:sticky lg:top-6 lg:flex">
          {guide && guide.steps.length > 0 && <StepsNav guide={guide} activeStep={activeStep} />}
          <p className="ds-caption tracking-[0.02em] text-ds-ink-muted">
            {OFFERS_COPY.responsibleGaming}
          </p>
        </aside>
      </div>
    </DsContainer>
  )
}

/**
 * I dati chiave in celle separate da una riga da 1px: due colonne sul telefono, tre da sm se
 * sono almeno tre. I dati vuoti della guida non ci sono, quindi l'ultima riga si completa con
 * celle bianche (contate per ciascuna larghezza) invece di lasciare un buco grigio.
 */
function FactsGrid({ facts }: { facts: { label: string; value: React.ReactNode }[] }) {
  const n = facts.length
  const smCols = n >= 3 ? 3 : 2
  const fillMobile = n % 2
  const fillSm = (smCols - (n % smCols)) % smCols
  return (
    <dl
      className={cn(
        'mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-ds-md border border-ds-line bg-ds-line',
        smCols === 3 && 'sm:grid-cols-3',
      )}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5 bg-ds-surface-raised px-4 py-3">
          <dt className="ds-caption tracking-[0.02em] text-ds-ink-muted">{fact.label}</dt>
          <dd className="text-base font-semibold leading-6">{fact.value}</dd>
        </div>
      ))}
      {Array.from({ length: Math.max(fillMobile, fillSm) }, (_, i) => (
        <div
          key={`vuota-${i}`}
          aria-hidden
          className={cn(
            'bg-ds-surface-raised',
            i < fillMobile ? 'block' : 'hidden',
            i < fillSm ? 'sm:block' : 'sm:hidden',
          )}
        />
      ))}
    </dl>
  )
}

function GuideBody({
  guide,
  expired,
  activeStep,
}: {
  guide: OfferGuide
  expired: boolean
  activeStep: number
}) {
  const { terms } = guide
  return (
    <>
      {guide.signup && !expired && (
        <div className="mt-4 flex flex-wrap gap-3">
          <GuideButton
            button={{ kind: 'external', label: guide.signup.label, href: guide.signup.url }}
            variant="primary"
          />
        </div>
      )}

      {guide.intro && (
        <p className="ds-body-lg mt-8 text-pretty">
          <RichText text={guide.intro} />
        </p>
      )}
      {guide.requirement && (
        <p className="ds-body mt-4 text-pretty text-ds-ink-muted">
          <RichText text={guide.requirement} />
        </p>
      )}
      {guide.warning && (
        <div className="mt-6">
          <DsCallout tone="warning">
            <p>
              <RichText text={guide.warning} />
            </p>
          </DsCallout>
        </div>
      )}

      {guide.steps.length > 0 && (
        <>
          <h2 className="ds-title mt-12">{stepsTitle(guide.steps.length)}</h2>
          <div className="mt-6 border-b border-ds-line">
            {guide.steps.map((step, i) => {
              const n = i + 1
              const here = n === activeStep
              return (
                <section
                  key={n}
                  id={stepAnchor(n)}
                  aria-labelledby={`${stepAnchor(n)}-titolo`}
                  className="grid scroll-mt-6 grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-ds-line py-6"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-ds-surface-raised text-[17px] font-semibold leading-6 transition-colors',
                      here ? 'border-ds-brand text-ds-brand' : 'border-ds-line-strong text-ds-ink',
                    )}
                  >
                    {n}
                  </span>
                  <div className="flex min-w-0 flex-col gap-4">
                    <h3 id={`${stepAnchor(n)}-titolo`} className="ds-heading sm:leading-10">
                      <span className="sr-only">Passo {n}: </span>
                      {step.title}
                    </h3>
                    {step.blocks.map((block, j) => (
                      <BlockView key={j} block={block} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      {guide.faq.length > 0 && (
        <>
          <h2 className="ds-title mt-14">{GUIDE_COPY.faqTitle}</h2>
          <div className="mt-2 flex flex-col">
            {guide.faq.map((item, i) => (
              <div key={i} className="border-b border-ds-line py-5">
                <h3 className="ds-subheading">{item.question}</h3>
                <p className="ds-body mt-1.5 text-pretty text-ds-ink-muted">
                  <RichText text={item.answer} />
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {terms.rows.length > 0 && (
        <>
          <h2 className="ds-title mt-14">{GUIDE_COPY.termsTitle}</h2>
          <DsCard className="mt-5">
            <dl className="ds-body-sm grid gap-x-6 gap-y-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              {terms.rows.map((term, i) => (
                <div key={i} className="sm:contents">
                  <dt className="text-ds-ink-muted">{term.label}</dt>
                  <dd>{term.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-ds-line pt-4">
              <span className="ds-caption tracking-[0.02em] text-ds-ink-muted">
                {terms.verifiedOn && `Verificati il ${formatLongDate(terms.verifiedOn)}. `}
                {GUIDE_COPY.termsNote}
              </span>
              {terms.url && (
                <GuideButton
                  button={{
                    kind: 'external',
                    label: terms.linkLabel || GUIDE_COPY.termsLinkFallback,
                    href: terms.url,
                  }}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>
          </DsCard>
        </>
      )}
    </>
  )
}

/** Un blocco di un passo: paragrafo, checklist, riquadro, immagine o fila di pulsanti. */
function BlockView({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="ds-body text-pretty">
          <RichText text={block.text} />
        </p>
      )
    case 'checklist':
      return (
        <ol className="ds-body flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CircleCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ds-brand" />
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ol>
      )
    case 'callout':
      return (
        <DsCallout tone={block.tone}>
          <p>
            <RichText text={block.text} />
          </p>
        </DsCallout>
      )
    case 'image':
      return (
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            loading="lazy"
            className="h-auto max-w-full rounded-ds-md border border-ds-line"
          />
          {block.caption && (
            <figcaption className="ds-body-sm text-ds-ink-muted">{block.caption}</figcaption>
          )}
        </figure>
      )
    case 'buttons':
      return (
        <div className="flex flex-wrap gap-3">
          {block.buttons.map((button, i) => (
            <GuideButton key={i} button={button} />
          ))}
        </div>
      )
  }
}

const buttonIcon = { oddsmatcher: Search, calculator: Calculator } as const

/** Pulsante di una guida: i siti esterni in una scheda nuova con l'icona in coda, il resto interno. */
function GuideButton({
  button,
  variant = 'secondary',
  size = 'md',
}: {
  button: GuideButtonData
  variant?: DsButtonVariant
  size?: DsButtonSize
}) {
  const iconClass = cn('shrink-0', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')
  const cls = dsButtonClass(variant, size)
  if (button.kind === 'external') {
    return (
      <a href={button.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {button.label}
        <ExternalLink aria-hidden className={iconClass} />
        <span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    )
  }
  const Icon = button.kind === 'link' ? null : buttonIcon[button.kind]
  return (
    <Link href={button.href} className={cls}>
      {Icon && <Icon aria-hidden className={iconClass} />}
      {button.label}
    </Link>
  )
}

/** L'indice dei passi: marcatori da 28px uniti da una linea, il passo in lettura in brand. */
function StepsNav({ guide, activeStep }: { guide: OfferGuide; activeStep: number }) {
  return (
    <nav aria-label={GUIDE_COPY.stepsNav} className="px-1">
      <div className="ds-label mb-3 uppercase tracking-[0.04em] text-ds-ink-muted">
        {GUIDE_COPY.stepsNav}
      </div>
      <ol className="flex flex-col">
        {guide.steps.map((step, i) => {
          const n = i + 1
          const here = n === activeStep
          return (
            <li
              key={n}
              className="relative flex pb-6 before:absolute before:bottom-1 before:left-[13px] before:top-8 before:w-0.5 before:bg-ds-line before:content-[''] last:pb-0 last:before:hidden"
            >
              <a
                href={`#${stepAnchor(n)}`}
                onClick={(event) => goToStep(event, n)}
                aria-current={here ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 gap-4 rounded-ds-sm transition-colors hover:text-ds-brand',
                  dsFocusRing,
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-sm font-semibold',
                    here
                      ? 'border-ds-brand bg-ds-surface-raised text-ds-brand'
                      : 'border-transparent bg-ds-surface-sunken text-ds-ink-muted',
                  )}
                >
                  {n}
                </span>
                <span
                  className={cn(
                    'pt-0.5 text-[17px] font-semibold leading-6',
                    here && 'text-ds-brand',
                  )}
                >
                  {step.title}
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Scorre al passo (dolcemente, se l'utente non ha chiesto meno movimento) e aggiorna l'ancora. */
function goToStep(event: React.MouseEvent, n: number) {
  const el = document.getElementById(stepAnchor(n))
  if (!el) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  window.history.replaceState(null, '', `#${stepAnchor(n)}`)
}

/**
 * Il passo che si sta leggendo: l'ultimo la cui cima è salita sopra il 40 % dell'altezza della
 * finestra (0 prima del primo), come nel design.
 */
function useActiveStep(count: number): number {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (count === 0) return
    const spy = () => {
      const line = window.innerHeight * 0.4
      let current = 0
      for (let n = 1; n <= count; n++) {
        const el = document.getElementById(stepAnchor(n))
        if (el && el.getBoundingClientRect().top <= line) current = n
      }
      setActive(current)
    }
    const frame = requestAnimationFrame(spy)
    window.addEventListener('scroll', spy, { passive: true })
    window.addEventListener('resize', spy)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', spy)
      window.removeEventListener('resize', spy)
    }
  }, [count])
  return active
}
