'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DsModal } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { OmBookLogo } from '@/components/strumenti/scanner-v2/om-ds'
import { shortBookmakerName } from '@/lib/bookmakers'
import { getErrorMessage } from '@/lib/error-utils'
import { formatOdds } from '@/lib/landing-format'
import { formatKickoff } from '@/lib/matcher/format'
import {
  changeText,
  findingText,
  listingName,
  priceText,
  quotaText,
  readOutcomeText,
  recheckRequestOf,
  recheckVerdict,
  rowOutcomeText,
  shownFindings,
  targetBookmakerNames,
  wasRead,
  type RecheckTarget,
  type RecheckTone,
} from '@/lib/matcher/recheck'
import { recheckOdds } from '@/services/api/odds-recheck-client'
import type { RecheckBookmaker, RecheckQuota, RecheckResponse } from '@/types/odds-recheck'
import { cn } from '@/lib/utils'

/**
 * «Ricalcola» (ADAPTER_STATUS §14.390): the event of a combination read again now from its
 * bookmakers, and what the read says: a price that had moved, sides the wrong way round, or
 * prices confirmed (what the site shows differently is then the bookmaker's own, logged-in price).
 *
 * `useOddsRecheck` holds the request, `OddsRecheckDialog` shows it: any page with an event, a
 * market and some bookmakers opens it with a `RecheckTarget` (lib/matcher/recheck). The backend
 * answers admins only and counts the requests of each user.
 */

export type RecheckState =
  | { status: 'loading' }
  | { status: 'done'; result: RecheckResponse }
  | { status: 'error'; message: string; quota: RecheckQuota | null }

export interface OddsRecheck {
  /** What is being re-read; null with the dialog closed. */
  target: RecheckTarget | null
  state: RecheckState
  /** Opens the dialog and asks for the read. */
  open: (target: RecheckTarget) => void
  /** Asks again for the same target. */
  again: () => void
  close: () => void
}

function quotaOfError(e: unknown): RecheckQuota | null {
  const data = (e as { response?: { data?: { quota?: unknown } } } | null)?.response?.data
  const quota = data?.quota as RecheckQuota | undefined
  return quota && typeof quota.limit === 'number' && typeof quota.remaining === 'number'
    ? quota
    : null
}

/**
 * The request behind the dialog. It starts from the click, not from an effect: a read costs one
 * of the user's requests and must not run twice. `onRead` is called when a bookmaker was read, so
 * the page can reload its rows.
 */
export function useOddsRecheck(onRead?: () => void): OddsRecheck {
  const [target, setTarget] = useState<RecheckTarget | null>(null)
  const [state, setState] = useState<RecheckState>({ status: 'loading' })
  // Only the answer to the last request asked is shown.
  const sequence = useRef(0)
  const onReadRef = useRef(onRead)
  useEffect(() => {
    onReadRef.current = onRead
  }, [onRead])

  const open = useCallback((next: RecheckTarget) => {
    const id = ++sequence.current
    setTarget(next)
    setState({ status: 'loading' })
    recheckOdds(recheckRequestOf(next))
      .then((result) => {
        if (result.bookmakers.some(wasRead)) onReadRef.current?.()
        if (sequence.current === id) setState({ status: 'done', result })
      })
      .catch((e: unknown) => {
        if (sequence.current !== id) return
        setState({ status: 'error', message: getErrorMessage(e), quota: quotaOfError(e) })
      })
  }, [])

  const again = useCallback(() => {
    if (target) open(target)
  }, [open, target])

  const close = useCallback(() => {
    sequence.current += 1
    setTarget(null)
  }, [])

  return { target, state, open, again, close }
}

const toneIcon: Record<RecheckTone, { Icon: typeof Info; className: string }> = {
  neutral: { Icon: Info, className: 'text-ds-ink-muted' },
  info: { Icon: Info, className: 'text-ds-info' },
  profit: { Icon: CircleCheck, className: 'text-ds-profit' },
  warning: { Icon: TriangleAlert, className: 'text-ds-warning' },
  loss: { Icon: CircleAlert, className: 'text-ds-loss' },
}

const toneBox: Record<RecheckTone, string> = {
  neutral: 'bg-ds-surface-sunken',
  info: 'bg-ds-info-soft',
  profit: 'bg-ds-profit-soft',
  warning: 'bg-ds-warning-soft',
  loss: 'bg-ds-loss-soft',
}

function ToneIcon({ tone, className }: { tone: RecheckTone; className?: string }) {
  const { Icon, className: color } = toneIcon[tone]
  return <Icon className={cn('h-4 w-4 flex-none', color, className)} aria-hidden />
}

const th =
  'ds-caption px-1.5 py-1.5 text-left font-semibold whitespace-nowrap text-ds-ink-muted sm:px-2'
const td = 'border-t border-ds-line px-1.5 py-2 align-top text-sm leading-5 tabular-nums sm:px-2'

/**
 * The outcomes of the market on one bookmaker: stored before, listed now, the others, the state.
 * On the phone the state goes under the outcome's name, so the four prices fit the width.
 */
function OutcomeTable({ b, legKeys }: { b: RecheckBookmaker; legKeys: Set<string> }) {
  const read = wasRead(b)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Quote di {shortBookmakerName(b.name)} su questo mercato
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cn(th, 'pl-0')}>
              Esito
            </th>
            <th scope="col" className={th}>
              {read ? 'Prima' : 'In archivio'}
            </th>
            {read && (
              <th scope="col" className={th}>
                Letta ora
              </th>
            )}
            <th
              scope="col"
              className={th}
              title="Mediana delle quote degli altri bookmaker sullo stesso esito"
            >
              Altri book
            </th>
            {read && (
              <th scope="col" className={cn(th, 'hidden pr-0 text-right sm:table-cell')}>
                Stato
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {b.outcomes.map((o) => {
            const change = changeText(o.change, read)
            const inRow = legKeys.has(o.key)
            // What is stored after the read should be what the bookmaker lists: said when it is not.
            const storedDiffers =
              o.live != null &&
              o.after != null &&
              o.after.status === 'active' &&
              o.live.status === 'active' &&
              Math.abs(o.after.odds - o.live.odds) > 0.0005
            return (
              <tr key={o.key} className={inRow ? 'bg-ds-surface-sunken' : undefined}>
                <th
                  scope="row"
                  className={cn(
                    td,
                    'pl-2.5 text-left font-semibold text-ds-ink',
                    // The outcome the row plays: a brand bar on its left.
                    inRow && 'shadow-[inset_3px_0_0_var(--ds-brand)]',
                  )}
                  title={inRow ? 'L’esito giocato nella riga' : undefined}
                >
                  {o.label}
                  {inRow && <span className="sr-only"> (esito della riga)</span>}
                  {change && (
                    <span className="mt-1 block sm:hidden">
                      <DsBadge tone={change.tone}>{change.label}</DsBadge>
                    </span>
                  )}
                </th>
                <td className={cn(td, 'text-ds-ink-muted')}>{priceText(o.before)}</td>
                {read && (
                  <td className={cn(td, 'font-semibold text-ds-ink')}>
                    {priceText(o.live)}
                    {o.live && (
                      <span className="ds-caption block font-normal wrap-anywhere text-ds-ink-muted">
                        «{o.live.label}» in {o.live.marketName}
                      </span>
                    )}
                    {storedDiffers && o.after && (
                      <span className="ds-caption block font-normal text-ds-loss">
                        in archivio ora {priceText(o.after)}
                      </span>
                    )}
                  </td>
                )}
                <td className={cn(td, 'text-ds-ink-muted')}>
                  {o.referenceMedian != null ? formatOdds(o.referenceMedian) : '—'}
                </td>
                {read && (
                  <td className={cn(td, 'hidden pr-2 text-right sm:table-cell')}>
                    {change && <DsBadge tone={change.tone}>{change.label}</DsBadge>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BookmakerCard({ b, target }: { b: RecheckBookmaker; target: RecheckTarget }) {
  const read = readOutcomeText(b)
  const legs = target.legs?.filter((l) => l.bookmakerSlug === b.slug) ?? []
  const legKeys = new Set(legs.map((l) => l.outcomeKey))
  const eventUrl =
    legs.find((l) => l.eventUrl)?.eventUrl ??
    target.bookmakers?.find((x) => x.slug === b.slug)?.eventUrl ??
    null
  const name = shortBookmakerName(b.name)
  const listed = listingName(b)
  const findings = shownFindings(b)
  return (
    <section
      aria-label={name}
      className="overflow-hidden rounded-ds-md border border-ds-line bg-ds-surface-raised"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ds-line bg-ds-surface-sunken px-4 py-2.5">
        <OmBookLogo slug={b.slug} name={b.name} size="sm" />
        <DsBadge tone={read.tone}>{read.label}</DsBadge>
        {legs.length > 0 && (
          <span className="ds-caption text-ds-ink-muted">
            {legs.map((l) => `${l.lay ? 'Banca' : 'Punta'} ${l.outcomeName}`).join(' · ')}
          </span>
        )}
        {eventUrl && (
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'ds-caption ml-auto inline-flex items-center gap-1 rounded-ds-xs text-ds-brand hover:text-ds-brand-hover',
              dsFocusRing,
            )}
          >
            Apri su {name}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </header>
      <div className="flex flex-col gap-3 px-4 py-3">
        {read.detail && <p className="ds-body-sm m-0 text-ds-ink-muted">{read.detail}</p>}
        {listed && b.listing && (
          <p className="ds-caption m-0 text-ds-ink-muted">
            Sul bookmaker: <span className="text-ds-ink">{listed}</span> ·{' '}
            {formatKickoff(b.listing.startTime)}
            {b.listing.competitionName ? ` · ${b.listing.competitionName}` : ''}
          </p>
        )}
        {b.outcomes.length > 0 && <OutcomeTable b={b} legKeys={legKeys} />}
        {findings.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {findings.map((finding) => {
              const f = findingText(finding, b)
              return (
                <li key={finding} className="ds-body-sm flex items-start gap-2 text-ds-ink">
                  <ToneIcon tone={f.tone} className="mt-0.5" />
                  <span>{f.text}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function Result({ target, result }: { target: RecheckTarget; result: RecheckResponse }) {
  const verdict = recheckVerdict(result)
  const rowText = rowOutcomeText(target, result)
  return (
    <div className="flex flex-col gap-4">
      <div className={cn('flex items-start gap-3 rounded-ds-md px-4 py-3', toneBox[verdict.tone])}>
        <ToneIcon tone={verdict.tone} className="mt-1 h-5 w-5" />
        <div className="min-w-0">
          <p className="ds-subheading m-0 text-ds-ink">{verdict.title}</p>
          <p className="ds-body-sm m-0 mt-0.5 text-ds-ink">{verdict.text}</p>
          {rowText && (
            <p className="ds-body-sm m-0 mt-2 font-semibold text-ds-ink tabular-nums">{rowText}</p>
          )}
        </div>
      </div>
      {result.bookmakers.map((b) => (
        <BookmakerCard key={b.slug} b={b} target={target} />
      ))}
    </div>
  )
}

/** The dialog of a `useOddsRecheck`: nothing on screen until its `open` is called. */
export function OddsRecheckDialog({ recheck }: { recheck: OddsRecheck }) {
  const { target, state } = recheck
  if (!target) return null
  const loading = state.status === 'loading'
  const quota =
    state.status === 'done' ? state.result.quota : state.status === 'error' ? state.quota : null
  return (
    <DsModal
      open
      onOpenChange={(open) => {
        if (!open) recheck.close()
      }}
      title="Ricalcolo delle quote"
      description={`${target.eventName} · ${target.marketName}`}
      size="lg"
      footer={
        <>
          {quota && (
            <span className="ds-caption mr-auto self-center text-ds-ink-muted">
              {quotaText(quota)}
            </span>
          )}
          <button
            type="button"
            onClick={recheck.again}
            disabled={loading || quota?.remaining === 0}
            className={cn(
              dsButtonClass('secondary', 'md'),
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Rileggi
          </button>
          <button type="button" onClick={recheck.close} className={dsButtonClass('primary', 'md')}>
            Chiudi
          </button>
        </>
      }
    >
      {state.status === 'loading' && (
        <div role="status" className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 flex-none animate-spin text-ds-brand" aria-hidden />
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            Rilettura dell’evento da {targetBookmakerNames(target)} in corso. Di solito bastano
            pochi secondi; se un bookmaker è occupato può volerci fino a un minuto.
          </p>
        </div>
      )}
      {state.status === 'error' && (
        <div
          role="alert"
          className={cn('flex items-start gap-3 rounded-ds-md px-4 py-3', toneBox.loss)}
        >
          <ToneIcon tone="loss" className="mt-0.5 h-5 w-5" />
          <p className="ds-body-sm m-0 text-ds-ink">{state.message}</p>
        </div>
      )}
      {state.status === 'done' && <Result target={target} result={state.result} />}
    </DsModal>
  )
}
