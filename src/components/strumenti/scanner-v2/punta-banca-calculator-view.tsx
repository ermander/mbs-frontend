'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computePuntaBanca } from '@/lib/calculators/engines/punta-banca-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildPuntaBancaBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import { outcomeName } from '@/lib/matcher/format'
import { shortBookmakerName } from '@/lib/bookmakers'
import type { BetCategory } from '@/types/profit-tracker'
import type { MatcherResult } from '@/types/matcher'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { AssignAccountsModal, type AssignLeg } from './assign-accounts-modal'
import { BookmakerBadge } from './bookmaker-badge'
import { BookmakerLink } from './leg-chip'
import {
  DecimalField,
  ImbalanceSlider,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from './calculator-shared'

export interface CalculatorDefaults {
  stake: string
  bonus: string
  rimborso: string
}

interface PuntaBancaCalculatorViewProps {
  row: MatcherResult
  event: BetEventInfo
  defaults: CalculatorDefaults
  /** Exchange commission in percent (4.5). */
  commissionPercent: number
  onClose: () => void
}

/**
 * The Punta-Banca calculator of a back/lay row: the Oddsmatcher modal, fed by
 * the internal engine's legs (leg 1 = book BACK, leg 2 = exchange LAY) and by
 * the pure engine. Mounted fresh for every row (the parent keys it), so the
 * fields start from the row and the shared amounts without effects.
 */
export function PuntaBancaCalculatorView({
  row,
  event,
  defaults,
  commissionPercent,
  onClose,
}: PuntaBancaCalculatorViewProps) {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const [backLeg, layLeg] = row.legs

  const [quotaPunta, setQuotaPunta] = useState(() => backLeg.odds.toFixed(2))
  const [quotaBanca, setQuotaBanca] = useState(() => layLeg.odds.toFixed(2))
  const [puntata, setPuntata] = useState(defaults.stake)
  const [bonus, setBonus] = useState(defaults.bonus)
  const [rimborso, setRimborso] = useState(defaults.rimborso)
  const [commissione, setCommissione] = useState(() => String(commissionPercent))
  const [imbalance, setImbalance] = useState(0)
  const [partialLays, setPartialLays] = useState<{ amount: string; newOdds: string }[]>([])
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')

  const [assignOpen, setAssignOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const quotaPuntaNum = parseNum(quotaPunta)
  const quotaBancaNum = parseNum(quotaBanca)
  const commissioneNum = parseNum(commissione) ?? 0

  const result = useMemo(
    () =>
      computePuntaBanca({
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        quotaPunta: quotaPuntaNum,
        quotaBanca: quotaBancaNum,
        commissionePercent: commissioneNum,
        imbalancePercent: imbalance,
        partialLays: partialLays.map((p) => ({
          amount: parseNum(p.amount),
          newOdds: parseNum(p.newOdds),
        })),
      }),
    [
      puntataNum,
      bonusNum,
      rimborsoNum,
      quotaPuntaNum,
      quotaBancaNum,
      commissioneNum,
      imbalance,
      partialLays,
    ],
  )

  const bookName = shortBookmakerName(backLeg.bookmakerName)
  const exchangeName = shortBookmakerName(layLeg.bookmakerName)
  const selezione = outcomeName(backLeg)
  const canSend =
    result.puntataEffettiva > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    result.layStake != null &&
    result.responsabilita != null

  const assignLegs: AssignLeg[] = useMemo(
    () => [
      {
        key: 'punta',
        title: 'Collaboratore Punta',
        detail: `${selezione} @ ${formatNum(quotaPuntaNum)} · ${formatNum(result.puntataEffettiva)} €`,
        bookmaker: { slug: backLeg.bookmakerSlug, name: backLeg.bookmakerName, isExchange: false },
        tone: 'primary',
      },
      {
        key: 'banca',
        title: 'Collaboratore Banca',
        detail: `banca ${selezione} @ ${formatNum(quotaBancaNum)} · ${formatNum(result.layStake)} €`,
        bookmaker: { slug: layLeg.bookmakerSlug, name: layLeg.bookmakerName, isExchange: true },
        tone: 'destructive',
      },
    ],
    [
      backLeg,
      layLeg,
      selezione,
      quotaPuntaNum,
      quotaBancaNum,
      result.puntataEffettiva,
      result.layStake,
    ],
  )

  const handleConfirm = async (accountIds: Record<string, string>) => {
    if (!canSend || quotaPuntaNum == null || quotaBancaNum == null || puntataNum == null) return
    if (result.layStake == null || result.responsabilita == null) return
    if (partialLays.length > 0 && !result.hasValidPartialLays) {
      setSaveError('Completa tutti i campi delle bancate parziali prima di salvare.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const { betPayload, legsPayload } = buildPuntaBancaBet({
        event,
        selezione,
        categoria,
        accountIdPunta: accountIds.punta,
        accountIdBanca: accountIds.banca,
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        quotaPunta: quotaPuntaNum,
        quotaBanca: quotaBancaNum,
        commissionePercent: commissioneNum,
        layStake: result.layStake,
        responsabilita: result.responsabilita,
        partialLays: partialLays.map((p) => ({
          amount: parseNum(p.amount),
          newOdds: parseNum(p.newOdds),
        })),
        partialLayResults: result.partialLayResults,
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const updatePartialLay = (index: number, field: 'amount' | 'newOdds', value: string) =>
    setPartialLays((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )

  const effResponsabilita = result.effResponsabilita
  const effExchangeProfit = result.effExchangeProfit
  const bookWinBook = ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) - (puntataNum ?? 0)

  return (
    <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
      {/* PUNTA e BANCA */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-ow-card border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-primary">
                Punta
              </p>
              <span className="text-[10px] text-muted-foreground">
                {event.mercato} · {selezione}
              </span>
            </div>
            <BookmakerLink leg={backLeg}>
              <BookmakerBadge slug={backLeg.bookmakerSlug} name={backLeg.bookmakerName} size="md" />
            </BookmakerLink>
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={quotaPunta}
            onChange={(e) => setQuotaPunta(sanitizeDecimal(e.target.value))}
            className="mt-2 h-9 rounded-ow-btn font-mono text-base font-medium tabular-nums sm:h-10 sm:text-lg"
            aria-label={`Quota punta su ${bookName}`}
          />
        </div>
        <div className="rounded-ow-card border border-border bg-card p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-destructive">
                Banca
              </p>
              <span className="text-[10px] text-muted-foreground">
                {event.mercato} · {selezione}
              </span>
            </div>
            <BookmakerLink leg={layLeg}>
              <BookmakerBadge slug={layLeg.bookmakerSlug} name={layLeg.bookmakerName} size="md" />
            </BookmakerLink>
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={quotaBanca}
            onChange={(e) => setQuotaBanca(sanitizeDecimal(e.target.value))}
            className="mt-2 h-9 rounded-ow-btn font-mono text-base font-medium tabular-nums sm:h-10 sm:text-lg"
            aria-label={`Quota banca su ${exchangeName}`}
          />
        </div>
      </div>

      {/* Importi e risultati */}
      <div className="rounded-ow-card border border-border bg-card p-3 sm:p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
          Importi e risultati
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <DecimalField id="pb-puntata" label="Puntata €" value={puntata} onChange={setPuntata} />
          <DecimalField id="pb-bonus" label="Bonus € (opz.)" value={bonus} onChange={setBonus} />
          <DecimalField
            id="pb-rimborso"
            label="Rimborso € (opz.)"
            value={rimborso}
            onChange={setRimborso}
          />
          <DecimalField
            id="pb-commissione"
            label="Comm. %"
            value={commissione}
            onChange={setCommissione}
            placeholder={String(commissionPercent)}
          />
        </div>
        <ImbalanceSlider
          value={imbalance}
          onChange={setImbalance}
          min={-20}
          max={20}
          step={0.5}
          label="Sbilanciamento bancata"
        />
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-ow-btn bg-muted/40 p-2.5 sm:grid-cols-4">
          <ResultStat label="Bancata" value={formatNum(result.layStake)} />
          <ResultStat label="Rischio" value={formatNum(result.responsabilita)} />
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

      {/* Bancata parziale */}
      {result.layStake != null && (
        <div className="space-y-3">
          {partialLays.map((pl, i) => {
            const step = result.partialLayResults[i] ?? null
            return (
              <div key={i} className="rounded-ow-card border border-border bg-card p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
                    Bancata parziale {partialLays.length > 1 ? `#${i + 1}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPartialLays((prev) => prev.filter((_, j) => j !== i))}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Togli bancata parziale"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <DecimalField
                    id={`pb-partial-amount-${i}`}
                    label="Già bancato €"
                    value={pl.amount}
                    onChange={(v) => updatePartialLay(i, 'amount', v)}
                  />
                  <DecimalField
                    id={`pb-partial-odds-${i}`}
                    label="Nuova quota banca"
                    value={pl.newOdds}
                    onChange={(v) => updatePartialLay(i, 'newOdds', v)}
                  />
                </div>
                {step != null && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-ow-btn bg-muted/40 p-2.5">
                    <ResultStat
                      label="Nuova bancata"
                      value={`€${formatNum(step.newLayStake)}`}
                      className="text-destructive"
                    />
                    <ResultStat label="Nuova resp." value={`€${formatNum(step.newLiability)}`} />
                  </div>
                )}
              </div>
            )
          })}
          {partialLays.length < 6 && (
            <button
              type="button"
              onClick={() => setPartialLays((prev) => [...prev, { amount: '', newOdds: '' }])}
              className="flex w-full items-center justify-center gap-1.5 rounded-ow-btn border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <span className="text-base leading-none">+</span>
              Bancata parziale
            </button>
          )}
        </div>
      )}

      {/* Profitti */}
      {result.showSummary && result.guadagnoMinimo != null && (
        <div className="rounded-ow-card border border-border">
          <div className="bg-muted/30 px-4 py-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
              Profitti
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2.5 text-left" />
                  <th className="px-4 py-2.5 text-right">{bookName}</th>
                  <th className="px-4 py-2.5 text-right">{exchangeName}</th>
                  {result.isRimborso && <th className="px-4 py-2.5 text-right">Rimborso</th>}
                  <th className="px-4 py-2.5 text-right">Totale</th>
                  <th className="px-4 py-2.5 text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    se vinci la puntata su {bookName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-primary">
                    {formatSigned(bookWinBook)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-destructive">
                    {formatSigned(effResponsabilita != null ? -effResponsabilita : null)}
                  </td>
                  {result.isRimborso && (
                    <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
                  )}
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium tabular-nums',
                      profitClass(result.totalSeVinciPuntata),
                    )}
                  >
                    {formatSigned(result.totalSeVinciPuntata)} €
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {result.ratingSeVinciPuntata != null
                      ? `${formatNum(result.ratingSeVinciPuntata)}%`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    se vinci la bancata su {exchangeName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-destructive">
                    {formatSigned(puntataNum != null ? -puntataNum : null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-primary">
                    {formatSigned(effExchangeProfit)}
                  </td>
                  {result.isRimborso && (
                    <td className="px-4 py-2.5 text-right font-medium text-primary">
                      {formatSigned(rimborsoNum)}
                    </td>
                  )}
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium tabular-nums',
                      profitClass(result.totalSeVinciBancata),
                    )}
                  >
                    {formatSigned(result.totalSeVinciBancata)} €
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {result.ratingSeVinciBancata != null
                      ? `${formatNum(result.ratingSeVinciBancata)}%`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="space-y-3 border-t border-border pt-4">
        <BetCategorySelect value={categoria} onChange={setCategoria} />
        <Button
          className="w-full rounded-ow-btn"
          onClick={() => setAssignOpen(true)}
          disabled={!canSend}
        >
          Invia scommessa al Profit Tracker
        </Button>
        <p className="text-[11px] text-muted-foreground">
          <Label className="sr-only">Nota</Label>
          La giocata viene salvata come bozza con le quote e gli importi di questa finestra.
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
