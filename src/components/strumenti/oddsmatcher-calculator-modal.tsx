'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  layStakeRimborso,
  layStakeWithImbalance,
  liability,
  minGain,
} from '@/lib/calculators/punta-banca'
import type { TipologiaCalcolo } from '@/stores/agenda-store'
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

  const [tipologia, setTipologia] = useState<TipologiaCalcolo>('NORMALE')
  const [commissione, setCommissione] = useState('3')
  const [rimborso, setRimborso] = useState('')
  const [bonus, setBonus] = useState('')
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [quotaBanca, setQuotaBanca] = useState('')
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
      setTipologia('NORMALE')
      setCommissione('3')
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

  const layStakeValue = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || quotaBancaNum == null)
        return null
      return layStakeRimborso(puntataNum, quotaPuntaNum, rimborsoNum, quotaBancaNum, commissioneNum)
    }
    if (quotaPuntaNum == null || quotaBancaNum == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      const backStakeTotale = (puntataNum ?? 0) + bonusNum
      if (backStakeTotale <= 0) return null
      return layStakeWithImbalance(backStakeTotale, quotaPuntaNum, quotaBancaNum, commissioneNum, 0)
    }
    // NORMALE senza bonus: bancata sulla sola puntata
    if (puntataNum == null || puntataNum <= 0) return null
    return layStakeWithImbalance(puntataNum, quotaPuntaNum, quotaBancaNum, commissioneNum, 0)
  }, [tipologia, puntataNum, bonusNum, rimborsoNum, quotaPuntaNum, quotaBancaNum, commissioneNum])

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

  const totalSeVinciPuntata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || quotaPuntaNum == null || responsabilita == null) return null
      return puntataNum * (quotaPuntaNum - 1) - responsabilita
    }
    if (responsabilita == null || quotaPuntaNum == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      const ritorno = ((puntataNum ?? 0) + bonusNum) * quotaPuntaNum
      return ritorno - (puntataNum ?? 0) - responsabilita
    }
    if (baseMinGain == null) return null
    return baseMinGain
  }, [tipologia, puntataNum, quotaPuntaNum, responsabilita, baseMinGain, bonusNum])

  const totalSeVinciBancata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (effectiveExchangeProfit == null) return null
      return -(puntataNum ?? 0) + effectiveExchangeProfit + rimborsoNum
    }
    const profit = effectiveExchangeProfitRounded ?? effectiveExchangeProfit
    if (profit == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      return -(puntataNum ?? 0) + profit
    }
    return -(puntataNum ?? 0) + profit
  }, [
    tipologia,
    puntataNum,
    bonusNum,
    rimborsoNum,
    effectiveExchangeProfit,
    effectiveExchangeProfitRounded,
  ])

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
    if (puntataEffettiva <= 0 || layStakeValue == null) return null
    const exchangeProfit = layStakeValue * (1 - commissioneNum / 100)
    const pct = (exchangeProfit / puntataEffettiva) * 100
    return Number.isFinite(pct) ? pct : null
  }, [puntataEffettiva, layStakeValue, commissioneNum])

  /* ── Bancata parziale (multi-step, max 6) ── */
  const partialLayResults = useMemo(() => {
    if (partialLays.length === 0 || quotaPuntaNum == null || quotaBancaNum == null) return []

    const effectiveStake = puntataEffettiva > 0 ? puntataEffettiva : (puntataNum ?? 0)
    if (effectiveStake <= 0) return []

    const c = commissioneNum / 100

    // Each step: the "already covered" sum grows.
    // coveredSum = Σ Li * (Qli - c/100)  for all previous lays
    // First lay (i=0) covers at the original quotaBanca.
    // L_next = (S*Qp - coveredSum) / (Ql_next - c/100)

    type StepResult = {
      newLayStake: number
      newLiability: number
    }

    const results: (StepResult | null)[] = []
    // coveredSum starts with the portion covered at the original odds
    let coveredSum = 0

    for (let i = 0; i < partialLays.length; i++) {
      const amountNum = parseNum(partialLays[i].amount)
      const newOddsNum = parseNum(partialLays[i].newOdds)

      if (amountNum == null || amountNum <= 0 || newOddsNum == null || newOddsNum <= 1) {
        results.push(null)
        break // can't compute subsequent steps without this one
      }

      // The amount already laid at the *previous* odds
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

      const newLayStake = (effectiveStake * quotaPuntaNum - coveredSum) / denominator
      if (!Number.isFinite(newLayStake) || newLayStake < 0) {
        results.push(null)
        break
      }

      const newLiability = newLayStake * (newOddsNum - 1)
      results.push({ newLayStake, newLiability })
    }

    return results
  }, [partialLays, quotaPuntaNum, quotaBancaNum, puntataEffettiva, puntataNum, commissioneNum])

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
    tipologia === 'RIMBORSO (CR%)'
      ? puntataNum != null &&
        puntataNum > 0 &&
        quotaPuntaNum != null &&
        quotaBancaNum != null &&
        layStakeValue != null &&
        responsabilita != null
      : puntataEffettiva > 0 &&
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

  const tipoBonus = tipologia === 'RIMBORSO (CR%)' ? 'rimborso' : 'none'

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
        rimborsoValore: tipologia === 'RIMBORSO (CR%)' ? rimborsoNum : undefined,
        commissionePercentuale: commissioneNum,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
      }

      let bancaLegs: (typeof bancaLegBase & { stake: number; quota: number; rischio: number })[]

      if (hasPartialLays) {
        // Primo leg banca: importo già bancato alla quota originale
        const firstAmount = parseNum(partialLays[0].amount) ?? 0
        bancaLegs = [
          {
            ...bancaLegBase,
            stake: firstAmount,
            quota: quotaBancaNum,
            rischio: firstAmount * (quotaBancaNum - 1),
          },
        ]

        // Leg banca successivi: calcolati dai risultati delle bancate parziali
        for (let i = 0; i < partialLays.length; i++) {
          const result = partialLayResults[i]!
          const newOdds = parseNum(partialLays[i].newOdds)!
          bancaLegs.push({
            ...bancaLegBase,
            stake: result.newLayStake,
            quota: newOdds,
            rischio: result.newLiability,
          })
        }
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
        className="max-h-[100dvh] max-w-2xl overflow-y-auto p-0 sm:max-h-[90vh]"
        showClose={true}
      >
        <DialogTitle asChild>
          <VisuallyHidden>Calcolatore Punta-Banca</VisuallyHidden>
        </DialogTitle>

        <div className="flex flex-col">
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
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
                            tipologia === 'NORMALE' && bonusNum > 0
                              ? ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) -
                                  (puntataNum ?? 0)
                              : (puntataNum ?? 0) * ((quotaPuntaNum ?? 0) - 1),
                          )}
                        </span>
                        <span className="font-mono text-xs text-destructive">
                          {formatSigned(-(responsabilita ?? 0))}
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
                          {(effectiveExchangeProfitRounded ?? effectiveExchangeProfit) != null
                            ? formatSigned(
                                effectiveExchangeProfitRounded ?? effectiveExchangeProfit ?? 0,
                              )
                            : '—'}
                        </span>
                        {tipologia === 'RIMBORSO (CR%)' && (
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
                <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Profitti
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" />
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            {bookName}
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            {exchangeName}
                          </th>
                          {tipologia === 'RIMBORSO (CR%)' && (
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
                              tipologia === 'NORMALE' && bonusNum > 0
                                ? ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) -
                                    (puntataNum ?? 0)
                                : (puntataNum ?? 0) * ((quotaPuntaNum ?? 0) - 1),
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-destructive">
                            {formatSigned(-(responsabilita ?? 0))}
                          </td>
                          {tipologia === 'RIMBORSO (CR%)' && (
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
                            {(effectiveExchangeProfitRounded ?? effectiveExchangeProfit) != null
                              ? formatSigned(
                                  effectiveExchangeProfitRounded ?? effectiveExchangeProfit ?? 0,
                                )
                              : '—'}
                          </td>
                          {tipologia === 'RIMBORSO (CR%)' && (
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
