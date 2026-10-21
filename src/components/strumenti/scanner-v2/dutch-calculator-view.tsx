'use client'

import { useMemo, useState } from 'react'
import {
  CalcImbalance,
  CalcNumberField,
  CalcOutcomeTable,
  CalcProfits,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
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
import { BookmakerLink } from './leg-chip'
import type { CalculatorDefaults } from './punta-banca-calculator-view'
import { decimalText, formatNum } from './calculator-shared'
import { MatcherCalcLayout, MatcherCategoryChoice, MatcherLegCard } from './matcher-calc-parts'
import { OmBookLogo } from './om-ds'

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
 * The Punta-Punta / Tri-Punta calculator of a dutch row, inside the full-screen
 * panel of the Oddsmatcher (design of §14.273): the stake goes on one leg (a
 * click on another card moves it), the other legs are covers
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
      decimalText(
        (exchangeFlags[i] ? grossOdds(leg.odds, commissionPercent) : leg.odds).toFixed(2),
      ),
    ),
  )
  const [puntaIndex, setPuntaIndex] = useState(0)
  const [puntata, setPuntata] = useState(defaults.stake)
  const [bonus, setBonus] = useState(defaults.bonus)
  const [rimborso, setRimborso] = useState(defaults.rimborso)
  const [commissione, setCommissione] = useState(() => decimalText(String(commissionPercent)))
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

  const puntaLeg = row.legs[puntaIndex]
  // One column per leg in «Profitti», named after the bookmaker (and the outcome when a book has two legs).
  const legLabels = row.legs.map((leg) => {
    const name = shortBookmakerName(leg.bookmakerName)
    const twice = row.legs.filter((l) => shortBookmakerName(l.bookmakerName) === name).length > 1
    return twice ? `${name} · ${outcomeName(leg)}` : name
  })
  // Each column is that leg's result: its payout less its cost when it wins, its cost when it
  // loses (the real stake on the punta leg, the bonus is not money out). Their sum, plus the
  // rimborso when a cover wins, is the engine's profit for that outcome.
  const costOf = (k: number) =>
    result.legs[k].isPunta ? (puntataNum ?? 0) : (result.legs[k].stake ?? 0)
  const profitRows: OutcomeProfitRow[] = result.showSummary
    ? row.legs.map((leg, i) => ({
        id: `leg${i}`,
        esito: `Se vince ${outcomeName(leg)} su ${shortBookmakerName(leg.bookmakerName)}`,
        legs: row.legs.map((_, k) =>
          k === i ? (result.legs[k].payout ?? 0) - costOf(k) : -costOf(k),
        ),
        rimborso: result.legs[i].isPunta ? 0 : rimborsoNum,
        totale: result.legs[i].profit,
      }))
    : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating label="Rating" value={result.rating} />

      <MatcherCalcLayout
        legs={
          <>
            <div
              role="radiogroup"
              aria-label="Gamba della puntata"
              className={cn(
                'grid gap-4',
                row.legs.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
              )}
            >
              {row.legs.map((leg, i) => {
                const isPunta = i === puntaIndex
                const legResult = result.legs[i]
                return (
                  <MatcherLegCard
                    key={`${leg.bookmakerSlug}-${leg.outcomeKey}-${i}`}
                    tone={isPunta ? 'info' : 'plain'}
                    title={outcomeName(leg)}
                    note={
                      exchangeFlags[i]
                        ? `exchange · netta ${legResult?.netOdds != null ? legResult.netOdds.toFixed(3).replace('.', ',') : '—'}`
                        : undefined
                    }
                    odds={
                      <CalcNumberField
                        id={`dutch-quota-${i}`}
                        ariaLabel={`Quota ${outcomeName(leg)} su ${shortBookmakerName(leg.bookmakerName)}`}
                        size="sm"
                        value={quotes[i]}
                        onChange={(v) => {
                          const value = sanitizeDecimal(v)
                          setQuotes((prev) => prev.map((q, j) => (j === i ? value : q)))
                        }}
                      />
                    }
                    logo={
                      <BookmakerLink leg={leg}>
                        <OmBookLogo slug={leg.bookmakerSlug} name={leg.bookmakerName} size="lg" />
                      </BookmakerLink>
                    }
                    figureLabel={isPunta ? 'Puntata' : 'Copertura'}
                    figure={amount(legResult?.stake ?? null)}
                    selectable
                    selected={isPunta}
                    onSelect={() => setPuntaIndex(i)}
                  />
                )
              })}
            </div>
            <p className="ds-body-sm m-0 text-ds-ink-muted">
              La puntata va sulla scheda evidenziata, le altre la coprono: tocca una scheda per
              spostarla.
            </p>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="dutch-puntata"
              label={`Puntata su ${outcomeName(puntaLeg)} · ${shortBookmakerName(puntaLeg.bookmakerName)}`}
              size="lg"
              suffix="€"
              value={puntata}
              onChange={(v) => setPuntata(sanitizeDecimal(v))}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="dutch-bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={(v) => setBonus(sanitizeDecimal(v))}
              />
              <CalcNumberField
                id="dutch-rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={(v) => setRimborso(sanitizeDecimal(v))}
              />
            </div>
            <CalcImbalance
              label={row.legs.length === 3 ? 'Sbilancia le coperture' : 'Sbilancia la copertura'}
              value={imbalance}
              onChange={setImbalance}
              leading={
                hasExchangeLeg ? (
                  <CalcNumberField
                    id="dutch-commissione"
                    label="Commissione"
                    suffix="%"
                    placeholder={String(commissionPercent)}
                    value={commissione}
                    onChange={(v) => setCommissione(sanitizeDecimal(v))}
                  />
                ) : undefined
              }
            />
            <MatcherCategoryChoice value={categoria} onChange={setCategoria} />
          </>
        }
      />

      <CalcProfits outlay={result.totalOutlay} minGain={result.guadagnoMinimo}>
        <CalcOutcomeTable
          legLabels={legLabels}
          rows={profitRows}
          stake={result.totalOutlay ?? 0}
          emptyText="Il risultato compare quando la puntata e tutte le quote sono compilate e valide."
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={() => setAssignOpen(true)} disabled={!result.showSummary} />

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
