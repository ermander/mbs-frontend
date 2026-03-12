'use client'

import Image from 'next/image'
import React, { useEffect, useMemo, useState } from 'react'
import {
  equivalentBackOdds,
  layStakeRimborso,
  layStakeWithImbalance,
  liability,
  minGain,
  ratingPercent,
} from '@/lib/calculators/punta-banca'
import type { TipologiaCalcolo } from '@/stores/agenda-store'
import { useAgendaStore } from '@/stores/agenda-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { OddsmatcherRow } from '@/types/oddsmatcher'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPOLOGIE: TipologiaCalcolo[] = ['NORMALE', 'RIMBORSO (CR%)', 'BONUS']

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

export interface OddsmatcherCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: OddsmatcherRow | null
}

export function OddsmatcherCalculatorModal({
  open,
  onOpenChange,
  row,
}: OddsmatcherCalculatorModalProps) {
  const addEntry = useAgendaStore((s) => s.addEntry)

  const [tipologia, setTipologia] = useState<TipologiaCalcolo>('NORMALE')
  const [commissione, setCommissione] = useState('3')
  const [rimborso, setRimborso] = useState('')
  const [bonus, setBonus] = useState('')
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [quotaBanca, setQuotaBanca] = useState('')
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open && row) {
      const back = row.back_odd
      const lay = row.lay_odd
      queueMicrotask(() => {
        setQuotaPunta(back)
        setQuotaBanca(lay)
      })
    }
  }, [open, row])

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)

  const quotaPuntaEquivalente = useMemo(() => {
    if (quotaBancaNum == null) return null
    return equivalentBackOdds(quotaBancaNum, commissioneNum)
  }, [quotaBancaNum, commissioneNum])

  const layStakeValue = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || quotaBancaNum == null)
        return null
      return layStakeRimborso(puntataNum, quotaPuntaNum, rimborsoNum, quotaBancaNum, commissioneNum)
    }
    if (puntataEffettiva <= 0 || quotaPuntaNum == null || quotaBancaNum == null) return null
    return layStakeWithImbalance(puntataEffettiva, quotaPuntaNum, quotaBancaNum, commissioneNum, 0)
  }, [
    tipologia,
    puntataNum,
    rimborsoNum,
    puntataEffettiva,
    quotaPuntaNum,
    quotaBancaNum,
    commissioneNum,
  ])

  const responsabilita = useMemo(() => {
    if (layStakeValue == null || quotaBancaNum == null) return null
    return liability(layStakeValue, quotaBancaNum)
  }, [layStakeValue, quotaBancaNum])

  const effectiveExchangeProfit = useMemo(() => {
    if (layStakeValue == null) return null
    return layStakeValue * (1 - commissioneNum / 100)
  }, [layStakeValue, commissioneNum])

  const baseMinGain = useMemo(() => {
    if (quotaPuntaNum == null || responsabilita == null) return null
    return minGain(puntataEffettiva, quotaPuntaNum, responsabilita)
  }, [puntataEffettiva, quotaPuntaNum, responsabilita])

  const totalSeVinciPuntata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || quotaPuntaNum == null || responsabilita == null) return null
      return puntataNum * (quotaPuntaNum - 1) - responsabilita
    }
    if (baseMinGain == null) return null
    return baseMinGain + bonusNum
  }, [tipologia, puntataNum, quotaPuntaNum, responsabilita, baseMinGain, bonusNum])

  const totalSeVinciBancata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (effectiveExchangeProfit == null) return null
      return -(puntataNum ?? 0) + effectiveExchangeProfit + rimborsoNum
    }
    if (effectiveExchangeProfit == null) return null
    return (bonusNum > 0 ? -(puntataNum ?? 0) : -puntataEffettiva) + effectiveExchangeProfit
  }, [tipologia, puntataNum, puntataEffettiva, bonusNum, rimborsoNum, effectiveExchangeProfit])

  const guadagnoMinimo = useMemo(() => {
    if (totalSeVinciPuntata == null || totalSeVinciBancata == null) return null
    const v = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(v) ? v : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const rating = useMemo(() => {
    if (puntataEffettiva <= 0 || layStakeValue == null) return null
    return ratingPercent(puntataEffettiva, layStakeValue)
  }, [puntataEffettiva, layStakeValue])

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

  const handleInviaAgenda = () => {
    addEntry({
      tipologia,
      puntata: puntataNum ?? 0,
      quotaPunta: quotaPuntaNum ?? 0,
      rimborso: parseNum(rimborso) ?? undefined,
      bonus: parseNum(bonus) ?? undefined,
      commissione: commissioneNum,
      quotaBanca: quotaBancaNum ?? 0,
      quotaPuntaEquivalente,
      layStake: layStakeValue ?? null,
      responsabilita,
      sbilanciamento: 0,
    })
    setAgendaMessage('Aggiunto al Profit Tracker.')
    setTimeout(() => setAgendaMessage(null), 3000)
  }

  if (!row) return null

  const bookName = getBookName(row.id_book_1)
  const exchangeName = getBookName(row.id_book_2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-0"
        aria-labelledby="oddsmatcher-calc-title"
        showClose={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle id="oddsmatcher-calc-title">Calcolatore Punta-Banca</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col">
          {/* Evento: barra compatta e leggibile */}
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
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

          <div className="space-y-5 p-5">
            {/* Tipo: segment control + commissione */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tipo calcolo
                </span>
                <div className="flex rounded-lg border border-border bg-muted/20 p-0.5">
                  {TIPOLOGIE.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipologia(t)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        tipologia === t
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t === 'RIMBORSO (CR%)' ? 'Rimborso' : t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {tipologia === 'RIMBORSO (CR%)' && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="modal-rimborso" className="text-sm text-muted-foreground">
                      € rimborso
                    </Label>
                    <Input
                      id="modal-rimborso"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={rimborso}
                      onChange={(e) => setRimborso(e.target.value)}
                      className="h-8 w-24"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label htmlFor="modal-commissione" className="text-sm text-muted-foreground">
                    Commissione
                  </Label>
                  <Input
                    id="modal-commissione"
                    type="number"
                    inputMode="decimal"
                    placeholder="3"
                    value={commissione}
                    onChange={(e) => setCommissione(e.target.value)}
                    className="h-8 w-14"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* PUNTA e BANCA: card con quota in evidenza */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
                  Punta
                </p>
                <p className="mb-3 text-sm text-muted-foreground">{row.selection}</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaPunta}
                  onChange={(e) => setQuotaPunta(e.target.value)}
                  className="mb-3 h-10 text-lg font-semibold"
                />
                <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5">
                  <Image
                    src={`/loghi_book/${row.id_book_1}.png`}
                    alt=""
                    width={80}
                    height={24}
                    className="h-6 w-auto max-w-[80px] object-contain"
                  />
                  <span className="text-xs text-muted-foreground">{bookName}</span>
                </div>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-destructive">
                  Banca
                </p>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaBanca}
                  onChange={(e) => setQuotaBanca(e.target.value)}
                  className="mb-3 h-10 text-lg font-semibold"
                />
                <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5">
                  <Image
                    src={`/loghi_book/${row.id_book_2}.png`}
                    alt=""
                    width={80}
                    height={24}
                    className="h-6 w-auto max-w-[80px] object-contain"
                  />
                  <span className="text-xs text-muted-foreground">{exchangeName}</span>
                </div>
              </div>
            </div>

            {/* Importi e risultati: sezione unica e ordinata */}
            <div className="rounded-xl border border-border bg-muted/10 p-4">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Importi e risultati
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-puntata" className="text-sm">
                    Puntata €
                  </Label>
                  <div className="flex items-baseline gap-2">
                    <Input
                      id="modal-puntata"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={puntata}
                      onChange={(e) => setPuntata(e.target.value)}
                      className="h-9 w-28"
                    />
                    <span className="text-xs text-muted-foreground">
                      a quota {formatNum(quotaPuntaNum)}
                    </span>
                  </div>
                </div>
                {(tipologia === 'NORMALE' || tipologia === 'BONUS') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-bonus" className="text-sm">
                      Bonus € (opz.)
                    </Label>
                    <Input
                      id="modal-bonus"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={bonus}
                      onChange={(e) => setBonus(e.target.value)}
                      className="h-9 w-24"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Bancata €</Label>
                  <p className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-semibold text-foreground">
                      {layStakeValue != null ? formatNum(layStakeValue) : '0.00'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      a quota {formatNum(quotaBancaNum)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-6 sm:gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground">Responsabilità</p>
                    <p className="font-mono text-sm font-semibold">
                      € {responsabilita != null ? formatNum(responsabilita) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Guadagno minimo</p>
                    <p
                      className={cn(
                        'font-mono text-sm font-semibold',
                        guadagnoMinimo != null && guadagnoMinimo >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : guadagnoMinimo != null && guadagnoMinimo < 0
                            ? 'text-destructive'
                            : 'text-foreground',
                      )}
                    >
                      € {guadagnoMinimo != null ? formatNum(guadagnoMinimo) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella PROFITTI */}
            {showSummary && guadagnoMinimo != null && (
              <div className="overflow-hidden rounded-xl border border-border">
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
                            tipologia === 'RIMBORSO (CR%)'
                              ? (puntataNum ?? 0) * (quotaPuntaNum ?? 0) - (puntataNum ?? 0)
                              : puntataEffettiva * (quotaPuntaNum ?? 0) - puntataEffettiva,
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-destructive">
                          {formatSigned(-(responsabilita ?? 0))}
                        </td>
                        {tipologia === 'RIMBORSO (CR%)' && (
                          <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
                        )}
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'} €
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {rating != null ? `${formatNum(rating)}%` : '—'}
                        </td>
                      </tr>
                      <tr className="bg-destructive/5">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          se vinci la bancata su {exchangeName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-destructive">
                          {formatSigned(
                            tipologia === 'RIMBORSO (CR%)' ? -(puntataNum ?? 0) : -puntataEffettiva,
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-primary">
                          {effectiveExchangeProfit != null
                            ? formatSigned(effectiveExchangeProfit)
                            : '—'}
                        </td>
                        {tipologia === 'RIMBORSO (CR%)' && (
                          <td className="px-4 py-2.5 text-right font-medium text-primary">
                            {formatSigned(rimborsoNum)}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'} €
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer azioni */}
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Invia scommessa al Profit Tracker</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Esporta in Excel (non disponibile)"
                >
                  EXCEL
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleInviaAgenda}
                  disabled={
                    puntataNum == null ||
                    puntataNum <= 0 ||
                    quotaPuntaNum == null ||
                    quotaBancaNum == null ||
                    layStakeValue == null
                  }
                >
                  PROFIT TRACKER
                </Button>
              </div>
            </div>
            {agendaMessage && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {agendaMessage}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
