'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { grossOdds, parseNum } from '@/lib/calculators/engines/odds'
import { buildDutchBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import { legIsExchange, shortBookmakerName } from '@/lib/bookmakers'
import { outcomeName } from '@/lib/matcher/format'
import type { BetCategory } from '@/types/profit-tracker'
import type { MatcherMeta, MatcherResult } from '@/types/matcher'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { AssignAccountsModal, type AssignLeg } from './assign-accounts-modal'
import { BookmakerBadge } from './bookmaker-badge'
import { BookmakerLink } from './leg-chip'
import type { CalculatorDefaults } from './punta-banca-calculator-view'
import {
  DecimalField,
  ImbalanceSlider,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from './calculator-shared'

interface DutchCalculatorViewProps {
  row: MatcherResult
  meta: MatcherMeta | null
  event: BetEventInfo
  defaults: CalculatorDefaults
  /** Exchange commission in percent (4.5). */
  commissionPercent: number
  onClose: () => void
}

/**
 * The Punta-Punta / Tri-Punta calculator of a dutch row: the stake goes on one
 * leg (click «Puntata qui» on another to move it), the other legs are covers
 * for the same profit whichever outcome wins. Exchange legs are shown at their
 * gross price and priced net of the commission underneath, like the matcher.
 */
export function DutchCalculatorView({
  row,
  meta,
  event,
  defaults,
  commissionPercent,
  onClose,
}: DutchCalculatorViewProps) {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const exchangeFlags = useMemo(
    () => row.legs.map((leg) => legIsExchange(leg, meta)),
    [row.legs, meta],
  )
  const hasExchangeLeg = exchangeFlags.some(Boolean)

  const [quotes, setQuotes] = useState<string[]>(() =>
    row.legs.map((leg, i) =>
      (exchangeFlags[i] ? grossOdds(leg.odds, commissionPercent) : leg.odds).toFixed(2),
    ),
  )
  const [puntaIndex, setPuntaIndex] = useState(0)
  const [puntata, setPuntata] = useState(defaults.stake)
  const [bonus, setBonus] = useState(defaults.bonus)
  const [rimborso, setRimborso] = useState(defaults.rimborso)
  const [commissione, setCommissione] = useState(() => String(commissionPercent))
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
  const commissioneNum = parseNum(commissione) ?? 0
  const quoteNums = quotes.map(parseNum)
  // The memos below key on the joined quotes: the array is rebuilt on every render.
  const quotesKey = quotes.join('|')

  const result = useMemo(
    () =>
      computeDutch({
        legs: quoteNums.map((q, i) => ({
          grossOdds: q,
          commissionPercent: exchangeFlags[i] ? commissioneNum : 0,
        })),
        puntaIndex,
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        imbalancePercent: imbalance,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      quotesKey,
      exchangeFlags,
      commissioneNum,
      puntaIndex,
      puntataNum,
      bonusNum,
      rimborsoNum,
      imbalance,
    ],
  )

  const tones = ['primary', 'sky', 'sky'] as const
  const assignLegs: AssignLeg[] = useMemo(
    () =>
      row.legs.map((leg, i) => {
        const isPunta = i === puntaIndex
        const legResult = result.legs[i]
        return {
          key: `leg${i}`,
          title: isPunta ? 'Collaboratore Punta' : `Collaboratore copertura ${outcomeName(leg)}`,
          detail: `${outcomeName(leg)} @ ${formatNum(quoteNums[i])} · ${formatNum(legResult?.stake ?? null)} €`,
          bookmaker: {
            slug: leg.bookmakerSlug,
            name: leg.bookmakerName,
            isExchange: exchangeFlags[i],
          },
          tone: isPunta ? 'primary' : 'sky',
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [row.legs, puntaIndex, result, exchangeFlags, quotesKey],
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
        legs: row.legs.map((leg, i) => ({
          selezione: outcomeName(leg),
          quotaGross: quoteNums[i] as number,
          commissionePercent: exchangeFlags[i] ? commissioneNum : 0,
          accountId: accountIds[`leg${i}`],
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

  const columns = row.legs.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'

  return (
    <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
      {/* Legs */}
      <div className={cn('grid gap-3 sm:gap-4', columns)}>
        {row.legs.map((leg, i) => {
          const isPunta = i === puntaIndex
          const legResult = result.legs[i]
          const tone = isPunta ? tones[0] : tones[1]
          return (
            <div
              key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}
              className={cn(
                'rounded-xl border p-3 sm:p-4',
                tone === 'primary'
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-sky-500/20 bg-sky-500/5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[11px] font-medium uppercase tracking-wide',
                      tone === 'primary' ? 'text-primary' : 'text-sky-300',
                    )}
                  >
                    {isPunta ? 'Puntata' : 'Copertura'} · {outcomeName(leg)}
                  </p>
                  {exchangeFlags[i] && (
                    <p className="text-[10px] text-muted-foreground">
                      exchange · netta{' '}
                      {legResult?.netOdds != null ? legResult.netOdds.toFixed(3) : '—'}
                    </p>
                  )}
                </div>
                <BookmakerLink leg={leg}>
                  <BookmakerBadge slug={leg.bookmakerSlug} name={leg.bookmakerName} size="md" />
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
                aria-label={`Quota ${outcomeName(leg)} su ${shortBookmakerName(leg.bookmakerName)}`}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Puntata qui
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Importi e risultati */}
      <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Importi e risultati
        </p>
        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:gap-4',
            hasExchangeLeg ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
          )}
        >
          <DecimalField
            id="dutch-puntata"
            label="Puntata €"
            value={puntata}
            onChange={setPuntata}
          />
          <DecimalField id="dutch-bonus" label="Bonus € (opz.)" value={bonus} onChange={setBonus} />
          <DecimalField
            id="dutch-rimborso"
            label="Rimborso € (opz.)"
            value={rimborso}
            onChange={setRimborso}
          />
          {hasExchangeLeg && (
            <DecimalField
              id="dutch-commissione"
              label="Comm. exchange %"
              value={commissione}
              onChange={setCommissione}
              placeholder={String(commissionPercent)}
            />
          )}
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

      {/* Profitti per esito */}
      {result.showSummary && (
        <div className="rounded-xl border border-border">
          <div className="bg-muted/30 px-4 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                {row.legs.map((leg, i) => {
                  const legResult = result.legs[i]
                  return (
                    <tr
                      key={`profit-${i}`}
                      className={cn(
                        'border-b border-border/50',
                        legResult.isPunta ? 'bg-primary/5' : 'bg-sky-500/5',
                      )}
                    >
                      <td className="px-4 py-2.5 text-muted-foreground">
                        vince{' '}
                        <span className="font-medium text-foreground">{outcomeName(leg)}</span> su{' '}
                        {shortBookmakerName(leg.bookmakerName)}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
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
          La giocata viene salvata come bozza: una gamba per ogni puntata, con la commissione sulle
          gambe exchange.
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
