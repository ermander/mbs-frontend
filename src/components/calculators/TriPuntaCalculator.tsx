'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'
import {
  ratingPercent,
  stakeBCFromStakeA,
  stakeBCFromStakeARimborso,
} from '@/lib/calculators/tri-punta'
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

export function TriPuntaCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [puntataA, setPuntataA] = useState('')
  const [quotaA, setQuotaA] = useState('')
  const [quotaB, setQuotaB] = useState('')
  const [quotaC, setQuotaC] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [imbalance, setImbalance] = useState<number>(0)
  const [partialPuntasB, setPartialPuntasB] = useState<{ amount: string; newOdds: string }[]>([])
  const [partialPuntasC, setPartialPuntasC] = useState<{ amount: string; newOdds: string }[]>([])
  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [holderIdPuntaA, setHolderIdPuntaA] = useState('')
  const [holderIdPuntaB, setHolderIdPuntaB] = useState('')
  const [holderIdPuntaC, setHolderIdPuntaC] = useState('')
  const [accountsPuntaA, setAccountsPuntaA] = useState<Account[]>([])
  const [accountsPuntaB, setAccountsPuntaB] = useState<Account[]>([])
  const [accountsPuntaC, setAccountsPuntaC] = useState<Account[]>([])
  const [accountIdPuntaA, setAccountIdPuntaA] = useState('')
  const [accountIdPuntaB, setAccountIdPuntaB] = useState('')
  const [accountIdPuntaC, setAccountIdPuntaC] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [eventoNome, setEventoNome] = useState('')
  const [mercatoPuntaA, setMercatoPuntaA] = useState('')
  const [mercatoPuntaB, setMercatoPuntaB] = useState('')
  const [mercatoPuntaC, setMercatoPuntaC] = useState('')
  const [scopePuntaA, setScopePuntaA] = useState<TeamScope | ''>('')
  const [scopePuntaB, setScopePuntaB] = useState<TeamScope | ''>('')
  const [scopePuntaC, setScopePuntaC] = useState<TeamScope | ''>('')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [boostA, setBoostA] = useState<BoostInput>(NO_BOOST)
  const [boostB, setBoostB] = useState<BoostInput>(NO_BOOST)
  const [boostC, setBoostC] = useState<BoostInput>(NO_BOOST)
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
  const boostCPct = boostPercent(boostC)
  const quotaANum = boostedOdds(parseNum(quotaA), boostAPct)
  const quotaBNum = boostedOdds(parseNum(quotaB), boostBPct)
  const quotaCNum = boostedOdds(parseNum(quotaC), boostCPct)

  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))
  const imbalanceFactor = 1 + imbalancePercent / 100

  // Valori esatti: fanno da bersaglio alle contropuntate parziali.
  const stakesExact = useMemo(() => {
    if (puntataEffettivaA <= 0 || quotaANum == null || quotaBNum == null || quotaCNum == null)
      return null
    let result: { stakeB: number; stakeC: number } | null
    if (rimborsoNum > 0) {
      result = stakeBCFromStakeARimborso(
        puntataEffettivaA,
        quotaANum,
        quotaBNum,
        quotaCNum,
        rimborsoNum,
      )
    } else {
      result = stakeBCFromStakeA(puntataEffettivaA, quotaANum, quotaBNum, quotaCNum)
    }
    if (result == null) return null
    const adjB = result.stakeB * imbalanceFactor
    const adjC = result.stakeC * imbalanceFactor
    if (!Number.isFinite(adjB) || !Number.isFinite(adjC)) return null
    return { stakeB: adjB, stakeC: adjC }
  }, [puntataEffettivaA, quotaANum, quotaBNum, quotaCNum, rimborsoNum, imbalanceFactor])

  const stakeBExact = stakesExact?.stakeB ?? null
  const stakeCExact = stakesExact?.stakeC ?? null
  // Le contropuntate da piazzare: multipli di 0,05 € (§14.229). Profitti,
  // riepilogo e salvataggio partono da queste.
  const stakeB = stakeBExact == null ? null : roundStake(stakeBExact)
  const stakeC = stakeCExact == null ? null : roundStake(stakeCExact)

  /* ── Contropuntata parziale B (multi-step, max 6) ── */
  const partialPuntaResultsB = useMemo(() => {
    if (partialPuntasB.length === 0 || quotaBNum == null || stakeBExact == null) return []
    const coverageTarget = stakeBExact * quotaBNum
    type StepResult = { newStake: number }
    const results: (StepResult | null)[] = []
    let coveredSum = 0
    for (let i = 0; i < partialPuntasB.length; i++) {
      const amountNum = parseNum(partialPuntasB[i].amount)
      const newOddsNum = parseNum(partialPuntasB[i].newOdds)
      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }
      const prevOdds = i === 0 ? quotaBNum : parseNum(partialPuntasB[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }
      coveredSum += amountNum * prevOdds
      const newStakeExact = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStakeExact) || newStakeExact < 0) {
        results.push(null)
        break
      }
      // Anche il resto da puntare va a multipli di 0,05 €.
      results.push({ newStake: roundStake(newStakeExact) })
    }
    return results
  }, [partialPuntasB, quotaBNum, stakeBExact])

  /* ── Contropuntata parziale C (multi-step, max 6) ── */
  const partialPuntaResultsC = useMemo(() => {
    if (partialPuntasC.length === 0 || quotaCNum == null || stakeCExact == null) return []
    const coverageTarget = stakeCExact * quotaCNum
    type StepResult = { newStake: number }
    const results: (StepResult | null)[] = []
    let coveredSum = 0
    for (let i = 0; i < partialPuntasC.length; i++) {
      const amountNum = parseNum(partialPuntasC[i].amount)
      const newOddsNum = parseNum(partialPuntasC[i].newOdds)
      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }
      const prevOdds = i === 0 ? quotaCNum : parseNum(partialPuntasC[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }
      coveredSum += amountNum * prevOdds
      const newStakeExact = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStakeExact) || newStakeExact < 0) {
        results.push(null)
        break
      }
      // Anche il resto da puntare va a multipli di 0,05 €.
      results.push({ newStake: roundStake(newStakeExact) })
    }
    return results
  }, [partialPuntasC, quotaCNum, stakeCExact])

  const hasValidPartialPuntasB =
    partialPuntasB.length > 0 &&
    partialPuntaResultsB.length > 0 &&
    partialPuntaResultsB.every((r) => r != null)

  const hasValidPartialPuntasC =
    partialPuntasC.length > 0 &&
    partialPuntaResultsC.length > 0 &&
    partialPuntaResultsC.every((r) => r != null)

  const partialPuntaTotalsB = useMemo(() => {
    if (!hasValidPartialPuntasB || stakeB == null) return null
    let totalStakeB = 0
    for (let i = 0; i < partialPuntasB.length; i++) {
      const amount = parseNum(partialPuntasB[i].amount)
      if (amount == null || amount <= 0) return null
      totalStakeB += amount
    }
    const lastResult = partialPuntaResultsB[partialPuntaResultsB.length - 1]
    if (lastResult == null) return null
    totalStakeB += lastResult.newStake
    return { totalStakeB }
  }, [hasValidPartialPuntasB, partialPuntasB, partialPuntaResultsB, stakeB])

  const partialPuntaTotalsC = useMemo(() => {
    if (!hasValidPartialPuntasC || stakeC == null) return null
    let totalStakeC = 0
    for (let i = 0; i < partialPuntasC.length; i++) {
      const amount = parseNum(partialPuntasC[i].amount)
      if (amount == null || amount <= 0) return null
      totalStakeC += amount
    }
    const lastResult = partialPuntaResultsC[partialPuntaResultsC.length - 1]
    if (lastResult == null) return null
    totalStakeC += lastResult.newStake
    return { totalStakeC }
  }, [hasValidPartialPuntasC, partialPuntasC, partialPuntaResultsC, stakeC])

  const effectiveStakeB = partialPuntaTotalsB?.totalStakeB ?? stakeB
  const effectiveStakeC = partialPuntaTotalsC?.totalStakeC ?? stakeC

  const rating = useMemo(() => {
    if (
      quotaANum == null ||
      quotaBNum == null ||
      quotaCNum == null ||
      quotaANum <= 0 ||
      quotaBNum <= 0 ||
      quotaCNum <= 0
    )
      return null
    return ratingPercent(quotaANum, quotaBNum, quotaCNum)
  }, [quotaANum, quotaBNum, quotaCNum])

  const showSummary =
    puntataEffettivaA > 0 &&
    quotaANum != null &&
    quotaANum > 0 &&
    quotaBNum != null &&
    quotaBNum > 0 &&
    quotaCNum != null &&
    quotaCNum > 0 &&
    stakeB != null &&
    stakeC != null

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

  const handleChangeHolderPuntaC = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaC(holderId)
      setAccountsPuntaC([])
      setAccountIdPuntaC('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaC(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  useEffect(() => {
    if (!holderModalOpen || savedBetId) return
    const loadBasics = async () => {
      if (holders.length === 0) await fetchHolders()
      if (books.length === 0) await fetchAllBooks()
    }
    void loadBasics()
  }, [holderModalOpen, savedBetId, holders.length, books.length, fetchHolders, fetchAllBooks])

  const resetModalState = useCallback(() => {
    setHolderIdPuntaA('')
    setHolderIdPuntaB('')
    setHolderIdPuntaC('')
    setAccountsPuntaA([])
    setAccountsPuntaB([])
    setAccountsPuntaC([])
    setAccountIdPuntaA('')
    setAccountIdPuntaB('')
    setAccountIdPuntaC('')
    setHolderModalError(null)
    setSavedBetId(null)
    setCategoria('matched_betting')
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setEventoData(defaultEventoData())
    setHolderModalOpen(true)
  }

  const handleSendToProfitTracker = async () => {
    if (!canSave) return
    if (
      quotaANum == null ||
      quotaBNum == null ||
      quotaCNum == null ||
      stakeB == null ||
      stakeC == null
    )
      return
    const eventoDataIso = new Date(eventoData).toISOString()
    const eventoNomeVal = eventoNome.trim() || 'Tri-Punta'
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
          { label: 'Punta 3', odds: parseNum(quotaC), percent: boostCPct },
        ]),
      }
      const tipoBonusA = rimborsoNum > 0 ? 'rimborso' : bonusNum > 0 ? 'bonus' : 'none'

      const legA: CreateBetLegPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio',
        eventoNome: eventoNomeVal,
        competizione,
        mercato: formatMercatoString(mercatoPuntaA, scopePuntaA) || '—',
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

      // Build legs B — split into multiple legs if partial counter-bets are active
      const legsB: CreateBetLegPayload[] = []
      if (hasValidPartialPuntasB && partialPuntaResultsB.every((r) => r != null)) {
        for (let i = 0; i < partialPuntasB.length; i++) {
          const amount = parseNum(partialPuntasB[i].amount)
          const odds = i === 0 ? quotaBNum : parseNum(partialPuntasB[i - 1].newOdds)
          if (amount == null || odds == null) break
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '—',
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
        const lastResultB = partialPuntaResultsB[partialPuntaResultsB.length - 1]
        const lastNewOddsB = parseNum(partialPuntasB[partialPuntasB.length - 1].newOdds)
        if (lastResultB != null && lastNewOddsB != null) {
          legsB.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '—',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaB,
            stake: lastResultB.newStake,
            quota: lastNewOddsB,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: partialPuntasB.length + 1,
          })
        }
      } else {
        legsB.push({
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: formatMercatoString(mercatoPuntaB, scopePuntaB) || '—',
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

      // Build legs C — split into multiple legs if partial counter-bets are active
      const basePosC = legsB.length + 1
      const legsC: CreateBetLegPayload[] = []
      if (hasValidPartialPuntasC && partialPuntaResultsC.every((r) => r != null)) {
        for (let i = 0; i < partialPuntasC.length; i++) {
          const amount = parseNum(partialPuntasC[i].amount)
          const odds = i === 0 ? quotaCNum : parseNum(partialPuntasC[i - 1].newOdds)
          if (amount == null || odds == null) break
          legsC.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaC, scopePuntaC) || '—',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaC,
            stake: amount,
            quota: odds,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: basePosC + i,
          })
        }
        const lastResultC = partialPuntaResultsC[partialPuntaResultsC.length - 1]
        const lastNewOddsC = parseNum(partialPuntasC[partialPuntasC.length - 1].newOdds)
        if (lastResultC != null && lastNewOddsC != null) {
          legsC.push({
            eventoData: eventoDataIso,
            sport: 'calcio',
            eventoNome: eventoNomeVal,
            competizione,
            mercato: formatMercatoString(mercatoPuntaC, scopePuntaC) || '—',
            metodo: 'punta' as const,
            tipoBonus: 'none',
            accountId: accountIdPuntaC,
            stake: lastResultC.newStake,
            quota: lastNewOddsC,
            rischio: 0,
            bonusValore: undefined,
            rimborsoValore: undefined,
            commissionePercentuale: 0,
            movimento: 0,
            statoEvento: 'bozza',
            tag: undefined as string | undefined,
            posizione: basePosC + partialPuntasC.length,
          })
        }
      } else {
        legsC.push({
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: formatMercatoString(mercatoPuntaC, scopePuntaC) || '—',
          metodo: 'punta' as const,
          tipoBonus: 'none',
          accountId: accountIdPuntaC,
          stake: stakeC,
          quota: quotaCNum,
          rischio: 0,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: 0,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
          posizione: basePosC,
        })
      }

      const legsPayload: CreateBetLegPayload[] = [legA, ...legsB, ...legsC]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  // Partial punta helpers
  const addPartialPuntaB = () => {
    if (partialPuntasB.length < 6)
      setPartialPuntasB((prev) => [...prev, { amount: '', newOdds: '' }])
  }
  const removePartialPuntaB = (index: number) => {
    setPartialPuntasB((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePartialPuntaB = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialPuntasB((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }
  const addPartialPuntaC = () => {
    if (partialPuntasC.length < 6)
      setPartialPuntasC((prev) => [...prev, { amount: '', newOdds: '' }])
  }
  const removePartialPuntaC = (index: number) => {
    setPartialPuntasC((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePartialPuntaC = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialPuntasC((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const realOutlay = (puntataANum ?? 0) + (effectiveStakeB ?? 0) + (effectiveStakeC ?? 0)
  const profitIfAWins =
    quotaANum != null && effectiveStakeB != null && effectiveStakeC != null
      ? puntataEffettivaA * quotaANum - realOutlay
      : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  // Con le contropuntate parziali ogni pezzo della punta 2 o 3 vale alla quota a cui è stato
  // giocato (§14.270): prima tutta la punta andava alla quota iniziale.
  const returnB =
    effectiveStakeB == null || quotaBNum == null
      ? null
      : partialPuntaTotalsB != null
        ? partialCoverReturn(
            quotaBNum,
            partialPuntasB.map((p) => ({
              amount: parseNum(p.amount),
              newOdds: parseNum(p.newOdds),
            })),
            partialPuntaResultsB[partialPuntaResultsB.length - 1]?.newStake ?? null,
          )
        : effectiveStakeB * quotaBNum
  const returnC =
    effectiveStakeC == null || quotaCNum == null
      ? null
      : partialPuntaTotalsC != null
        ? partialCoverReturn(
            quotaCNum,
            partialPuntasC.map((p) => ({
              amount: parseNum(p.amount),
              newOdds: parseNum(p.newOdds),
            })),
            partialPuntaResultsC[partialPuntaResultsC.length - 1]?.newStake ?? null,
          )
        : effectiveStakeC * quotaCNum
  const profitIfBWins =
    returnB != null && effectiveStakeC != null ? returnB - realOutlay + rimborsoNum : null
  const profitIfCWins =
    returnC != null && effectiveStakeB != null ? returnC - realOutlay + rimborsoNum : null

  const guadagnoMinimo = useMemo(() => {
    if (profitIfAWins == null || profitIfBWins == null || profitIfCWins == null) return null
    const minVal = Math.min(profitIfAWins, profitIfBWins, profitIfCWins)
    return Number.isFinite(minVal) ? minVal : null
  }, [profitIfAWins, profitIfBWins, profitIfCWins])

  const crPercent =
    rimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  // Un booleano non ha bisogno di useMemo, e il compilatore di React non riusciva a
  // conservarla (react-hooks/preserve-manual-memoization).
  const canSave =
    eventoNome.trim() !== '' &&
    accountIdPuntaA !== '' &&
    accountIdPuntaB !== '' &&
    accountIdPuntaC !== '' &&
    puntataEffettivaA > 0 &&
    quotaANum != null &&
    quotaBNum != null &&
    quotaCNum != null &&
    stakeB != null &&
    stakeC != null &&
    guadagnoMinimo != null

  const showCr = rimborsoNum > 0 && crPercent != null
  const stakeALoss = bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA
  const profitRows: OutcomeProfitRow[] =
    showSummary &&
    returnA != null &&
    profitIfAWins != null &&
    profitIfBWins != null &&
    profitIfCWins != null
      ? [
          {
            id: 'a',
            esito: 'Se vince la punta 1',
            legs: [
              bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
              -(effectiveStakeB ?? 0),
              -(effectiveStakeC ?? 0),
            ],
            rimborso: 0,
            totale: profitIfAWins,
          },
          {
            id: 'b',
            esito: 'Se vince la punta 2',
            legs: [stakeALoss, (returnB ?? 0) - (effectiveStakeB ?? 0), -(effectiveStakeC ?? 0)],
            rimborso: rimborsoNum,
            totale: profitIfBWins,
          },
          {
            id: 'c',
            esito: 'Se vince la punta 3',
            legs: [stakeALoss, -(effectiveStakeB ?? 0), (returnC ?? 0) - (effectiveStakeC ?? 0)],
            rimborso: rimborsoNum,
            totale: profitIfCWins,
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
            <OutcomeRow
              title="Punta 3"
              odds={
                <CalcNumberField
                  id="quota-c"
                  ariaLabel="Quota della punta 3"
                  size="sm"
                  value={quotaC}
                  onChange={setQuotaC}
                />
              }
              figure={<CalcFigure label="Copertura" live value={amount(stakeC)} />}
            >
              <CalcBoost
                id="boost-c"
                boost={boostC}
                onChange={setBoostC}
                effectiveOdds={boostCPct > 0 ? quotaCNum : null}
                className="col-span-full border-t border-ds-line pt-3"
              />
            </OutcomeRow>

            {stakeB != null && (
              <CalcPartials
                idPrefix="partial-b"
                title="Contropuntata parziale su punta 2"
                amountLabel="Già puntato"
                oddsLabel="Nuova quota punta 2"
                addLabel="Contropuntata parziale su punta 2"
                entries={partialPuntasB}
                results={partialPuntaResultsB}
                figures={(r) => [{ label: 'Nuova punta 2', value: amount(r?.newStake) }]}
                total={
                  hasValidPartialPuntasB && partialPuntaTotalsB != null ? (
                    <>
                      Punta 2 in tutto{' '}
                      <b className="ds-num text-ds-ink">
                        {amount(partialPuntaTotalsB.totalStakeB)}
                      </b>
                    </>
                  ) : undefined
                }
                onAdd={addPartialPuntaB}
                onRemove={removePartialPuntaB}
                onChange={updatePartialPuntaB}
              />
            )}
            {stakeC != null && (
              <CalcPartials
                idPrefix="partial-c"
                title="Contropuntata parziale su punta 3"
                amountLabel="Già puntato"
                oddsLabel="Nuova quota punta 3"
                addLabel="Contropuntata parziale su punta 3"
                entries={partialPuntasC}
                results={partialPuntaResultsC}
                figures={(r) => [{ label: 'Nuova punta 3', value: amount(r?.newStake) }]}
                total={
                  hasValidPartialPuntasC && partialPuntaTotalsC != null ? (
                    <>
                      Punta 3 in tutto{' '}
                      <b className="ds-num text-ds-ink">
                        {amount(partialPuntaTotalsC.totalStakeC)}
                      </b>
                    </>
                  ) : undefined
                }
                onAdd={addPartialPuntaC}
                onRemove={removePartialPuntaC}
                onChange={updatePartialPuntaC}
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
              label="Sbilancia le coperture"
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
          legLabels={['Punta 1', 'Punta 2', 'Punta 3']}
          rows={profitRows}
          stake={puntataANum ?? 0}
          emptyText="Il risultato compare quando la puntata e le quote delle tre punte sono compilate e valide."
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
                  La giocata &egrave; stata salvata correttamente nel Profit Tracker.
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
          ) : (
            <>
              <div className="px-6 pb-1 pt-6">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Salva giocata Tri-Punta
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Compila i dettagli dell&apos;evento e assegna i collaboratori per puntata 1,
                  puntata 2 e puntata 3.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="tp-modal-evento">Nome evento</Label>
                  <Input
                    id="tp-modal-evento"
                    type="text"
                    placeholder="Es. Juventus - Milan"
                    value={eventoNome}
                    onChange={(e) => setEventoNome(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tp-modal-data">Data e ora evento</Label>
                  <Input
                    id="tp-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tp-modal-mercato-a">Mercato Punta 1</Label>
                  <SearchableSelect
                    id="tp-modal-mercato-a"
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
                  <Label htmlFor="tp-modal-mercato-b">Mercato Punta 2</Label>
                  <SearchableSelect
                    id="tp-modal-mercato-b"
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
                <div className="space-y-2">
                  <Label htmlFor="tp-modal-mercato-c">Mercato Punta 3</Label>
                  <SearchableSelect
                    id="tp-modal-mercato-c"
                    placeholder="Seleziona"
                    searchPlaceholder="Cerca mercato..."
                    options={MARKET_OPTIONS}
                    value={mercatoPuntaC}
                    onChange={(v) => {
                      setMercatoPuntaC(v)
                      setScopePuntaC((prev) => (isTeamScopedMarket(v) ? prev || 'CASA' : ''))
                    }}
                    portalContainer={dropdownPortalEl}
                  />
                  {isTeamScopedMarket(mercatoPuntaC) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Squadra</span>
                      <TeamScopeToggle value={scopePuntaC} onChange={setScopePuntaC} />
                    </div>
                  )}
                </div>

                <BetCategorySelect value={categoria} onChange={setCategoria} />

                {/* Collaboratore Punta 1 */}
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
                        Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                </div>

                {/* Collaboratore Punta 2 */}
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
                        Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                </div>

                {/* Collaboratore Punta 3 */}
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <Label className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-primary">
                    Collaboratore Punta 3
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
                    <SearchableSelect
                      id="holder-punta-c"
                      placeholder="Seleziona collaboratore"
                      searchPlaceholder="Cerca collaboratore..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaC}
                      onChange={(val) => void handleChangeHolderPuntaC(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Conto punta 3 (copertura)
                    </Label>
                    <SearchableSelect
                      id="account-punta-c"
                      placeholder={
                        holderIdPuntaC ? 'Seleziona conto' : 'Seleziona prima un collaboratore'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaC.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaC}
                      onChange={setAccountIdPuntaC}
                      disabled={!holderIdPuntaC || accountsPuntaC.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaC && accountsPuntaC.length === 0 && (
                      <p className="rounded-md bg-ds-warning-soft px-3 py-2 text-xs text-ds-warning">
                        Nessun conto punta disponibile per questo collaboratore. Aggiungine uno in
                        Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                </div>

                {showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      Punta A:{' '}
                      <span className="font-mono">{puntataEffettivaA.toFixed(2)} &euro;</span> a
                      quota <span className="font-mono">{quotaANum?.toFixed(2)}</span>
                    </p>
                    {hasValidPartialPuntasB && partialPuntaTotalsB != null ? (
                      <>
                        <p className="mt-1 font-medium text-foreground">Punta B (copertura):</p>
                        {partialPuntasB.map((pp, i) => {
                          const odds = i === 0 ? quotaBNum : parseNum(partialPuntasB[i - 1].newOdds)
                          const amount = parseNum(pp.amount)
                          return (
                            <p key={`pb-${i}`} className="pl-2">
                              &bull; Parziale {i + 1}:{' '}
                              <span className="font-mono">{(amount ?? 0).toFixed(2)} &euro;</span> a
                              quota <span className="font-mono">{odds?.toFixed(2)}</span>
                            </p>
                          )
                        })}
                        {(() => {
                          const lastRes = partialPuntaResultsB[partialPuntaResultsB.length - 1]
                          const lastOdds = parseNum(
                            partialPuntasB[partialPuntasB.length - 1].newOdds,
                          )
                          if (lastRes == null || lastOdds == null) return null
                          return (
                            <p className="pl-2">
                              &bull; Rimanente:{' '}
                              <span className="font-mono">
                                {lastRes.newStake.toFixed(2)} &euro;
                              </span>{' '}
                              a quota <span className="font-mono">{lastOdds.toFixed(2)}</span>
                            </p>
                          )
                        })()}
                        <p className="pl-2 font-medium">
                          Totale B:{' '}
                          <span className="font-mono">
                            {partialPuntaTotalsB.totalStakeB.toFixed(2)} &euro;
                          </span>
                        </p>
                      </>
                    ) : (
                      <p>
                        Punta B (copertura):{' '}
                        <span className="font-mono">{(stakeB ?? 0).toFixed(2)} &euro;</span> a quota{' '}
                        <span className="font-mono">{quotaBNum?.toFixed(2)}</span>
                      </p>
                    )}
                    {hasValidPartialPuntasC && partialPuntaTotalsC != null ? (
                      <>
                        <p className="mt-1 font-medium text-foreground">Punta C (copertura):</p>
                        {partialPuntasC.map((pp, i) => {
                          const odds = i === 0 ? quotaCNum : parseNum(partialPuntasC[i - 1].newOdds)
                          const amount = parseNum(pp.amount)
                          return (
                            <p key={`pc-${i}`} className="pl-2">
                              &bull; Parziale {i + 1}:{' '}
                              <span className="font-mono">{(amount ?? 0).toFixed(2)} &euro;</span> a
                              quota <span className="font-mono">{odds?.toFixed(2)}</span>
                            </p>
                          )
                        })}
                        {(() => {
                          const lastRes = partialPuntaResultsC[partialPuntaResultsC.length - 1]
                          const lastOdds = parseNum(
                            partialPuntasC[partialPuntasC.length - 1].newOdds,
                          )
                          if (lastRes == null || lastOdds == null) return null
                          return (
                            <p className="pl-2">
                              &bull; Rimanente:{' '}
                              <span className="font-mono">
                                {lastRes.newStake.toFixed(2)} &euro;
                              </span>{' '}
                              a quota <span className="font-mono">{lastOdds.toFixed(2)}</span>
                            </p>
                          )
                        })()}
                        <p className="pl-2 font-medium">
                          Totale C:{' '}
                          <span className="font-mono">
                            {partialPuntaTotalsC.totalStakeC.toFixed(2)} &euro;
                          </span>
                        </p>
                      </>
                    ) : (
                      <p>
                        Punta C (copertura):{' '}
                        <span className="font-mono">{(stakeC ?? 0).toFixed(2)} &euro;</span> a quota{' '}
                        <span className="font-mono">{quotaCNum?.toFixed(2)}</span>
                      </p>
                    )}
                    {guadagnoMinimo != null && (
                      <p>
                        Guadagno minimo:{' '}
                        <span className="font-mono">{formatSigned(guadagnoMinimo)} &euro;</span>
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
