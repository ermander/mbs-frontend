'use client'

import { useMemo, useState } from 'react'
import {
  CalcImbalance,
  CalcNumberField,
  CalcOutcomeTable,
  CalcPartials,
  CalcProfits,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computePuntaBanca } from '@/lib/calculators/engines/punta-banca-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildPuntaBancaBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import { outcomeName } from '@/lib/matcher/format'
import { shortBookmakerName } from '@/lib/bookmakers'
import type { BetCategory } from '@/types/profit-tracker'
import type { MatcherResult } from '@/types/matcher'
import { sanitizeDecimal } from '@/lib/utils'
import { AssignAccountsModal, type AssignLeg } from './assign-accounts-modal'
import { BookmakerLink } from './leg-chip'
import { decimalText, formatNum } from './calculator-shared'
import { MatcherCalcLayout, MatcherCategoryChoice, MatcherLegCard } from './matcher-calc-parts'
import { OmBookLogo } from './om-ds'

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
 * The Punta-Banca calculator of a back/lay row, inside the full-screen panel of
 * the Oddsmatcher (design of §14.273), fed by the internal engine's legs (leg 1 =
 * book BACK, leg 2 = exchange LAY) and by the pure engine. Mounted fresh for
 * every row (the parent keys it), so the fields start from the row and the
 * shared amounts without effects. «Salva nel tracker» sits in the bar of the
 * panel and opens the accounts dialog, as the old «Invia» button did.
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

  const [quotaPunta, setQuotaPunta] = useState(() => decimalText(backLeg.odds.toFixed(2)))
  const [quotaBanca, setQuotaBanca] = useState(() => decimalText(layLeg.odds.toFixed(2)))
  const [puntata, setPuntata] = useState(defaults.stake)
  const [bonus, setBonus] = useState(defaults.bonus)
  const [rimborso, setRimborso] = useState(defaults.rimborso)
  const [commissione, setCommissione] = useState(() => decimalText(String(commissionPercent)))
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

  // Esborso: il saldo reale puntato più la responsabilità in vigore sull'exchange.
  const showProfits = result.showSummary && result.guadagnoMinimo != null
  const esborso = showProfits ? (puntataNum ?? 0) + (effResponsabilita ?? 0) : null
  const profitRows: OutcomeProfitRow[] = showProfits
    ? [
        {
          id: 'punta',
          esito: `Se vince la puntata su ${bookName}`,
          legs: [bookWinBook, effResponsabilita != null ? -effResponsabilita : null],
          rimborso: 0,
          totale: result.totalSeVinciPuntata,
        },
        {
          id: 'banca',
          esito: `Se vince la bancata su ${exchangeName}`,
          legs: [puntataNum != null ? -puntataNum : null, effExchangeProfit],
          rimborso: result.isRimborso ? rimborsoNum : 0,
          totale: result.totalSeVinciBancata,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating label="Rating" value={result.rating} />

      <MatcherCalcLayout
        legs={
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <MatcherLegCard
                tone="info"
                title={`Punta · ${selezione}`}
                odds={
                  <CalcNumberField
                    id="pb-quota-punta"
                    ariaLabel={`Quota punta su ${bookName}`}
                    size="sm"
                    value={quotaPunta}
                    onChange={(v) => setQuotaPunta(sanitizeDecimal(v))}
                  />
                }
                logo={
                  <BookmakerLink leg={backLeg}>
                    <OmBookLogo
                      slug={backLeg.bookmakerSlug}
                      name={backLeg.bookmakerName}
                      size="lg"
                    />
                  </BookmakerLink>
                }
                figureLabel="Puntata"
                figure={amount(result.puntataEffettiva > 0 ? result.puntataEffettiva : null)}
              />
              <MatcherLegCard
                tone="loss"
                title={`Banca · ${selezione}`}
                odds={
                  <CalcNumberField
                    id="pb-quota-banca"
                    ariaLabel={`Quota banca su ${exchangeName}`}
                    size="sm"
                    value={quotaBanca}
                    onChange={(v) => setQuotaBanca(sanitizeDecimal(v))}
                  />
                }
                logo={
                  <BookmakerLink leg={layLeg}>
                    <OmBookLogo slug={layLeg.bookmakerSlug} name={layLeg.bookmakerName} size="lg" />
                  </BookmakerLink>
                }
                figureLabel="Bancata"
                figure={amount(result.layStake)}
                footer={
                  <>
                    <span>Responsabilità</span>
                    <span className="ds-num whitespace-nowrap text-ds-ink">
                      {amount(result.responsabilita)}
                    </span>
                  </>
                }
              />
            </div>

            {result.layStake != null && (
              <CalcPartials
                idPrefix="pb-partial"
                title="Bancata parziale"
                amountLabel="Già bancato"
                oddsLabel="Nuova quota banca"
                addLabel="Aggiungi bancata parziale"
                entries={partialLays}
                results={result.partialLayResults}
                figures={(r) => [
                  { label: 'Nuova bancata', value: amount(r?.newLayStake) },
                  { label: 'Nuova resp.', value: amount(r?.newLiability) },
                ]}
                total={
                  result.hasValidPartialLays && result.partialLayTotals != null ? (
                    <>
                      Nuova responsabilità{' '}
                      <b className="ds-num text-ds-ink">
                        {amount(result.partialLayTotals.totalLiability)}
                      </b>
                    </>
                  ) : undefined
                }
                onAdd={() => setPartialLays((prev) => [...prev, { amount: '', newOdds: '' }])}
                onRemove={(index) => setPartialLays((prev) => prev.filter((_, j) => j !== index))}
                onChange={(index, field, value) =>
                  updatePartialLay(index, field, sanitizeDecimal(value))
                }
              />
            )}
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="pb-puntata"
              label={`Puntata su ${selezione} · ${bookName}`}
              size="lg"
              suffix="€"
              value={puntata}
              onChange={(v) => setPuntata(sanitizeDecimal(v))}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="pb-bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={(v) => setBonus(sanitizeDecimal(v))}
              />
              <CalcNumberField
                id="pb-rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={(v) => setRimborso(sanitizeDecimal(v))}
              />
            </div>
            <CalcImbalance
              label="Sbilancia la bancata"
              value={imbalance}
              onChange={setImbalance}
              min={-20}
              max={20}
              leading={
                <CalcNumberField
                  id="pb-commissione"
                  label="Commissione"
                  suffix="%"
                  placeholder={String(commissionPercent)}
                  value={commissione}
                  onChange={(v) => setCommissione(sanitizeDecimal(v))}
                />
              }
            />
            <MatcherCategoryChoice value={categoria} onChange={setCategoria} />
          </>
        }
      />

      <CalcProfits outlay={esborso} minGain={showProfits ? result.guadagnoMinimo : null}>
        <CalcOutcomeTable
          legLabels={[bookName, exchangeName]}
          rows={profitRows}
          stake={puntataNum ?? 0}
          emptyText="Il risultato compare quando la puntata e le quote di punta e banca sono compilate e valide."
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={() => setAssignOpen(true)} disabled={!canSend} />

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
