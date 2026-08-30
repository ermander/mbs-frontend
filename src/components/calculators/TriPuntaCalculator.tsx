'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2, Send, X } from 'lucide-react'
import {
  ratingPercent,
  stakeBCFromStakeA,
  stakeBCFromStakeARimborso,
} from '@/lib/calculators/tri-punta'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

const TIPOLOGIE = ['NORMALE'] as const

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
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

  const [tipologia, setTipologia] = useState<(typeof TIPOLOGIE)[number]>('NORMALE')
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
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataANum = parseNum(puntataA)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettivaA = (puntataANum ?? 0) + bonusNum
  const quotaANum = parseNum(quotaA)
  const quotaBNum = parseNum(quotaB)
  const quotaCNum = parseNum(quotaC)

  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))
  const imbalanceFactor = 1 + imbalancePercent / 100

  const stakes = useMemo(() => {
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

  const stakeB = stakes?.stakeB ?? null
  const stakeC = stakes?.stakeC ?? null

  /* ── Contropuntata parziale B (multi-step, max 6) ── */
  const partialPuntaResultsB = useMemo(() => {
    if (partialPuntasB.length === 0 || quotaBNum == null || stakeB == null) return []
    const coverageTarget = stakeB * quotaBNum
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
      const newStake = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStake) || newStake < 0) {
        results.push(null)
        break
      }
      results.push({ newStake })
    }
    return results
  }, [partialPuntasB, quotaBNum, stakeB])

  /* ── Contropuntata parziale C (multi-step, max 6) ── */
  const partialPuntaResultsC = useMemo(() => {
    if (partialPuntasC.length === 0 || quotaCNum == null || stakeC == null) return []
    const coverageTarget = stakeC * quotaCNum
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
      const newStake = (coverageTarget - coveredSum) / newOddsNum
      if (!Number.isFinite(newStake) || newStake < 0) {
        results.push(null)
        break
      }
      results.push({ newStake })
    }
    return results
  }, [partialPuntasC, quotaCNum, stakeC])

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

  const showRimborsoColumn = rimborsoNum > 0

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
        nota: undefined as string | undefined,
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
        stake: puntataEffettivaA,
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
  const profitIfBWins =
    effectiveStakeB != null && quotaBNum != null && effectiveStakeC != null
      ? effectiveStakeB * quotaBNum - realOutlay + rimborsoNum
      : null
  const profitIfCWins =
    effectiveStakeC != null && quotaCNum != null && effectiveStakeB != null
      ? effectiveStakeC * quotaCNum - realOutlay + rimborsoNum
      : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  const returnB = effectiveStakeB != null && quotaBNum != null ? effectiveStakeB * quotaBNum : null
  const returnC = effectiveStakeC != null && quotaCNum != null ? effectiveStakeC * quotaCNum : null

  const guadagnoMinimo = useMemo(() => {
    if (profitIfAWins == null || profitIfBWins == null || profitIfCWins == null) return null
    const minVal = Math.min(profitIfAWins, profitIfBWins, profitIfCWins)
    return Number.isFinite(minVal) ? minVal : null
  }, [profitIfAWins, profitIfBWins, profitIfCWins])

  const crPercent =
    rimborsoNum > 0 && guadagnoMinimo != null && Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!accountIdPuntaA || !accountIdPuntaB || !accountIdPuntaC) return false
    if (
      puntataEffettivaA <= 0 ||
      quotaANum == null ||
      quotaBNum == null ||
      quotaCNum == null ||
      stakeB == null ||
      stakeC == null ||
      guadagnoMinimo == null
    )
      return false
    return true
  }, [
    eventoNome,
    accountIdPuntaA,
    accountIdPuntaB,
    accountIdPuntaC,
    puntataEffettivaA,
    quotaANum,
    quotaBNum,
    quotaCNum,
    stakeB,
    stakeC,
    guadagnoMinimo,
  ])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Barra superiore */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Label htmlFor="tipologia" className="text-sm text-muted-foreground">
            Tipologia
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="tipologia"
                variant="secondary"
                size="sm"
                className="min-w-[10rem] justify-between"
              >
                {tipologia}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TIPOLOGIE.map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setTipologia(t)}>
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sezione input */}
      <div className="border-b border-border bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata-a">Puntata A</Label>
            <div className="relative">
              <Input
                id="puntata-a"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntataA}
                onChange={(e) => setPuntataA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                &euro;
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-a">Quota Punta A</Label>
            <div className="relative">
              <Input
                id="quota-a"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaA}
                onChange={(e) => setQuotaA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-b">Quota Punta B</Label>
            <div className="relative">
              <Input
                id="quota-b"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaB}
                onChange={(e) => setQuotaB(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-c">Quota Punta C</Label>
            <div className="relative">
              <Input
                id="quota-c"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaC}
                onChange={(e) => setQuotaC(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus">Saldo bonus (opz.)</Label>
            <div className="relative">
              <Input
                id="bonus"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                &euro;
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rimborso">Valore rimborso</Label>
            <div className="relative">
              <Input
                id="rimborso"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={rimborso}
                onChange={(e) => setRimborso(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                &euro;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Sbilanciamento (-30% … +30%) */}
      <div className="border-b border-border p-4">
        <Label className="mb-2 block">Sbilanciamento delle Puntate B e C</Label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">&minus;30%</span>
          <Slider
            value={[imbalance]}
            onValueChange={([v]) => setImbalance(v ?? 0)}
            min={-30}
            max={30}
            step={0.2}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">+30%</span>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {imbalance === 0
            ? 'Standard (0%)'
            : imbalance > 0
              ? `+${Number.isInteger(imbalance) ? imbalance : imbalance.toFixed(1)}%`
              : `${Number.isInteger(imbalance) ? imbalance : imbalance.toFixed(1)}%`}
        </p>
      </div>

      {/* Riepilogo */}
      {showSummary && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {bonusNum > 0 && rimborsoNum > 0
              ? 'BONUS + RIMBORSO \u2022 '
              : bonusNum > 0
                ? 'BONUS \u2022 '
                : rimborsoNum > 0
                  ? 'RIMBORSO \u2022 '
                  : ''}
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              {rimborsoNum > 0 && crPercent != null
                ? `CR%: ${crPercent.toFixed(2)}%`
                : `Rating: ${rating != null ? rating.toFixed(2) : '\u2014'}%`}
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">
                {formatNum(puntataEffettivaA)} &euro;
              </span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} &euro; bonus)
                </span>
              )}{' '}
              a quota <span className="font-mono">{formatNum(quotaANum)}</span> sul Book A.
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">{formatNum(stakeB)} &euro;</span>{' '}
              a quota <span className="font-mono">{formatNum(quotaBNum)}</span> sul Book B.
            </p>
            {hasValidPartialPuntasB && partialPuntaTotalsB != null && (
              <p>
                <span className="font-medium text-primary">Nuova Puntata B totale:</span>{' '}
                <span className="font-mono text-primary">
                  {formatNum(partialPuntaTotalsB.totalStakeB)} &euro;
                </span>
              </p>
            )}
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">{formatNum(stakeC)} &euro;</span>{' '}
              a quota <span className="font-mono">{formatNum(quotaCNum)}</span> sul Book C.
            </p>
            {hasValidPartialPuntasC && partialPuntaTotalsC != null && (
              <p>
                <span className="font-medium text-primary">Nuova Puntata C totale:</span>{' '}
                <span className="font-mono text-primary">
                  {formatNum(partialPuntaTotalsC.totalStakeC)} &euro;
                </span>
              </p>
            )}
            {guadagnoMinimo != null && (
              <p>
                Il guadagno minimo sar&agrave;{' '}
                <span
                  className={cn(
                    'font-mono',
                    guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive',
                  )}
                >
                  {formatSigned(guadagnoMinimo)} &euro;
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        returnA != null &&
        returnB != null &&
        returnC != null &&
        profitIfAWins != null &&
        profitIfBWins != null &&
        profitIfCWins != null && (
          <div className="border-b border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              {bonusNum > 0 && rimborsoNum > 0
                ? 'BONUS + RIMBORSO \u2022 '
                : bonusNum > 0
                  ? 'BONUS \u2022 '
                  : rimborsoNum > 0
                    ? 'RIMBORSO \u2022 '
                    : ''}
              Tabella dei profitti
            </div>

            {/* Layout a card solo su mobile (< sm) */}
            <div className="block space-y-3 p-4 sm:hidden">
              {/* Card: Se vinci sul Book A */}
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book A:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}{' '}
                      &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))} &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book C</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveStakeC ?? 0))} &euro;
                    </span>
                  </div>
                  {showRimborsoColumn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-muted-foreground">{formatSigned(0)} &euro;</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfAWins)} &euro;
                    </span>
                  </div>
                </div>
              </div>
              {/* Card: Se vinci sul Book B */}
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book B:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)} &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-primary">
                      {formatSigned((returnB ?? 0) - (effectiveStakeB ?? 0))} &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book C</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveStakeC ?? 0))} &euro;
                    </span>
                  </div>
                  {showRimborsoColumn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-primary">{formatSigned(rimborsoNum)} &euro;</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfBWins)} &euro;
                    </span>
                  </div>
                </div>
              </div>
              {/* Card: Se vinci sul Book C */}
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book C:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)} &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))} &euro;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book C</span>
                    <span className="text-primary">
                      {formatSigned((returnC ?? 0) - (effectiveStakeC ?? 0))} &euro;
                    </span>
                  </div>
                  {showRimborsoColumn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-primary">{formatSigned(rimborsoNum)} &euro;</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfCWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfCWins)} &euro;
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella da sm in su */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[30%] p-3 text-left font-normal'
                          : 'w-[36%] p-3 text-left font-normal'
                      }
                    ></th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[12%] p-3 text-right font-normal'
                          : 'w-[13%] p-3 text-right font-normal'
                      }
                    >
                      Book A
                    </th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[12%] p-3 text-right font-normal'
                          : 'w-[13%] p-3 text-right font-normal'
                      }
                    >
                      Book B
                    </th>
                    <th
                      className={
                        showRimborsoColumn
                          ? 'w-[12%] p-3 text-right font-normal'
                          : 'w-[13%] p-3 text-right font-normal'
                      }
                    >
                      Book C
                    </th>
                    {showRimborsoColumn && (
                      <th className="w-[12%] p-3 text-right font-normal">Rimborso</th>
                    )}
                    <th className="w-[18%] min-w-[5.5rem] p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book A:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveStakeC ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-muted-foreground">{formatSigned(0)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfAWins)} &euro;
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book B:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned((returnB ?? 0) - (effectiveStakeB ?? 0))}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveStakeC ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-primary">{formatSigned(rimborsoNum)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfBWins)} &euro;
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book C:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(effectiveStakeB ?? 0))}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned((returnC ?? 0) - (effectiveStakeC ?? 0))}
                    </td>
                    {showRimborsoColumn && (
                      <td className="p-3 text-right text-primary">{formatSigned(rimborsoNum)}</td>
                    )}
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfCWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfCWins)} &euro;
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Contropuntata parziale B (multi-step) */}
      {stakeB != null && (
        <div className="border-b border-border p-4">
          <div className="space-y-3">
            {partialPuntasB.map((pp, i) => {
              const result = partialPuntaResultsB[i] ?? null
              return (
                <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Contropuntata parziale B {partialPuntasB.length > 1 ? `#${i + 1}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePartialPuntaB(i)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`partial-b-amount-${i}`} className="text-xs sm:text-sm">
                        Gi&agrave; puntato &euro;
                      </Label>
                      <Input
                        id={`partial-b-amount-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.amount}
                        onChange={(e) => updatePartialPuntaB(i, 'amount', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`partial-b-odds-${i}`} className="text-xs sm:text-sm">
                        Nuova quota punta B
                      </Label>
                      <Input
                        id={`partial-b-odds-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.newOdds}
                        onChange={(e) => updatePartialPuntaB(i, 'newOdds', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                  </div>
                  {result != null && (
                    <div className="mt-3 rounded-lg bg-background/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Nuova puntata B
                      </p>
                      <p className="font-mono text-sm font-semibold text-primary">
                        {formatNum(result.newStake)} &euro;
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {partialPuntasB.length < 6 && (
              <button
                type="button"
                onClick={addPartialPuntaB}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="text-base leading-none">+</span>
                Contropuntata parziale B
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contropuntata parziale C (multi-step) */}
      {stakeC != null && (
        <div className="border-b border-border p-4">
          <div className="space-y-3">
            {partialPuntasC.map((pp, i) => {
              const result = partialPuntaResultsC[i] ?? null
              return (
                <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Contropuntata parziale C {partialPuntasC.length > 1 ? `#${i + 1}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePartialPuntaC(i)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`partial-c-amount-${i}`} className="text-xs sm:text-sm">
                        Gi&agrave; puntato &euro;
                      </Label>
                      <Input
                        id={`partial-c-amount-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.amount}
                        onChange={(e) => updatePartialPuntaC(i, 'amount', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`partial-c-odds-${i}`} className="text-xs sm:text-sm">
                        Nuova quota punta C
                      </Label>
                      <Input
                        id={`partial-c-odds-${i}`}
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={pp.newOdds}
                        onChange={(e) => updatePartialPuntaC(i, 'newOdds', e.target.value)}
                        className="h-8 sm:h-9"
                      />
                    </div>
                  </div>
                  {result != null && (
                    <div className="mt-3 rounded-lg bg-background/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Nuova puntata C
                      </p>
                      <p className="font-mono text-sm font-semibold text-primary">
                        {formatNum(result.newStake)} &euro;
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {partialPuntasC.length < 6 && (
              <button
                type="button"
                onClick={addPartialPuntaC}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="text-base leading-none">+</span>
                Contropuntata parziale C
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invia al Profit Tracker */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={handleOpenModal} variant="default" disabled={!showSummary}>
          Invia al Profit Tracker
        </Button>
      </div>

      {/* Modale: Assegna intestatari e dati evento */}
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
                  Compila i dettagli dell&apos;evento e assegna gli intestatari per puntata 1,
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

                {/* Intestatario Punta 1 */}
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                      Intestatario Punta 1
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-a"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
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
                        holderIdPuntaA ? 'Seleziona conto' : 'Seleziona prima un intestatario'
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
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                </div>

                {/* Intestatario Punta 2 */}
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 2
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-b"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
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
                        holderIdPuntaB ? 'Seleziona conto' : 'Seleziona prima un intestatario'
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
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                </div>

                {/* Intestatario Punta 3 */}
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 3
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-c"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
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
                        holderIdPuntaC ? 'Seleziona conto' : 'Seleziona prima un intestatario'
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
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
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
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
