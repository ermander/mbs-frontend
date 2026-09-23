'use client'

import { useMemo, useState } from 'react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AssignAccountsModal,
  type AssignLeg,
} from '@/components/strumenti/scanner-v2/assign-accounts-modal'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import {
  DecimalField,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from '@/components/strumenti/scanner-v2/calculator-shared'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildDutchBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import { sportDisplay } from '@/lib/bookmakers'
import { formatKickoffLong } from '@/lib/matcher/format'
import {
  RESULT_BTTS_MARKET_LABEL,
  RESULT_BTTS_ZERO_ZERO_LABEL,
  resultBttsLegs,
  resultBttsRowKey,
} from '@/lib/result-btts'
import type { ResultBttsRow } from '@/types/result-btts'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { ratingBadge } from './result-btts-table'

/** The event of a row as the Profit Tracker payloads describe it. */
export function resultBttsEventInfo(row: ResultBttsRow): BetEventInfo {
  return {
    eventoDataIso: new Date(row.startTime).toISOString(),
    eventoNome: `${row.homeName ?? '?'} vs ${row.awayName ?? '?'}`,
    competizione: row.competitionName,
    sport: sportDisplay(row.sportName).ptSport,
    mercato: RESULT_BTTS_MARKET_LABEL,
  }
}

interface ResultBttsCalculatorModalProps {
  row: ResultBttsRow | null
  onClose: () => void
}

/**
 * The calculator of a row of «Risultato + Goal» (§14.177): a plain dutch over
 * the five legs on one bookmaker, the stake on one and the others covers for
 * the same profit whichever wins. The 0-0 («X & NG») is not covered: the
 * bookmaker refunds the stakes. The bet goes to the Profit Tracker as a
 * surebet. The view is keyed by the row, so it mounts fresh with its prices.
 */
export function ResultBttsCalculatorModal({ row, onClose }: ResultBttsCalculatorModalProps) {
  const event = useMemo(() => (row ? resultBttsEventInfo(row) : null), [row])
  return (
    <Dialog open={row != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[100dvh] max-w-4xl overflow-y-auto overflow-x-hidden p-0 sm:max-h-[90vh]"
        showClose={true}
      >
        <DialogTitle asChild>
          <VisuallyHidden>Calcolatore Risultato + Goal</VisuallyHidden>
        </DialogTitle>
        {row && event && (
          <div className="flex min-w-0 flex-col overflow-hidden">
            <header className="border-b border-border px-5 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                {row.competitionName} · {formatKickoffLong(row.startTime)}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {row.homeName} <span className="font-normal text-muted-foreground">vs</span>{' '}
                {row.awayName}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                  {RESULT_BTTS_MARKET_LABEL}
                </span>
                <BookmakerLink leg={row}>
                  <BookmakerBadge slug={row.bookmakerSlug} name={row.bookmakerName} size="md" />
                </BookmakerLink>
                <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
              </div>
            </header>
            <ResultBttsCalculatorView
              key={resultBttsRowKey(row)}
              row={row}
              event={event}
              onClose={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ResultBttsCalculatorViewProps {
  row: ResultBttsRow
  event: BetEventInfo
  onClose: () => void
}

export function ResultBttsCalculatorView({ row, event, onClose }: ResultBttsCalculatorViewProps) {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const legs = useMemo(() => resultBttsLegs(row), [row])
  const zeroZeroOdds = row.zeroZero?.odds ?? null

  const [quotes, setQuotes] = useState<string[]>(() => legs.map((leg) => leg.odds.toFixed(2)))
  const [puntaIndex, setPuntaIndex] = useState(0)
  const [puntata, setPuntata] = useState('')

  const [assignOpen, setAssignOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)

  const puntataNum = parseNum(puntata)
  const quoteNums = quotes.map(parseNum)
  // The memo keys on the joined quotes: the array is rebuilt on every render.
  const quotesKey = quotes.join('|')

  const result = useMemo(
    () =>
      computeDutch({
        legs: quoteNums.map((q) => ({ grossOdds: q, commissionPercent: 0 })),
        puntaIndex,
        puntata: puntataNum,
        bonus: 0,
        rimborso: 0,
        imbalancePercent: 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotesKey, puntaIndex, puntataNum],
  )

  // One bookmaker for every leg: one account, the same on all of them.
  const assignLegs: AssignLeg[] = useMemo(
    () => [
      {
        key: 'book',
        title: 'Collaboratore (tutte le gambe)',
        detail: `${legs.length} gambe su ${row.bookmakerName} · ${formatNum(result.totalOutlay)} €`,
        bookmaker: { slug: row.bookmakerSlug, name: row.bookmakerName, isExchange: false },
        tone: 'primary',
      },
    ],
    [legs.length, row.bookmakerName, row.bookmakerSlug, result.totalOutlay],
  )

  const handleConfirm = async (accountIds: Record<string, string>) => {
    if (!result.showSummary || puntataNum == null) return
    if (quoteNums.some((q) => q == null)) return
    setSaving(true)
    setSaveError(null)
    try {
      const { betPayload, legsPayload } = buildDutchBet({
        event,
        categoria: 'surebet',
        puntaIndex,
        puntata: puntataNum,
        bonus: 0,
        rimborso: 0,
        legs: legs.map((leg, i) => ({
          selezione: leg.label,
          quotaGross: quoteNums[i] as number,
          commissionePercent: 0,
          accountId: accountIds.book,
          stake: result.legs[i].stake as number,
        })),
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {legs.map((leg, i) => {
          const isPunta = i === puntaIndex
          const legResult = result.legs[i]
          return (
            <div
              key={leg.outcomeKey}
              className={cn(
                'flex flex-col items-center rounded-lg border p-3 text-center',
                isPunta ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                {isPunta ? 'Puntata' : 'Copertura'}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{leg.label}</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={quotes[i]}
                onChange={(e) => {
                  const value = sanitizeDecimal(e.target.value)
                  setQuotes((prev) => prev.map((q, j) => (j === i ? value : q)))
                }}
                className="mt-3 h-9 w-full text-center font-mono text-base font-semibold"
                aria-label={`Quota ${leg.label}`}
              />
              <p className="mt-3 font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNum(legResult?.stake ?? null)} €
              </p>
              {isPunta ? (
                <p className="mt-1 text-[11px] text-muted-foreground">puntata</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setPuntaIndex(i)}
                  className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  Puntata qui
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end gap-4">
          <DecimalField
            id="rb-calc-puntata"
            label="Puntata €"
            value={puntata}
            onChange={setPuntata}
            className="w-32"
          />
          <div className="grid flex-1 grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 sm:grid-cols-4">
            <ResultStat
              label="Esborso totale"
              value={result.totalOutlay != null ? `€${formatNum(result.totalOutlay)}` : '—'}
            />
            <ResultStat
              label="Coperture"
              value={formatNum(
                result.legs.filter((l) => !l.isPunta).reduce((s, l) => s + (l.stake ?? 0), 0) ||
                  null,
              )}
            />
            <ResultStat
              label="Guadagno min"
              value={result.guadagnoMinimo != null ? `€${formatNum(result.guadagnoMinimo)}` : '—'}
              className={profitClass(result.guadagnoMinimo)}
            />
            <ResultStat
              label="Rating"
              value={result.rating != null ? `${formatNum(result.rating)}%` : '—'}
            />
          </div>
        </div>
      </div>

      {result.showSummary && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Esito</th>
                <th className="px-4 py-2.5 text-right">Incasso</th>
                <th className="px-4 py-2.5 text-right">Esborso</th>
                <th className="px-4 py-2.5 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const legResult = result.legs[i]
                return (
                  <tr
                    key={`profit-${leg.outcomeKey}`}
                    className={cn('border-b border-border/50', legResult.isPunta && 'bg-primary/5')}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      vince <span className="font-medium text-foreground">{leg.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-primary">
                      {formatSigned(legResult.payout)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-destructive">
                      {formatSigned(result.totalOutlay != null ? -result.totalOutlay : null)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2.5 text-right font-semibold',
                        profitClass(legResult.profit),
                      )}
                    >
                      {formatSigned(legResult.profit)} €
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground">
                  finisce <span className="font-medium text-foreground">0-0</span> (
                  {RESULT_BTTS_ZERO_ZERO_LABEL}
                  {zeroZeroOdds != null ? ` a ${zeroZeroOdds.toFixed(2)}` : ''}): non coperto, il
                  bookmaker rimborsa le puntate
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-muted-foreground">—</td>
                <td className="px-4 py-2.5 text-right font-medium text-destructive">
                  {formatSigned(result.totalOutlay != null ? -result.totalOutlay : null)}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                  rimborso
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Button
        variant="success"
        className="w-full"
        onClick={() => setAssignOpen(true)}
        disabled={!result.showSummary}
      >
        Invia scommessa al Profit Tracker
      </Button>

      <AssignAccountsModal
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open)
          if (!open) setSaveError(null)
        }}
        legs={assignLegs}
        onConfirm={(ids) => void handleConfirm(ids)}
        saving={saving}
        error={saveError}
        savedBetId={savedBetId}
        onDone={() => {
          setAssignOpen(false)
          onClose()
        }}
      />
    </div>
  )
}
