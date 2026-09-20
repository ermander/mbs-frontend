'use client'

import { useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import {
  AssignAccountsModal,
  type AssignLeg,
} from '@/components/strumenti/scanner-v2/assign-accounts-modal'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import {
  DecimalField,
  ImbalanceSlider,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from '@/components/strumenti/scanner-v2/calculator-shared'
import type { CalculatorDefaults } from '@/components/strumenti/scanner-v2/punta-banca-calculator-view'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildDutchBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import { shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { formatKickoffLong } from '@/lib/matcher/format'
import {
  RESULT_BTTS_EXCLUDED,
  RESULT_BTTS_OUTCOME_LABELS,
  resultBttsLegs,
  resultBttsRowKey,
} from '@/lib/result-btts'
import type { BetCategory } from '@/types/profit-tracker'
import type { ResultBttsRow } from '@/types/result-btts'
import { cn, sanitizeDecimal } from '@/lib/utils'

/** The market as the Profit Tracker payloads name it. */
export const RESULT_BTTS_MERCATO = '1X2 + GG/NG'

/** The event of a row as the Profit Tracker payloads describe it. */
export function resultBttsEventInfo(row: ResultBttsRow): BetEventInfo {
  return {
    eventoDataIso: new Date(row.startTime).toISOString(),
    eventoNome: `${row.homeName ?? '?'} vs ${row.awayName ?? '?'}`,
    competizione: row.competitionName,
    sport: sportDisplay(row.sportName).ptSport,
    mercato: RESULT_BTTS_MERCATO,
  }
}

interface ResultBttsCalculatorModalProps {
  row: ResultBttsRow | null
  defaults: CalculatorDefaults
  onClose: () => void
}

/**
 * The calculator of a row of «Risultato + Goal»: a dutch over the five
 * compared outcomes on one bookmaker (the stake on one, the others covers
 * for the same profit whichever wins). «X & NG», the 0-0, is not covered:
 * its row in the profits shows what that costs. The view is keyed by the
 * row, so it mounts fresh with the row's prices and the shared amounts.
 */
export function ResultBttsCalculatorModal({
  row,
  defaults,
  onClose,
}: ResultBttsCalculatorModalProps) {
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
            <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:gap-x-3 sm:text-sm">
                <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                  {row.competitionName}
                </span>
                <span className="font-medium text-foreground">
                  {row.homeName} <span className="text-muted-foreground">vs</span> {row.awayName}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatKickoffLong(row.startTime)}
                </span>
                <span className="text-muted-foreground">
                  {RESULT_BTTS_MERCATO} · {shortBookmakerName(row.bookmakerName)} · rating{' '}
                  {row.rating.toFixed(2)}%
                </span>
              </div>
            </div>
            <ResultBttsCalculatorView
              key={resultBttsRowKey(row)}
              row={row}
              event={event}
              defaults={defaults}
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
  defaults: CalculatorDefaults
  onClose: () => void
}

export function ResultBttsCalculatorView({
  row,
  event,
  defaults,
  onClose,
}: ResultBttsCalculatorViewProps) {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const legs = useMemo(() => resultBttsLegs(row), [row])
  const excludedOdds = row.prices[RESULT_BTTS_EXCLUDED]?.odds ?? null

  const [quotes, setQuotes] = useState<string[]>(() => legs.map((leg) => leg.odds.toFixed(2)))
  const [puntaIndex, setPuntaIndex] = useState(0)
  const [puntata, setPuntata] = useState(defaults.stake)
  const [bonus, setBonus] = useState(defaults.bonus)
  const [rimborso, setRimborso] = useState(defaults.rimborso)
  const [imbalance, setImbalance] = useState(0)
  const [categoria, setCategoria] = useState<BetCategory>(() =>
    row.rating >= 100 ? 'surebet' : 'matched_betting',
  )

  const [assignOpen, setAssignOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const quoteNums = quotes.map(parseNum)
  // The memo keys on the joined quotes: the array is rebuilt on every render.
  const quotesKey = quotes.join('|')

  const result = useMemo(
    () =>
      computeDutch({
        legs: quoteNums.map((q) => ({ grossOdds: q, commissionPercent: 0 })),
        puntaIndex,
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        imbalancePercent: imbalance,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotesKey, puntaIndex, puntataNum, bonusNum, rimborsoNum, imbalance],
  )

  // One bookmaker for every leg: one account, the same on all of them.
  const assignLegs: AssignLeg[] = useMemo(
    () => [
      {
        key: 'book',
        title: 'Collaboratore (tutte le gambe)',
        detail: `${legs.length} gambe su ${shortBookmakerName(row.bookmakerName)} · ${formatNum(result.totalOutlay)} €`,
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
        categoria,
        puntaIndex,
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
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

  // The 0-0 is not covered: every stake is lost, the rimborso (cashed when the punta loses) comes back.
  const zeroZeroProfit = result.totalOutlay != null ? -result.totalOutlay + rimborsoNum : null

  return (
    <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {legs.map((leg, i) => {
          const isPunta = i === puntaIndex
          const legResult = result.legs[i]
          return (
            <div
              key={leg.key}
              className={cn(
                'rounded-xl border p-3 sm:p-4',
                isPunta ? 'border-border bg-muted/40' : 'border-sky-500/20 bg-sky-500/5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'font-mono text-[11px] font-medium uppercase tracking-[0.02em]',
                    isPunta ? 'text-primary' : 'text-sky-400',
                  )}
                >
                  {isPunta ? 'Puntata' : 'Copertura'} · {leg.label}
                </p>
                <BookmakerLink leg={row}>
                  <BookmakerBadge slug={row.bookmakerSlug} name={row.bookmakerName} />
                </BookmakerLink>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={quotes[i]}
                onChange={(e) => {
                  const value = sanitizeDecimal(e.target.value)
                  setQuotes((prev) => prev.map((q, j) => (j === i ? value : q)))
                }}
                className="mt-2 h-9 text-base font-semibold sm:h-10 sm:text-lg"
                aria-label={`Quota ${leg.label}`}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.02em] text-muted-foreground">
                    {isPunta ? 'Puntata' : 'Puntata copertura'}
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatNum(legResult?.stake ?? null)} €
                  </p>
                </div>
                {!isPunta && (
                  <button
                    type="button"
                    onClick={() => setPuntaIndex(i)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-primary"
                  >
                    Puntata qui
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
        <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.02em] text-muted-foreground">
          Importi e risultati
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <DecimalField
            id="rb-calc-puntata"
            label="Puntata €"
            value={puntata}
            onChange={setPuntata}
          />
          <DecimalField
            id="rb-calc-bonus"
            label="Bonus € (opz.)"
            value={bonus}
            onChange={setBonus}
          />
          <DecimalField
            id="rb-calc-rimborso"
            label="Rimborso € (opz.)"
            value={rimborso}
            onChange={setRimborso}
          />
        </div>
        <ImbalanceSlider
          value={imbalance}
          onChange={setImbalance}
          min={-30}
          max={30}
          step={1}
          label="Sbilanciamento coperture"
        />
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-2.5 sm:grid-cols-4">
          <ResultStat
            label="Esborso totale"
            value={result.totalOutlay != null ? `€${formatNum(result.totalOutlay)}` : '—'}
          />
          <ResultStat
            label="Coperture"
            value={formatNum(
              result.legs.filter((l) => !l.isPunta).reduce((s, l) => s + (l.stake ?? 0), 0) || null,
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

      {result.showSummary && (
        <div className="rounded-xl border border-border">
          <div className="bg-muted/30 px-4 py-2">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
              Profitti
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2.5 text-left">Esito</th>
                  <th className="px-4 py-2.5 text-right">Incasso</th>
                  <th className="px-4 py-2.5 text-right">Esborso</th>
                  {rimborsoNum > 0 && <th className="px-4 py-2.5 text-right">Rimborso</th>}
                  <th className="px-4 py-2.5 text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => {
                  const legResult = result.legs[i]
                  return (
                    <tr
                      key={`profit-${leg.key}`}
                      className={cn(
                        'border-b border-border/50',
                        legResult.isPunta ? 'bg-muted/40' : 'bg-sky-500/5',
                      )}
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
                      {rimborsoNum > 0 && (
                        <td className="px-4 py-2.5 text-right font-medium text-primary">
                          {legResult.isPunta ? '—' : formatSigned(rimborsoNum)}
                        </td>
                      )}
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
                    finisce{' '}
                    <span className="font-medium text-foreground">
                      {RESULT_BTTS_OUTCOME_LABELS[RESULT_BTTS_EXCLUDED]}
                    </span>{' '}
                    (0-0)
                    {excludedOdds != null && (
                      <span className="ml-1 text-xs">
                        quotato {excludedOdds.toFixed(2)}, non coperto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    +0.00
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-destructive">
                    {formatSigned(result.totalOutlay != null ? -result.totalOutlay : null)}
                  </td>
                  {rimborsoNum > 0 && (
                    <td className="px-4 py-2.5 text-right font-medium text-primary">
                      {formatSigned(rimborsoNum)}
                    </td>
                  )}
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold',
                      profitClass(zeroZeroProfit),
                    )}
                  >
                    {formatSigned(zeroZeroProfit)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <BetCategorySelect value={categoria} onChange={setCategoria} />
        <Button
          variant="success"
          className="w-full"
          onClick={() => setAssignOpen(true)}
          disabled={!result.showSummary}
        >
          Invia scommessa al Profit Tracker
        </Button>
        <p className="text-[11px] text-muted-foreground">
          La giocata viene salvata come bozza: una gamba per ogni esito coperto, tutte sullo stesso
          conto del bookmaker.
        </p>
      </div>

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
