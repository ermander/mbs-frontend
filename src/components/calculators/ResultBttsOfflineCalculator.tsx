'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DecimalField,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from '@/components/strumenti/scanner-v2/calculator-shared'
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

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <p className="text-xs text-muted-foreground">
        Mercato <span className="font-medium text-foreground">{RESULT_BTTS_MARKET_LABEL}</span>{' '}
        dentro lo stesso bookmaker: inserisci le quote dei cinque esiti coperti. Lo 0-0 (
        {RESULT_BTTS_ZERO_ZERO_LABEL}) resta scoperto e il bookmaker rimborsa le puntate.
      </p>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {RESULT_BTTS_COVERED_OUTCOMES.map((outcome, i) => {
          const isPunta = i === puntaIndex
          const legResult = result.legs[i]
          return (
            <div
              key={outcome.outcomeKey}
              className={cn(
                'flex flex-col items-center rounded-lg border p-3 text-center',
                isPunta ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                {isPunta ? 'Puntata' : 'Copertura'}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{outcome.label}</p>
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
                aria-label={`Quota ${outcome.label}`}
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

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end gap-4">
          <DecimalField
            id="rbo-calc-puntata"
            label="Puntata €"
            value={puntata}
            onChange={setPuntata}
            className="w-32"
          />
          <DecimalField
            id="rbo-calc-zero-zero"
            label={`Quota ${RESULT_BTTS_ZERO_ZERO_LABEL} (0-0), facoltativa`}
            value={zeroZero}
            onChange={setZeroZero}
            className="w-56"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 sm:grid-cols-4">
          <ResultStat
            label="Esborso totale"
            value={result.totalOutlay != null ? `€${formatNum(result.totalOutlay)}` : '—'}
          />
          <ResultStat label="Coperture" value={formatNum(coversTotal || null)} />
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
              {RESULT_BTTS_COVERED_OUTCOMES.map((outcome, i) => {
                const legResult = result.legs[i]
                return (
                  <tr
                    key={`profit-${outcome.outcomeKey}`}
                    className={cn('border-b border-border/50', legResult.isPunta && 'bg-primary/5')}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      vince <span className="font-medium text-foreground">{outcome.label}</span>
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
                <td className="whitespace-normal px-4 py-2.5 text-muted-foreground">
                  finisce <span className="font-medium text-foreground">0-0</span> (
                  {RESULT_BTTS_ZERO_ZERO_LABEL}
                  {zeroZeroNum != null ? ` a ${formatNum(zeroZeroNum)}` : ''}): non coperto, il
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
        onClick={() => {
          setSaveTick((tick) => tick + 1)
          setSaveOpen(true)
        }}
        disabled={saveLegs == null}
      >
        Invia scommessa al Profit Tracker
      </Button>

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
