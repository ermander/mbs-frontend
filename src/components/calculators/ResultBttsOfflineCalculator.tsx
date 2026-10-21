'use client'

import { useMemo, useState } from 'react'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import {
  CalcLayout,
  CalcNumberField,
  CalcOutcomeTable,
  CalcProfits,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import {
  ResultBttsOfflineSaveModal,
  type ResultBttsOfflineLeg,
} from '@/components/calculators/ResultBttsOfflineSaveModal'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import {
  RESULT_BTTS_COVERED_OUTCOMES,
  RESULT_BTTS_MARKET_LABEL,
  RESULT_BTTS_ZERO_ZERO_LABEL,
} from '@/lib/result-btts'
import { formatOdds } from '@/lib/landing-format'
import { cn, sanitizeDecimal } from '@/lib/utils'

/**
 * The offline «Risultato + Goal» calculator (§14.220), admin only. The five
 * covered legs of 1X2 + GG/NG priced by hand and the same dutch as the
 * calculator of the page (§14.177): the stake on one leg, the others covers
 * for the same profit whichever wins; the 0-0 («X & NG») is not covered, the
 * bookmaker refunds the stakes, its price is typed only for the record. The
 * bet goes to the Profit Tracker as a surebet on one account.
 */
export function ResultBttsOfflineCalculator() {
  const [quotes, setQuotes] = useState<string[]>(() => RESULT_BTTS_COVERED_OUTCOMES.map(() => ''))
  const [zeroZero, setZeroZero] = useState('')
  const [puntaIndex, setPuntaIndex] = useState(0)
  const [puntata, setPuntata] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  // The save modal mounts fresh at every opening (its key), so its fields start clean.
  const [saveTick, setSaveTick] = useState(0)

  const puntataNum = parseNum(puntata)
  const quoteNums = quotes.map(parseNum)
  const zeroZeroNum = parseNum(zeroZero)
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

  const coversTotal = result.legs
    .filter((leg) => !leg.isPunta)
    .reduce((sum, leg) => sum + (leg.stake ?? 0), 0)

  // The legs of the bet: only when every price and every stake is there.
  const saveLegs: ResultBttsOfflineLeg[] | null = result.showSummary
    ? RESULT_BTTS_COVERED_OUTCOMES.map((outcome, i) => ({
        label: outcome.label,
        odds: quoteNums[i] as number,
        stake: result.legs[i].stake as number,
      }))
    : null

  const profitRows: OutcomeProfitRow[] = result.showSummary
    ? [
        ...RESULT_BTTS_COVERED_OUTCOMES.map((outcome, i) => ({
          id: outcome.outcomeKey,
          esito: `${i === puntaIndex ? 'Se vince la puntata · ' : 'Se vince '}${outcome.label}`,
          legs: [result.legs[i].payout, result.totalOutlay != null ? -result.totalOutlay : null],
          rimborso: 0,
          totale: result.legs[i].profit,
        })),
        {
          id: 'zero-zero',
          esito: `Se finisce 0-0 (${RESULT_BTTS_ZERO_ZERO_LABEL}${
            zeroZeroNum != null ? ` a ${formatOdds(zeroZeroNum)}` : ''
          }) · non coperto, rimborso`,
          legs: [null, result.totalOutlay != null ? -result.totalOutlay : null],
          rimborso: result.totalOutlay ?? 0,
          totale: 0,
        },
      ]
    : []

  const pick = (i: number) => setPuntaIndex(i)

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating label="Rating" value={result.showSummary ? result.rating : null} />

      <CalcLayout
        outcomes={
          <>
            <div
              role="radiogroup"
              aria-label="Esito su cui puntare"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              {RESULT_BTTS_COVERED_OUTCOMES.map((outcome, i) => {
                const isPunta = i === puntaIndex
                return (
                  <div
                    key={outcome.outcomeKey}
                    role="radio"
                    aria-checked={isPunta}
                    aria-label={`Punta su ${outcome.label}`}
                    tabIndex={0}
                    onClick={() => pick(i)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        pick(i)
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-ds-md border p-4 text-center transition-[border-color,box-shadow] duration-150 hover:shadow-ds-md focus-visible:shadow-ds-focus focus-visible:outline-none',
                      isPunta
                        ? 'border-ds-brand bg-ds-info-soft'
                        : 'border-ds-line bg-ds-surface-raised',
                    )}
                  >
                    <span className="ds-label uppercase text-ds-ink-muted">
                      {isPunta ? 'Puntata' : 'Copertura'}
                    </span>
                    <span className="ds-subheading">{outcome.label}</span>
                    <div className="w-24" onClick={(e) => e.stopPropagation()}>
                      <CalcNumberField
                        id={`rbo-quota-${i}`}
                        ariaLabel={`Quota ${outcome.label}`}
                        size="sm"
                        value={quotes[i]}
                        onChange={(v) => {
                          const value = sanitizeDecimal(v)
                          setQuotes((prev) => prev.map((q, j) => (j === i ? value : q)))
                        }}
                      />
                    </div>
                    <div className="mt-auto">
                      <div className="ds-caption text-ds-ink-muted">
                        {isPunta ? 'Puntata' : 'Copertura'}
                      </div>
                      <div aria-live="polite" className="ds-num whitespace-nowrap">
                        {amount(result.legs[i]?.stake ?? null)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="ds-body-sm m-0 text-ds-ink-muted">
              Mercato <b className="font-semibold text-ds-ink">{RESULT_BTTS_MARKET_LABEL}</b> dentro
              lo stesso bookmaker: le quote dei cinque esiti coperti, la puntata sull&apos;esito
              scelto e le coperture sugli altri. Lo 0-0 ({RESULT_BTTS_ZERO_ZERO_LABEL}) resta
              scoperto e il bookmaker rimborsa le puntate.
            </p>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="rbo-calc-puntata"
              label="Puntata"
              size="lg"
              suffix="€"
              value={puntata}
              onChange={(v) => setPuntata(sanitizeDecimal(v))}
            />
            <CalcNumberField
              id="rbo-calc-zero-zero"
              label={`Quota ${RESULT_BTTS_ZERO_ZERO_LABEL} (0-0)`}
              hint="Facoltativa, solo per ricordarla: lo 0-0 non si copre."
              value={zeroZero}
              onChange={(v) => setZeroZero(sanitizeDecimal(v))}
            />
            <div className="grid grid-cols-2 gap-3 border-t border-ds-line pt-4">
              <div>
                <div className="ds-caption text-ds-ink-muted">Esborso totale</div>
                <div aria-live="polite" className="ds-num-xl">
                  {amount(result.totalOutlay)}
                </div>
              </div>
              <div>
                <div className="ds-caption text-ds-ink-muted">Coperture</div>
                <div aria-live="polite" className="ds-num-xl">
                  {amount(coversTotal || null)}
                </div>
              </div>
            </div>
          </>
        }
      />

      <CalcProfits outlay={result.totalOutlay} minGain={result.guadagnoMinimo}>
        <CalcOutcomeTable
          legLabels={['Incasso', 'Esborso']}
          rows={profitRows}
          stake={puntataNum ?? 0}
          emptyText="Il risultato compare quando la puntata e le cinque quote sono compilate e valide."
        />
      </CalcProfits>

      <CalculatorSaveAction
        onClick={() => {
          setSaveTick((tick) => tick + 1)
          setSaveOpen(true)
        }}
        disabled={saveLegs == null}
      />

      {saveLegs && puntataNum != null && (
        <ResultBttsOfflineSaveModal
          key={saveTick}
          open={saveOpen}
          onOpenChange={setSaveOpen}
          legs={saveLegs}
          puntaIndex={puntaIndex}
          puntata={puntataNum}
          totalOutlay={result.totalOutlay ?? 0}
          guadagnoMinimo={result.guadagnoMinimo ?? 0}
        />
      )}
    </div>
  )
}
