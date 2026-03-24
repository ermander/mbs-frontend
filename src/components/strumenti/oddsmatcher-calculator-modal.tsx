'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getImbalanceFactor,
  layStakeRimborso,
  layStakeWithImbalance,
  liability,
  minGain,
} from '@/lib/calculators/punta-banca'
import { getAccounts } from '@/services/api/profit-tracker-client'
import type { Account } from '@/types/profit-tracker'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { OddsmatcherRow } from '@/types/oddsmatcher'
import { Calendar, Loader2, Send, X } from 'lucide-react'
import Link from 'next/link'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { SearchableSelect } from '@/components/ui/searchable-select'

function formatModalDate(date: string, hour: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} - ${hour}`
}

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

function getBookName(id: string): string {
  return ODDSMATCHER_BOOKS.find((b) => b.id === id)?.name ?? '—'
}

/** Match Oddsmatcher book name (e.g. "Bet365") to Profit Tracker book (e.g. "Bet365.it") */
function findBookIdByOddsmatcherName(
  books: { id: string; nome: string }[],
  name: string,
): string | null {
  const lower = name.toLowerCase().trim()
  const found = books.find(
    (b) =>
      b.nome.toLowerCase() === lower ||
      b.nome.toLowerCase().replace(/\.it$/, '') === lower ||
      b.nome.toLowerCase().startsWith(lower),
  )
  return found?.id ?? null
}

export interface OddsmatcherCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: OddsmatcherRow | null
  /** Valore precompilato per il campo Puntata (condiviso con la barra filtri Oddsmatcher). */
  defaultPuntata?: string
  /** Valore precompilato per il campo Bonus (condiviso con la barra filtri Oddsmatcher). */
  defaultBonus?: string
}

export function OddsmatcherCalculatorModal({
  open,
  onOpenChange,
  row,
  defaultPuntata = '',
  defaultBonus = '',
}: OddsmatcherCalculatorModalProps) {
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [commissione, setCommissione] = useState('3')
  const [rimborso, setRimborso] = useState('')
  const [bonus, setBonus] = useState('')
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [quotaBanca, setQuotaBanca] = useState('')
  const [imbalance, setImbalance] = useState(0)
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null)

  const [partialLays, setPartialLays] = useState<{ amount: string; newOdds: string }[]>([])

  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
  const [accountIdPunta, setAccountIdPunta] = useState<string>('')
  const [accountIdBanca, setAccountIdBanca] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [holderPortalEl, setHolderPortalEl] = useState<HTMLDivElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && row) {
      const back = row.back_odd
      const lay = row.lay_odd
      queueMicrotask(() => {
        setQuotaPunta(back)
        setQuotaBanca(lay)
        setPuntata(defaultPuntata)
        setBonus(defaultBonus)
      })
    }
  }, [open, row, defaultPuntata, defaultBonus])

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      setCommissione('3')
      setImbalance(0)
      setRimborso('')
      setBonus('')
      setPuntata('')
      setQuotaPunta('')
      setQuotaBanca('')
      setAgendaMessage(null)
      setPartialLays([])
      setAccountIdPunta('')
      setAccountIdBanca('')
      setHolderModalOpen(false)
    }
    wasOpenRef.current = open
  }, [open])

  const bookNamePunta = row ? getBookName(row.id_book_1) : ''
  const bookNameBanca = row ? getBookName(row.id_book_2) : ''

  const loadHolderOptions = useCallback(async () => {
    if (!row) return
    if (holders.length === 0) {
      await fetchHolders()
    }
    let resolvedBooks = books
    if (resolvedBooks.length === 0) {
      await fetchBooks()
      resolvedBooks = useProfitTrackerStore.getState().books
    }
    const puntaBookId = findBookIdByOddsmatcherName(resolvedBooks, bookNamePunta)
    const bancaBookId = findBookIdByOddsmatcherName(resolvedBooks, bookNameBanca)
    if (puntaBookId) {
      const res = await getAccounts({ bookId: puntaBookId })
      setAccountsPunta(res.items)
    } else {
      setAccountsPunta([])
    }
    if (bancaBookId) {
      const res = await getAccounts({ bookId: bancaBookId })
      setAccountsBanca(res.items)
    } else {
      setAccountsBanca([])
    }
    setHolderModalError(null)
    setSavedBetId(null)
  }, [row, bookNamePunta, bookNameBanca, books, fetchBooks, holders.length, fetchHolders])

  useEffect(() => {
    if (holderModalOpen) {
      setAccountIdPunta('')
      setAccountIdBanca('')
    }
  }, [holderModalOpen])

  useEffect(() => {
    if (holderModalOpen && row) {
      void loadHolderOptions()
    }
  }, [holderModalOpen, row, loadHolderOptions])

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)

  const isRimborso = rimborsoNum > 0

  const layStakeValue = useMemo(() => {
    if (quotaPuntaNum == null || quotaBancaNum == null) return null
    if (puntataNum == null || puntataNum <= 0) return null

    const backStake = puntataNum + bonusNum
    if (backStake <= 0) return null

    if (isRimborso) {
      // Rimborso integrato: L = ((S+B)*Qp - R) / (Ql - c/100) * factor(imbalance)
      const base = layStakeRimborso(
        backStake,
        quotaPuntaNum,
        rimborsoNum,
        quotaBancaNum,
        commissioneNum,
      )
      if (base == null) return null
      const adjusted = base * getImbalanceFactor(imbalance)
      return Number.isFinite(adjusted) ? adjusted : null
    }

    // Normale: con o senza bonus, con sbilanciamento
    return layStakeWithImbalance(backStake, quotaPuntaNum, quotaBancaNum, commissioneNum, imbalance)
  }, [
    puntataNum,
    bonusNum,
    rimborsoNum,
    isRimborso,
    quotaPuntaNum,
    quotaBancaNum,
    commissioneNum,
    imbalance,
  ])

  /** Bancata arrotondata a 2 decimali: usata per responsabilità e totali tabella PROFITTI (come nel calcolatore di riferimento). */
  const layStakeRounded = useMemo(() => {
    if (layStakeValue == null || !Number.isFinite(layStakeValue)) return null
    return Math.round(layStakeValue * 100) / 100
  }, [layStakeValue])

  const responsabilita = useMemo(() => {
    if (layStakeRounded == null || quotaBancaNum == null) return null
    return liability(layStakeRounded, quotaBancaNum)
  }, [layStakeRounded, quotaBancaNum])

  const effectiveExchangeProfit = useMemo(() => {
    if (layStakeValue == null) return null
    return layStakeValue * (1 - commissioneNum / 100)
  }, [layStakeValue, commissioneNum])

  /** Profitto exchange arrotondato a 2 decimali (per totali tabella: "se vinci la bancata" = -puntata + questo). */
  const effectiveExchangeProfitRounded = useMemo(() => {
    if (layStakeRounded == null) return null
    const raw = layStakeRounded * (1 - commissioneNum / 100)
    return Math.round(raw * 100) / 100
  }, [layStakeRounded, commissioneNum])

  const baseMinGain = useMemo(() => {
    if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || responsabilita == null)
      return null
    return minGain(puntataNum, quotaPuntaNum, responsabilita)
  }, [puntataNum, quotaPuntaNum, responsabilita])

  /* ── Bancata parziale (multi-step, max 6) ── */
  const partialLayResults = useMemo(() => {
    if (
      partialLays.length === 0 ||
      quotaPuntaNum == null ||
      quotaBancaNum == null ||
      layStakeValue == null
    )
      return []

    const c = commissioneNum / 100

    // Il target totale di copertura è derivato dalla bancata già sbilanciata:
    // layStakeValue include già l'imbalance, quindi target = layStakeValue * (Ql - c)
    const coverageTarget = layStakeValue * (quotaBancaNum - c)

    type StepResult = {
      newLayStake: number
      newLiability: number
    }

    const results: (StepResult | null)[] = []
    let coveredSum = 0

    for (let i = 0; i < partialLays.length; i++) {
      const amountNum = parseNum(partialLays[i].amount)
      const newOddsNum = parseNum(partialLays[i].newOdds)

      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break
      }

      const prevOdds = i === 0 ? quotaBancaNum : parseNum(partialLays[i - 1].newOdds)
      if (prevOdds == null) {
        results.push(null)
        break
      }

      coveredSum += amountNum * (prevOdds - c)

      const denominator = newOddsNum - c
      if (denominator <= 0) {
        results.push(null)
        break
      }

      const newLayStake = (coverageTarget - coveredSum) / denominator
      if (!Number.isFinite(newLayStake) || newLayStake < 0) {
        results.push(null)
        break
      }

      const newLiability = newLayStake * (newOddsNum - 1)
      results.push({ newLayStake, newLiability })
    }

    return results
  }, [partialLays, quotaPuntaNum, quotaBancaNum, layStakeValue, commissioneNum])

  /** Quando ci sono bancate parziali valide, calcola responsabilità e profitto exchange reali */
  const hasValidPartialLays =
    partialLays.length > 0 &&
    partialLayResults.length > 0 &&
    partialLayResults.every((r) => r != null)

  const partialLayTotals = useMemo(() => {
    if (!hasValidPartialLays || quotaBancaNum == null) return null

    const c = commissioneNum / 100
    let totalLiability = 0
    let totalLayStake = 0

    // Ogni "già bancato" è stato piazzato alla quota dello step precedente
    for (let i = 0; i < partialLays.length; i++) {
      const amount = parseNum(partialLays[i].amount)
      if (amount == null || amount <= 0) return null
      const odds = i === 0 ? quotaBancaNum : parseNum(partialLays[i - 1].newOdds)
      if (odds == null) return null
      totalLiability += amount * (odds - 1)
      totalLayStake += amount
    }

    // L'ultimo step calcolato è l'importo ancora da piazzare
    const lastResult = partialLayResults[partialLayResults.length - 1]
    if (lastResult == null) return null
    totalLiability += lastResult.newLiability
    totalLayStake += lastResult.newLayStake

    const totalExchangeProfit = Math.round(totalLayStake * (1 - c) * 100) / 100
    totalLiability = Math.round(totalLiability * 100) / 100

    return { totalLiability, totalExchangeProfit, totalLayStake }
  }, [hasValidPartialLays, partialLays, partialLayResults, quotaBancaNum, commissioneNum])

  // Valori effettivi: usano parziali se disponibili, altrimenti singola bancata
  const effResponsabilita = partialLayTotals?.totalLiability ?? responsabilita
  const effExchangeProfit =
    partialLayTotals?.totalExchangeProfit ??
    effectiveExchangeProfitRounded ??
    effectiveExchangeProfit

  const totalSeVinciPuntata = useMemo(() => {
    if (puntataNum == null || quotaPuntaNum == null || effResponsabilita == null) return null
    const backStake = puntataNum + bonusNum
    return backStake * quotaPuntaNum - puntataNum - effResponsabilita
  }, [puntataNum, quotaPuntaNum, effResponsabilita, bonusNum])

  const totalSeVinciBancata = useMemo(() => {
    if (effExchangeProfit == null) return null
    return -(puntataNum ?? 0) + effExchangeProfit + rimborsoNum
  }, [puntataNum, rimborsoNum, effExchangeProfit])

  const guadagnoMinimo = useMemo(() => {
    if (totalSeVinciPuntata == null || totalSeVinciBancata == null) return null
    const v = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(v) ? v : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const ratingSeVinciPuntata = useMemo(() => {
    if (puntataEffettiva <= 0 || totalSeVinciPuntata == null) return null
    const num = totalSeVinciPuntata + (puntataNum ?? 0)
    const pct = (num / puntataEffettiva) * 100
    return Number.isFinite(pct) ? pct : null
  }, [puntataEffettiva, totalSeVinciPuntata, puntataNum])

  const ratingSeVinciBancata = useMemo(() => {
    if (puntataEffettiva <= 0 || effExchangeProfit == null) return null
    const pct = (effExchangeProfit / puntataEffettiva) * 100
    return Number.isFinite(pct) ? pct : null
  }, [puntataEffettiva, effExchangeProfit])

  const addPartialLay = () => {
    if (partialLays.length < 6) {
      setPartialLays((prev) => [...prev, { amount: '', newOdds: '' }])
    }
  }

  const removePartialLay = (index: number) => {
    setPartialLays((prev) => prev.filter((_, i) => i !== index))
  }

  const updatePartialLay = (index: number, field: 'amount' | 'newOdds', value: string) => {
    setPartialLays((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const showSummary =
    puntataNum != null &&
    puntataNum > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStakeValue != null &&
    responsabilita != null

  const handleOpenHolderModal = () => {
    setHolderModalOpen(true)
  }

  const eventoDataIso =
    row && row.date && row.hour
      ? new Date(`${row.date}T${row.hour.replace('.', ':')}:00`).toISOString()
      : new Date().toISOString()
  const eventoNome = row ? `${row.home} vs ${row.away}` : ''
  const competizione = row?.competition ?? ''
  const mercato = row?.market ?? ''
  const selezione = row?.selection ?? ''

  const tipoBonus = isRimborso ? 'rimborso' : 'none'

  const handleSendToProfitTracker = async () => {
    if (!row || !accountIdPunta || !accountIdBanca) {
      setHolderModalError("Seleziona sia l'intestatario punta sia l'intestatario banca.")
      return
    }
    if (
      puntataEffettiva <= 0 ||
      quotaPuntaNum == null ||
      quotaBancaNum == null ||
      layStakeValue == null ||
      responsabilita == null ||
      guadagnoMinimo == null
    ) {
      return
    }

    // Validazione bancate parziali: se presenti, tutti i risultati devono essere validi
    const hasPartialLays = partialLays.length > 0
    if (hasPartialLays) {
      const allValid = partialLays.every((_, i) => partialLayResults[i] != null)
      if (!allValid) {
        setHolderModalError('Completa tutti i campi delle bancate parziali prima di salvare.')
        return
      }
    }

    setIsSaving(true)
    setHolderModalError(null)
    try {
      const betPayload = {
        eventoData: eventoDataIso,
        source: 'oddsmatcher' as const,
        sport: 'calcio' as const,
        eventoNome,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPunta,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }

      const bancaLegBase = {
        eventoData: eventoDataIso,
        sport: 'calcio',
        eventoNome,
        competizione,
        mercato,
        selezione,
        metodo: 'banca' as const,
        tipoBonus,
        accountId: accountIdBanca,
        quotaRiferimento: quotaPuntaNum,
        bonusValore: undefined,
        rimborsoValore: undefined,
        commissionePercentuale: commissioneNum,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
      }

      const puntaLeg = {
        eventoData: eventoDataIso,
        sport: 'calcio',
        eventoNome,
        competizione,
        mercato,
        selezione,
        metodo: 'punta' as const,
        tipoBonus,
        accountId: accountIdPunta,
        stake: puntataEffettiva,
        quota: quotaPuntaNum,
        rischio: 0,
        bonusValore: undefined,
        rimborsoValore: isRimborso ? rimborsoNum : undefined,
        commissionePercentuale: commissioneNum,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
      }

      let bancaLegs: (typeof bancaLegBase & { stake: number; quota: number; rischio: number })[]

      if (hasPartialLays) {
        bancaLegs = []

        // Ogni "già bancato" è stato piazzato alla quota dello step precedente
        for (let i = 0; i < partialLays.length; i++) {
          const amount = parseNum(partialLays[i].amount) ?? 0
          const odds = i === 0 ? quotaBancaNum : parseNum(partialLays[i - 1].newOdds)!
          bancaLegs.push({
            ...bancaLegBase,
            stake: amount,
            quota: odds,
            rischio: amount * (odds - 1),
          })
        }

        // Ultimo step: importo calcolato ancora da piazzare
        const lastResult = partialLayResults[partialLayResults.length - 1]!
        const lastOdds = parseNum(partialLays[partialLays.length - 1].newOdds)!
        bancaLegs.push({
          ...bancaLegBase,
          stake: lastResult.newLayStake,
          quota: lastOdds,
          rischio: lastResult.newLiability,
        })
      } else {
        // Caso standard: singola bancata
        bancaLegs = [
          {
            ...bancaLegBase,
            stake: layStakeValue,
            quota: quotaBancaNum,
            rischio: responsabilita,
          },
        ]
      }

      const legsPayload = [puntaLeg, ...bancaLegs]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      if (process.env.NODE_ENV !== 'production') {
        await new Promise((r) => setTimeout(r, 1000))
      }
      setSavedBetId(bet.id)
      setAgendaMessage('Giocata salvata nel Profit Tracker.')
      setTimeout(() => setAgendaMessage(null), 3000)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  if (!row) return null

  const bookName = getBookName(row.id_book_1)
  const exchangeName = getBookName(row.id_book_2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[100dvh] max-w-2xl overflow-y-auto overflow-x-hidden p-0 sm:max-h-[90vh]"
        showClose={true}
      >
        <DialogTitle asChild>
          <VisuallyHidden>Calcolatore Punta-Banca</VisuallyHidden>
        </DialogTitle>

        <div className="flex min-w-0 flex-col overflow-hidden">
          {/* Evento header */}
          <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:gap-x-3 sm:text-sm">
              <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                {row.competition}
              </span>
              <span className="font-medium text-foreground">
                {row.home} <span className="text-muted-foreground">vs</span> {row.away}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatModalDate(row.date, row.hour)}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:space-y-5 sm:p-5">
            {/* PUNTA e BANCA */}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                      Punta
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {row.market} · {row.selection}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={`/loghi_book/${row.id_book_1}.png`}
                      alt=""
                      width={80}
                      height={28}
                      className="h-7 w-auto max-w-[80px] object-contain"
                    />
                  </div>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaPunta}
                  onChange={(e) => setQuotaPunta(sanitizeDecimal(e.target.value))}
                  className="mt-2 h-9 text-base font-semibold sm:h-10 sm:text-lg"
                />
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-destructive">
                      Banca
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {row.market} · {row.selection}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Image
                      src={`/loghi_book/${row.id_book_2}.png`}
                      alt=""
                      width={80}
                      height={28}
                      className="h-7 w-auto max-w-[80px] object-contain"
                    />
                  </div>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaBanca}
                  onChange={(e) => setQuotaBanca(sanitizeDecimal(e.target.value))}
                  className="mt-2 h-9 text-base font-semibold sm:h-10 sm:text-lg"
                />
              </div>
            </div>

            {/* Importi e risultati */}
            <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Importi e risultati
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="space-y-1">
                  <Label htmlFor="modal-puntata" className="text-xs sm:text-sm">
                    Puntata €
                  </Label>
                  <Input
                    id="modal-puntata"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={puntata}
                    onChange={(e) => setPuntata(sanitizeDecimal(e.target.value))}
                    className="h-8 sm:h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-bonus" className="text-xs sm:text-sm">
                    Bonus € (opz.)
                  </Label>
                  <Input
                    id="modal-bonus"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={bonus}
                    onChange={(e) => setBonus(sanitizeDecimal(e.target.value))}
                    className="h-8 sm:h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-rimborso" className="text-xs sm:text-sm">
                    Rimborso € (opz.)
                  </Label>
                  <Input
                    id="modal-rimborso"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={rimborso}
                    onChange={(e) => setRimborso(sanitizeDecimal(e.target.value))}
                    className="h-8 sm:h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-commissione" className="text-xs sm:text-sm">
                    Comm. %
                  </Label>
                  <Input
                    id="modal-commissione"
                    type="text"
                    inputMode="decimal"
                    placeholder="3"
                    value={commissione}
                    onChange={(e) => setCommissione(sanitizeDecimal(e.target.value))}
                    className="h-8 sm:h-9"
                  />
                </div>
              </div>
              {/* Sbilanciamento bancata */}
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Sbilanciamento bancata
                  </p>
                  <span className="font-mono text-xs font-medium text-foreground">
                    {imbalance > 0 ? '+' : ''}
                    {imbalance.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  step={0.5}
                  value={imbalance}
                  onChange={(e) => setImbalance(Number.parseFloat(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
                  <span>-20%</span>
                  <span>0%</span>
                  <span>+20%</span>
                </div>
              </div>
              {/* Risultati inline */}
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-background/60 p-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Bancata
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {layStakeValue != null ? formatNum(layStakeValue) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Rischio
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {responsabilita != null ? formatNum(responsabilita) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Guadagno min
                  </p>
                  <p
                    className={cn(
                      'font-mono text-sm font-semibold',
                      guadagnoMinimo != null && guadagnoMinimo >= 0
                        ? 'text-emerald-400'
                        : guadagnoMinimo != null && guadagnoMinimo < 0
                          ? 'text-destructive'
                          : 'text-foreground',
                    )}
                  >
                    {guadagnoMinimo != null ? `€${formatNum(guadagnoMinimo)}` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bancata parziale */}
            {layStakeValue != null && (
              <div className="space-y-3">
                {partialLays.map((pl, i) => {
                  const result = partialLayResults[i] ?? null
                  return (
                    <div key={i} className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Bancata parziale {partialLays.length > 1 ? `#${i + 1}` : ''}
                        </p>
                        <button
                          type="button"
                          onClick={() => removePartialLay(i)}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`modal-partial-amount-${i}`}
                            className="text-xs sm:text-sm"
                          >
                            Già bancato €
                          </Label>
                          <Input
                            id={`modal-partial-amount-${i}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={pl.amount}
                            onChange={(e) =>
                              updatePartialLay(i, 'amount', sanitizeDecimal(e.target.value))
                            }
                            className="h-8 sm:h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`modal-partial-odds-${i}`} className="text-xs sm:text-sm">
                            Nuova quota banca
                          </Label>
                          <Input
                            id={`modal-partial-odds-${i}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={pl.newOdds}
                            onChange={(e) =>
                              updatePartialLay(i, 'newOdds', sanitizeDecimal(e.target.value))
                            }
                            className="h-8 sm:h-9"
                          />
                        </div>
                      </div>
                      {result != null && (
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-2.5">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Nuova bancata
                            </p>
                            <p className="font-mono text-sm font-semibold text-destructive">
                              €{formatNum(result.newLayStake)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Nuova resp.
                            </p>
                            <p className="font-mono text-sm font-semibold">
                              €{formatNum(result.newLiability)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {partialLays.length < 6 && (
                  <button
                    type="button"
                    onClick={addPartialLay}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <span className="text-base leading-none">+</span>
                    Bancata parziale
                  </button>
                )}
              </div>
            )}

            {/* Profitti — mobile: stacked cards, desktop: table */}
            {showSummary && guadagnoMinimo != null && (
              <>
                {/* Mobile: compact stacked */}
                <div className="space-y-2 sm:hidden">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Profitti
                  </p>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Vinci puntata</p>
                      <p className="text-xs text-muted-foreground">
                        {ratingSeVinciPuntata != null ? `${formatNum(ratingSeVinciPuntata)}%` : ''}
                      </p>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="flex gap-3">
                        <span className="font-mono text-xs text-primary">
                          {formatSigned(
                            ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) -
                              (puntataNum ?? 0),
                          )}
                        </span>
                        <span className="font-mono text-xs text-destructive">
                          {formatSigned(-(effResponsabilita ?? 0))}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {totalSeVinciPuntata != null
                          ? `${formatSigned(totalSeVinciPuntata)}€`
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Vinci bancata</p>
                      <p className="text-xs text-muted-foreground">
                        {ratingSeVinciBancata != null ? `${formatNum(ratingSeVinciBancata)}%` : ''}
                      </p>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="flex gap-3">
                        <span className="font-mono text-xs text-destructive">
                          {formatSigned(-(puntataNum ?? 0))}
                        </span>
                        <span className="font-mono text-xs text-primary">
                          {effExchangeProfit != null ? formatSigned(effExchangeProfit) : '—'}
                        </span>
                        {isRimborso && (
                          <span className="font-mono text-xs text-primary">
                            {formatSigned(rimborsoNum)}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {totalSeVinciBancata != null
                          ? `${formatSigned(totalSeVinciBancata)}€`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop: full table */}
                <div className="hidden rounded-xl border border-border sm:block">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Profitti
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" />
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            {bookName}
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            {exchangeName}
                          </th>
                          {isRimborso && (
                            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                              Rimborso
                            </th>
                          )}
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            Totale
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            Rating
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50 bg-primary/5">
                          <td className="px-4 py-2.5 text-muted-foreground">
                            se vinci la puntata su {bookName}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-primary">
                            {formatSigned(
                              ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) -
                                (puntataNum ?? 0),
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-destructive">
                            {formatSigned(-(effResponsabilita ?? 0))}
                          </td>
                          {isRimborso && (
                            <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
                          )}
                          <td className="px-4 py-2.5 text-right font-semibold">
                            {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'}{' '}
                            €
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            {ratingSeVinciPuntata != null
                              ? `${formatNum(ratingSeVinciPuntata)}%`
                              : '—'}
                          </td>
                        </tr>
                        <tr className="bg-destructive/5">
                          <td className="px-4 py-2.5 text-muted-foreground">
                            se vinci la bancata su {exchangeName}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-destructive">
                            {formatSigned(-(puntataNum ?? 0))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-primary">
                            {effExchangeProfit != null ? formatSigned(effExchangeProfit) : '—'}
                          </td>
                          {isRimborso && (
                            <td className="px-4 py-2.5 text-right font-medium text-primary">
                              {formatSigned(rimborsoNum)}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right font-semibold">
                            {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'}{' '}
                            €
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            {ratingSeVinciBancata != null
                              ? `${formatNum(ratingSeVinciBancata)}%`
                              : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Footer: unico bottone full-width */}
            <div className="border-t border-border pt-4">
              <Button
                variant="success"
                className="w-full"
                onClick={handleOpenHolderModal}
                disabled={
                  puntataEffettiva <= 0 ||
                  quotaPuntaNum == null ||
                  quotaBancaNum == null ||
                  layStakeValue == null
                }
              >
                Invia scommessa al Profit Tracker
              </Button>
            </div>
            {agendaMessage && (
              <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {agendaMessage}
              </p>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Sub-modale: Assegna intestatari punta e banca */}
      <Dialog
        open={holderModalOpen}
        onOpenChange={(open) => {
          setHolderModalOpen(open)
          if (!open) setSavedBetId(null)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0" showClose={true}>
          {/* Portal container per dropdown SearchableSelect dentro la modale */}
          <div
            ref={setHolderPortalEl}
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
                    onOpenChange(false)
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
                  Assegna intestatari
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Scegli l&apos;intestatario per la puntata (book) e per la bancata (exchange).
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Potrai aggiungere altre puntate o bancate dalla pagina dettaglio della giocata.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                {/* Card Punta */}
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                      Intestatario Punta
                    </Label>
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {bookNamePunta || '—'}
                    </span>
                  </div>
                  <SearchableSelect
                    options={accountsPunta.map((acc) => {
                      const holder = holders.find((h) => h.id === acc.holderId)
                      return { value: acc.id, label: holder?.nome ?? acc.nome }
                    })}
                    value={accountIdPunta}
                    onChange={setAccountIdPunta}
                    placeholder="Seleziona intestatario"
                    searchPlaceholder="Cerca intestatario..."
                    allowEmpty={false}
                    portalContainer={holderPortalEl}
                  />
                  {accountsPunta.length === 0 && bookNamePunta && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto con {bookNamePunta}. Aggiungine uno in Profit Tracker → Conti.
                    </p>
                  )}
                </div>

                {/* Card Banca */}
                <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-destructive">
                      Intestatario Banca
                    </Label>
                    <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                      {bookNameBanca || '—'}
                    </span>
                  </div>
                  <SearchableSelect
                    options={accountsBanca.map((acc) => {
                      const holder = holders.find((h) => h.id === acc.holderId)
                      return { value: acc.id, label: holder?.nome ?? acc.nome }
                    })}
                    value={accountIdBanca}
                    onChange={setAccountIdBanca}
                    placeholder="Seleziona intestatario"
                    searchPlaceholder="Cerca intestatario..."
                    allowEmpty={false}
                    portalContainer={holderPortalEl}
                  />
                  {accountsBanca.length === 0 && bookNameBanca && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto con {bookNameBanca}. Aggiungine uno in Profit Tracker → Conti.
                    </p>
                  )}
                </div>
              </div>

              {holderModalError && (
                <div className="mx-6 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-sm text-destructive">{holderModalError}</p>
                </div>
              )}

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
                  onClick={handleSendToProfitTracker}
                  disabled={isSaving || !accountIdPunta || !accountIdBanca}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Invia
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
