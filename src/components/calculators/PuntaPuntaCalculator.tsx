'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'
import {
  ratingPercent,
  stakeBFromStakeA,
  stakeBFromStakeARimborso,
} from '@/lib/calculators/punta-punta'
import { roundStake } from '@/lib/calculators/stake-step'
import { partialCoverReturn } from '@/lib/calculators/partial-cover'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { type CreateBetLegPayload } from '@/services/api/profit-tracker-client'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  MARKET_OPTIONS,
  formatMercatoString,
  isTeamScopedMarket,
  type TeamScope,
} from '@/lib/calculators/markets'
import { TeamScopeToggle } from '@/components/calculators/team-scope-toggle'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import type { Account, BetCategory, Holder } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import {
  CalcBoost,
  CalcFigure,
  CalcImbalance,
  CalcLayout,
  CalcNumberField,
  CalcOutcomeTable,
  CalcPartials,
  CalcProfits,
  OutcomeRow,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  NO_BOOST,
  boostNote,
  boostPercent,
  boostedOdds,
  type BoostInput,
} from '@/lib/calculators/boost'

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatSigned(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function defaultEventoData(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

export function PuntaPuntaCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [puntataA, setPuntataA] = useState('')
  const [quotaA, setQuotaA] = useState('')
  const [quotaB, setQuotaB] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [imbalance, setImbalance] = useState<number>(0)
  const [partialPuntas, setPartialPuntas] = useState<{ amount: string; newOdds: string }[]>([])
  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [holderIdPuntaA, setHolderIdPuntaA] = useState('')
  const [holderIdPuntaB, setHolderIdPuntaB] = useState('')
  const [accountsPuntaA, setAccountsPuntaA] = useState<Account[]>([])
  const [accountsPuntaB, setAccountsPuntaB] = useState<Account[]>([])
  const [accountIdPuntaA, setAccountIdPuntaA] = useState('')
  const [accountIdPuntaB, setAccountIdPuntaB] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [eventoNome, setEventoNome] = useState('')
  const [mercatoPuntaA, setMercatoPuntaA] = useState('')
  const [mercatoPuntaB, setMercatoPuntaB] = useState('')
  const [scopePuntaA, setScopePuntaA] = useState<TeamScope | ''>('')
  const [scopePuntaB, setScopePuntaB] = useState<TeamScope | ''>('')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [boostA, setBoostA] = useState<BoostInput>(NO_BOOST)
  const [boostB, setBoostB] = useState<BoostInput>(NO_BOOST)
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataANum = parseNum(puntataA)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettivaA = (puntataANum ?? 0) + bonusNum
  // §14.274: una punta maggiorata vale alla quota effettiva in tutto il calcolatore, giocata salvata
  // compresa; la quota scritta va solo nella nota.
  const boostAPct = boostPercent(boostA)
  const boostBPct = boostPercent(boostB)
  const quotaANum = boostedOdds(parseNum(quotaA), boostAPct)
  const quotaBNum = boostedOdds(parseNum(quotaB), boostBPct)

  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))
  const imbalanceFactor = 1 + imbalancePercent / 100

  // Valore esatto: fa da bersaglio alle contropuntate parziali.
  const stakeBExact = useMemo(() => {
    if (puntataEffettivaA <= 0 || quotaANum == null || quotaBNum == null) return null
    let base: number | null
    if (rimborsoNum > 0) {
      base = stakeBFromStakeARimborso(puntataEffettivaA, quotaANum, quotaBNum, rimborsoNum)
    } else {
      base = stakeBFromStakeA(puntataEffettivaA, quotaANum, quotaBNum)
    }
    if (base == null) return null
    const adjusted = base * imbalanceFactor
    return Number.isFinite(adjusted) ? adjusted : null
  }, [puntataEffettivaA, quotaANum, quotaBNum, rimborsoNum, imbalanceFactor])

  // La contropuntata da piazzare: multipli di 0,05 € (§14.229). Profitti,
  // riepilogo e salvataggio partono da questa.
  const stakeB = stakeBExact == null ? null : roundStake(stakeBExact)

  /* ── Contropuntata parziale (multi-step, max 6) ── */
  const partialPuntaResults = useMemo(() => {
    if (partialPuntas.length === 0 || quotaBNum == null || stakeBExact == null) return []

    const coverageTarget = stakeBExact * quotaBNum

    type StepResult = { newStake: number }
    const results: (StepResult | null)[] = []
    let coveredSum = 0

    for (let i = 0; i < partialPuntas.length; i++) {
      const amountNum = parseNum(partialPuntas[i].amount)
      const newOddsNum = parseNum(partialPuntas[i].newOdds)

      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }

      const prevOdds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }

      coveredSum += amountNum * prevOdds

      if (newOddsNum <= 0) {
        results.push(null)
        break
      }

      const newStakeExact = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStakeExact) || newStakeExact < 0) {
        results.push(null)
        break
      }

      // Anche il resto da puntare va a multipli di 0,05 €.
      results.push({ newStake: roundStake(newStakeExact) })
    }

    return results
  }, [partialPuntas, quotaBNum, stakeBExact])

  const hasValidPartialPuntas =
    partialPuntas.length > 0 &&
    partialPuntaResults.length > 0 &&
    partialPuntaResults.every((r) => r != null)

  const partialPuntaTotals = useMemo(() => {
    if (!hasValidPartialPuntas || quotaBNum == null || stakeB == null) return null

    let totalStakeB = 0

    for (let i = 0; i < partialPuntas.length; i++) {
      const amount = parseNum(partialPuntas[i].amount)
      if (amount == null || amount <= 0) return null
      totalStakeB += amount
    }

    const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
    if (lastResult == null) return null
    totalStakeB += lastResult.newStake

    return { totalStakeB }
  }, [hasValidPartialPuntas, partialPuntas, partialPuntaResults, quotaBNum, stakeB])

  // Effective stakeB: use partial totals if available
  const effectiveStakeB = partialPuntaTotals?.totalStakeB ?? stakeB

  const rating = useMemo(() => {
    if (quotaANum == null || quotaBNum == null || quotaANum <= 0 || quotaBNum <= 0) return null
    return ratingPercent(quotaANum, quotaBNum)
  }, [quotaANum, quotaBNum])

  const showSummary =
    puntataEffettivaA > 0 &&
    quotaANum != null &&
    quotaANum > 0 &&
    quotaBNum != null &&
    quotaBNum > 0 &&
    stakeB != null

  const loadAccountsForHolder = useCallback((holderId: string) => loadHolderAccounts(holderId), [])

  const handleChangeHolderPuntaA = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaA(holderId)
      setAccountsPuntaA([])
      setAccountIdPuntaA('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaA(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  const handleChangeHolderPuntaB = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaB(holderId)
      setAccountsPuntaB([])
      setAccountIdPuntaB('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaB(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  useEffect(() => {
    if (!holderModalOpen || savedBetId) return
    const loadBasics = async () => {
      setIsLoadingBasics(true)
      try {
        if (holders.length === 0) await fetchHolders()
        if (books.length === 0) await fetchAllBooks()
      } finally {
        setIsLoadingBasics(false)
      }
    }
    void loadBasics()
  }, [holderModalOpen, savedBetId, holders.length, books.length, fetchHolders, fetchAllBooks])

  const resetModalState = useCallback(() => {
    setHolderIdPuntaA('')
    setHolderIdPuntaB('')
    setAccountsPuntaA([])
    setAccountsPuntaB([])
    setAccountIdPuntaA('')
    setAccountIdPuntaB('')
    setHolderModalError(null)
    setSavedBetId(null)
    setCategoria('matched_betting')
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setEventoData(defaultEventoData())
    setHolderModalOpen(true)
  }

  const realOutlay = (puntataANum ?? 0) + (effectiveStakeB ?? 0)
  const profitIfAWins =
    quotaANum != null && effectiveStakeB != null ? puntataEffettivaA * quotaANum - realOutlay : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  // Con le contropuntate parziali ogni pezzo della punta 2 vale alla quota a cui è stato giocato
  // (§14.270): prima tutta la punta 2 andava alla quota iniziale.
  const returnB =
    effectiveStakeB == null || quotaBNum == null
      ? null
      : partialPuntaTotals != null
        ? partialCoverReturn(
            quotaBNum,
            partialPuntas.map((p) => ({
              amount: parseNum(p.amount),
              newOdds: parseNum(p.newOdds),
            })),
            partialPuntaResults[partialPuntaResults.length - 1]?.newStake ?? null,
          )
        : effectiveStakeB * quotaBNum
  const profitIfBWins = returnB != null ? returnB - realOutlay + rimborsoNum : null

  const guadagnoMinimo = useMemo(() => {
    if (profitIfAWins == null || profitIfBWins == null) return null
    const minVal = Math.min(profitIfAWins, profitIfBWins)
    return Number.isFinite(minVal) ? minVal : null
  }, [profitIfAWins, profitIfBWins])

  const crPercent =
    rimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  // Partial punta helpers
  const addPartialPunta = () => {
    if (partialPuntas.length < 6) {
      setPartialPuntas((prev) => [...prev, { amount: '', newOdds: '' }])
    }
  }
  const removePartialPunta = (index: number) => {
    setPartialPuntas((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePartialPunta = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialPuntas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!accountIdPuntaA || !accountIdPuntaB) return false
    if (
      puntataEffettivaA <= 0 ||
      quotaANum == null ||
      quotaBNum == null ||
      stakeB == null ||
      guadagnoMinimo == null
    )
      return false
    return true
  }, [
    eventoNome,
    accountIdPuntaA,
    accountIdPuntaB,
    puntataEffettivaA,
    quotaANum,
    quotaBNum,
    stakeB,
    guadagnoMinimo,
  ])

  const handleSendToProfitTracker = async () => {
    if (!canSave) return
    if (quotaANum == null || quotaBNum == null || stakeB == null) return
    const eventoDataIso = new Date(eventoData).toISOString()
    const eventoNomeVal = eventoNome.trim() || 'Punta-Punta'
    const competizione = 'N/D'
    setIsSaving(true)
    setHolderModalError(null)
    try {
      const betPayload = {
        eventoData: eventoDataIso,
        categoria,
        sport: 'calcio' as const,
        eventoNome: eventoNomeVal,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPuntaA,
        tag: undefined as string | undefined,
        nota: boostNote([
          { label: 'Punta 1', odds: parseNum(quotaA), percent: boostAPct },
          { label: 'Punta 2', odds: parseNum(quotaB), percent: boostBPct },
        ]),
      }
      const tipoBonusA = rimborsoNum > 0 ? 'rimborso' : bonusNum > 0 ? 'bonus' : 'none'

      const legA: CreateBetLegPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio',
        eventoNome: eventoNomeVal,
        competizione,
        mercato: formatMercatoString(mercatoPuntaA, scopePuntaA) || '\u2014',
        metodo: 'punta' as const,
        tipoBonus: tipoBonusA as 'none' | 'bonus' | 'rimborso' | 'freebet',
        accountId: accountIdPuntaA,
        // Real stake only: the bonus travels in bonusValore (backend convention, §14.115).
        stake: puntataANum ?? 0,
        quota: quotaANum,
        rischio: 0,
        bonusValore: bonusNum > 0 ? bonusNum : undefined,
        rimborsoValore: rimborsoNum > 0 ? rimborsoNum : undefined,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
        posizione: 0,
      }

      // Build leg B — split into multiple legs if partial counter-bets are active
      const legsB: CreateBetLegPayload[] = []
      if (hasValidPartialPuntas && partialPuntaResults.every((r) => r != null)) {
        for (let i = 0; i < partialPuntas.length; i++) {
          const amount = parseNum(partialPuntas[i].amount)
          const odds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
          if (amount == null || odds == null) break
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '\u2014',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaB,
            stake: amount,
            quota: odds,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: i + 1,
          })
        }
        // Add the final calculated remaining stake
        const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
        const lastNewOdds = parseNum(partialPuntas[partialPuntas.length - 1].newOdds)
        if (lastResult != null && lastNewOdds != null) {
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '\u2014',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaB,
            stake: lastResult.newStake,
            quota: lastNewOdds,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: partialPuntas.length + 1,
          })
        }
      } else {
        legsB.push({
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '\u2014',
          metodo: 'punta' as const,
          tipoBonus: 'none',
          accountId: accountIdPuntaB,
          stake: stakeB,
          quota: quotaBNum,
          rischio: 0,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: 0,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
          posizione: 1,
        })
      }

      const legsPayload: CreateBetLegPayload[] = [legA, ...legsB]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const showCr = rimborsoNum > 0 && crPercent != null
  const profitRows: OutcomeProfitRow[] =
    showSummary &&
    returnA != null &&
    returnB != null &&
    profitIfAWins != null &&
    profitIfBWins != null
      ? [
          {
            id: 'a',
            esito: 'Se vince la punta 1',
            legs: [
              bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
              -(effectiveStakeB ?? 0),
            ],
            rimborso: 0,
            totale: profitIfAWins,
          },
          {
            id: 'b',
            esito: 'Se vince la punta 2',
            legs: [
              bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA,
              returnB - (effectiveStakeB ?? 0),
            ],
            rimborso: rimborsoNum,
            totale: profitIfBWins,
          },
        ]
      : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating
        label={showCr ? 'CR' : 'Rating'}
        value={showCr ? crPercent : showSummary ? rating : null}
      />

      <CalcLayout
        outcomes={
          <>
            <OutcomeRow
              title="Punta 1"
              odds={
                <CalcNumberField
                  id="quota-a"
                  ariaLabel="Quota della punta 1"
                  size="sm"
                  value={quotaA}
                  onChange={setQuotaA}
                />
              }
              figure={
                <CalcFigure
                  label="Puntata"
                  live
                  value={amount(puntataEffettivaA > 0 ? puntataEffettivaA : null)}
                />
              }
            >
              <CalcBoost
                id="boost-a"
                boost={boostA}
                onChange={setBoostA}
                effectiveOdds={boostAPct > 0 ? quotaANum : null}
                className="col-span-full border-t border-ds-line pt-3"
              />
            </OutcomeRow>
            <OutcomeRow
              title="Punta 2"
              odds={
                <CalcNumberField
                  id="quota-b"
                  ariaLabel="Quota della punta 2"
                  size="sm"
                  value={quotaB}
                  onChange={setQuotaB}
                />
              }
              figure={<CalcFigure label="Copertura" live value={amount(stakeB)} />}
            >
              <CalcBoost
                id="boost-b"
                boost={boostB}
                onChange={setBoostB}
                effectiveOdds={boostBPct > 0 ? quotaBNum : null}
                className="col-span-full border-t border-ds-line pt-3"
              />
            </OutcomeRow>

            {stakeB != null && (
              <CalcPartials
                idPrefix="partial"
                title="Contropuntata parziale"
                amountLabel="Già puntato"
                oddsLabel="Nuova quota punta 2"
                addLabel="Aggiungi contropuntata parziale"
                entries={partialPuntas}
                results={partialPuntaResults}
                figures={(r) => [{ label: 'Nuova punta 2', value: amount(r?.newStake) }]}
                total={
                  hasValidPartialPuntas && partialPuntaTotals != null ? (
                    <>
                      Punta 2 in tutto{' '}
                      <b className="ds-num text-ds-ink">{amount(partialPuntaTotals.totalStakeB)}</b>
                    </>
                  ) : undefined
                }
                onAdd={addPartialPunta}
                onRemove={removePartialPunta}
                onChange={updatePartialPunta}
              />
            )}
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="puntata-a"
              label="Puntata reale"
              size="lg"
              suffix="€"
              value={puntataA}
              onChange={setPuntataA}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={setBonus}
              />
              <CalcNumberField
                id="rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={setRimborso}
              />
            </div>
            <CalcImbalance
              label="Sbilancia la copertura"
              value={imbalancePercent}
              onChange={setImbalance}
            />
          </>
        }
      />

      <CalcProfits
        outlay={showSummary ? realOutlay : null}
        minGain={showSummary ? guadagnoMinimo : null}
      >
        <CalcOutcomeTable
          legLabels={['Punta 1', 'Punta 2']}
          rows={profitRows}
          stake={puntataANum ?? 0}
          emptyText="Il risultato compare quando la puntata e le quote delle due punte sono compilate e valide."
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={handleOpenModal} disabled={!showSummary} />

      {/* Modale: Assegna collaboratori e dati evento */}
      <Dialog
        open={holderModalOpen}
        onOpenChange={(open) => {
          setHolderModalOpen(open)
          if (!open) resetModalState()
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
          <div
            ref={setDropdownPortalEl}
            className="pointer-events-none fixed inset-0 z-[9998]"
            aria-hidden
          />
          {savedBetId ? (
            <>
              <div className="px-6 pb-4 pt-6">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Giocata salvata
                </DialogTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  La giocata è stata salvata correttamente nel Profit Tracker.
                </p>
                <p className="mt-3 text-sm text-foreground">
                  <Link
                    href={`/profit-tracker/giocate-in-corso/${savedBetId}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Vai al dettaglio della giocata
                  </Link>
                </p>
              </div>
              <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setHolderModalOpen(false)
                    setSavedBetId(null)
                  }}
                >
                  Chiudi
                </Button>
              </div>
            </>
          ) : isLoadingBasics ? (
            <>
              <DialogTitle className="sr-only">Caricamento</DialogTitle>
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pb-1 pt-6">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Salva giocata Punta-Punta
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Compila i dettagli dell&apos;evento e assegna i collaboratori per puntata 1 e
                  puntata 2.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-evento">Nome evento</Label>
                  <Input
                    id="pp-modal-evento"
                    type="text"
                    placeholder="Es. Juventus - Milan"
                    value={eventoNome}
                    onChange={(e) => setEventoNome(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-data">Data e ora evento</Label>
                  <Input
                    id="pp-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-a">Mercato Punta 1</Label>
                  <SearchableSelect
                    id="pp-modal-mercato-a"
                    placeholder="Seleziona"
                    searchPlaceholder="Cerca mercato..."
                    options={MARKET_OPTIONS}
                    value={mercatoPuntaA}
                    onChange={(v) => {
                      setMercatoPuntaA(v)
                      setScopePuntaA((prev) => (isTeamScopedMarket(v) ? prev || 'CASA' : ''))
                    }}
                    portalContainer={dropdownPortalEl}
                  />
                  {isTeamScopedMarket(mercatoPuntaA) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Squadra</span>
                      <TeamScopeToggle value={scopePuntaA} onChange={setScopePuntaA} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-b">Mercato Punta 2</Label>
                  <SearchableSelect
                    id="pp-modal-mercato-b"
                    placeholder="Seleziona"
                    searchPlaceholder="Cerca mercato..."
                    options={MARKET_OPTIONS}
                    value={mercatoPuntaB}
                    onChange={(v) => {
                      setMercatoPuntaB(v)
                      setScopePuntaB((prev) => (isTeamScopedMarket(v) ? prev || 'CASA' : ''))
                    }}
                    portalContainer={dropdownPortalEl}
                  />
                  {isTeamScopedMarket(mercatoPuntaB) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Squadra</span>
                      <TeamScopeToggle value={scopePuntaB} onChange={setScopePuntaB} />
                    </div>
                  )}
                </div>

                <BetCategorySelect value={categoria} onChange={setCategoria} />

                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-primary">
                      Collaboratore Punta 1
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
                    <SearchableSelect
                      id="holder-punta-a"
                      placeholder="Seleziona collaboratore"
                      searchPlaceholder="Cerca collaboratore..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaA}
                      onChange={(val) => void handleChangeHolderPuntaA(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Conto punta 1</Label>
                    <SearchableSelect
                      id="account-punta-a"
                      placeholder={
                        holderIdPuntaA ? 'Seleziona conto' : 'Seleziona prima un collaboratore'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaA.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaA}
                      onChange={setAccountIdPuntaA}
                      disabled={!holderIdPuntaA || accountsPuntaA.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaA && accountsPuntaA.length === 0 && (
                      <p className="rounded-md bg-ds-warning-soft px-3 py-2 text-xs text-ds-warning">
                        Nessun conto punta disponibile per questo collaboratore. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <Label className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-primary">
                    Collaboratore Punta 2
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
                    <SearchableSelect
                      id="holder-punta-b"
                      placeholder="Seleziona collaboratore"
                      searchPlaceholder="Cerca collaboratore..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaB}
                      onChange={(val) => void handleChangeHolderPuntaB(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Conto punta 2 (copertura)
                    </Label>
                    <SearchableSelect
                      id="account-punta-b"
                      placeholder={
                        holderIdPuntaB ? 'Seleziona conto' : 'Seleziona prima un collaboratore'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaB.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaB}
                      onChange={setAccountIdPuntaB}
                      disabled={!holderIdPuntaB || accountsPuntaB.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaB && accountsPuntaB.length === 0 && (
                      <p className="rounded-md bg-ds-warning-soft px-3 py-2 text-xs text-ds-warning">
                        Nessun conto punta disponibile per questo collaboratore. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                {showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      Punta 1: <span className="font-mono">{puntataEffettivaA.toFixed(2)} €</span> a
                      quota <span className="font-mono">{quotaANum?.toFixed(2)}</span>
                    </p>
                    {hasValidPartialPuntas && partialPuntaResults.every((r) => r != null) ? (
                      <>
                        {partialPuntas.map((pp, i) => {
                          const amount = parseNum(pp.amount)
                          const odds = i === 0 ? quotaBNum : parseNum(partialPuntas[i - 1].newOdds)
                          return (
                            <p key={i}>
                              Punta 2.{i + 1} (copertura):{' '}
                              <span className="font-mono">{(amount ?? 0).toFixed(2)} €</span> a
                              quota <span className="font-mono">{(odds ?? 0).toFixed(2)}</span>
                            </p>
                          )
                        })}
                        {(() => {
                          const lastResult = partialPuntaResults[partialPuntaResults.length - 1]
                          const lastOdds = parseNum(partialPuntas[partialPuntas.length - 1].newOdds)
                          return lastResult != null && lastOdds != null ? (
                            <p>
                              Punta 2.{partialPuntas.length + 1} (copertura):{' '}
                              <span className="font-mono">{lastResult.newStake.toFixed(2)} €</span>{' '}
                              a quota <span className="font-mono">{lastOdds.toFixed(2)}</span>
                            </p>
                          ) : null
                        })()}
                      </>
                    ) : (
                      <p>
                        Punta 2 (copertura):{' '}
                        <span className="font-mono">{(stakeB ?? 0).toFixed(2)} €</span> a quota{' '}
                        <span className="font-mono">{quotaBNum?.toFixed(2)}</span>.
                      </p>
                    )}
                    {guadagnoMinimo != null && (
                      <p>
                        Guadagno minimo:{' '}
                        <span className="font-mono">{formatSigned(guadagnoMinimo)} €</span>
                      </p>
                    )}
                  </div>
                )}

                {holderModalError && (
                  <div className="rounded-lg border border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {holderModalError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="outline"
                  className="sm:min-w-[100px]"
                  onClick={() => setHolderModalOpen(false)}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annulla
                </Button>
                <Button
                  variant="success"
                  className="sm:min-w-[120px]"
                  onClick={() => void handleSendToProfitTracker()}
                  disabled={isSaving || !canSave}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Salva nel Profit Tracker
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
