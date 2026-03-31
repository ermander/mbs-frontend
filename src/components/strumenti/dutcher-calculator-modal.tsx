'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { stakeBFromStakeA, stakeBFromStakeARimborso } from '@/lib/calculators/punta-punta'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { DutcherRow } from '@/types/dutcher'
import { Calendar } from 'lucide-react'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'

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
  if (n == null || !Number.isFinite(n)) return '\u2014'
  return n.toFixed(2)
}

function formatSigned(n: number): string {
  if (!Number.isFinite(n)) return '\u2014'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function getBookName(id: string): string {
  return ODDSMATCHER_BOOKS.find((b) => b.id === id)?.name ?? '\u2014'
}

export interface DutcherCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: DutcherRow | null
}

export function DutcherCalculatorModal({ open, onOpenChange, row }: DutcherCalculatorModalProps) {
  const [puntata, setPuntata] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [quotaA, setQuotaA] = useState('')
  const [quotaB, setQuotaB] = useState('')
  const [imbalance, setImbalance] = useState(0)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && row) {
      queueMicrotask(() => {
        setQuotaA(row.yes)
        setQuotaB(row.no)
        setPuntata('')
        setBonus('')
        setRimborso('')
        setImbalance(0)
      })
    }
  }, [open, row])

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      queueMicrotask(() => {
        setPuntata('')
        setBonus('')
        setRimborso('')
        setQuotaA('')
        setQuotaB('')
        setImbalance(0)
      })
    }
    wasOpenRef.current = open
  }, [open])

  const bookNameA = row ? row.book || getBookName(row.id_book1) : ''
  const bookNameB = row ? row.book2 || getBookName(row.id_book2) : ''

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaANum = parseNum(quotaA)
  const quotaBNum = parseNum(quotaB)

  const imbalancePercent = Math.max(-30, Math.min(30, imbalance))
  const imbalanceFactor = 1 + imbalancePercent / 100

  const stakeB = useMemo(() => {
    if (puntataEffettiva <= 0 || quotaANum == null || quotaBNum == null) return null
    let base: number | null
    if (rimborsoNum > 0) {
      base = stakeBFromStakeARimborso(puntataEffettiva, quotaANum, quotaBNum, rimborsoNum)
    } else {
      base = stakeBFromStakeA(puntataEffettiva, quotaANum, quotaBNum)
    }
    if (base == null) return null
    const adjusted = base * imbalanceFactor
    return Number.isFinite(adjusted) ? adjusted : null
  }, [puntataEffettiva, quotaANum, quotaBNum, rimborsoNum, imbalanceFactor])

  const stakeBRounded = useMemo(() => {
    if (stakeB == null || !Number.isFinite(stakeB)) return null
    return Math.round(stakeB * 100) / 100
  }, [stakeB])

  // Profits
  const profitIfAWins = useMemo(() => {
    if (puntataNum == null || quotaANum == null || stakeBRounded == null) return null
    return puntataEffettiva * quotaANum - (puntataNum ?? 0) - stakeBRounded
  }, [puntataNum, puntataEffettiva, quotaANum, stakeBRounded])

  const profitIfBWins = useMemo(() => {
    if (puntataNum == null || quotaBNum == null || stakeBRounded == null) return null
    return stakeBRounded * quotaBNum - (puntataNum ?? 0) - stakeBRounded + rimborsoNum
  }, [puntataNum, quotaBNum, stakeBRounded, rimborsoNum])

  const guadagnoMinimo = useMemo(() => {
    if (profitIfAWins == null || profitIfBWins == null) return null
    return Math.min(profitIfAWins, profitIfBWins)
  }, [profitIfAWins, profitIfBWins])

  if (!row) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-card p-0">
        <VisuallyHidden>
          <DialogTitle>Calcolatore Punta-Punta</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="space-y-1 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>
              {row.home} – {row.away}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatModalDate(row.data, row.ora)}
            </span>
            <span>{row.campionato}</span>
            <span>
              {row.tipo} · {row.a} / {row.b}
            </span>
          </div>
        </div>

        {/* Quote header */}
        <div className="grid grid-cols-2 gap-3 px-5 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
            <Image
              src={`/loghi_book/${row.id_book1}.png`}
              alt={bookNameA}
              width={80}
              height={24}
              className="h-6 w-auto max-w-[80px] object-contain"
            />
            <span className="ml-auto font-mono text-sm font-semibold text-sky-300">{row.yes}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
            <Image
              src={`/loghi_book/${row.id_book2}.png`}
              alt={bookNameB}
              width={80}
              height={24}
              className="h-6 w-auto max-w-[80px] object-contain"
            />
            <span className="ml-auto font-mono text-sm font-semibold text-sky-300">{row.no}</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Puntata A</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="\u20AC"
              value={puntata}
              onChange={(e) => setPuntata(sanitizeDecimal(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bonus</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="\u20AC"
              value={bonus}
              onChange={(e) => setBonus(sanitizeDecimal(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rimborso</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="\u20AC"
              value={rimborso}
              onChange={(e) => setRimborso(sanitizeDecimal(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Puntata B</Label>
            <Input
              readOnly
              value={stakeBRounded != null ? stakeBRounded.toFixed(2) : '\u2014'}
              className="h-8 bg-muted/30 text-sm"
            />
          </div>
        </div>

        {/* Quota overrides */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Quota 1</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={quotaA}
              onChange={(e) => setQuotaA(sanitizeDecimal(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quota 2</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={quotaB}
              onChange={(e) => setQuotaB(sanitizeDecimal(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Imbalance slider */}
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Sbilanciamento</Label>
            <span className="text-xs font-medium text-muted-foreground">{imbalancePercent}%</span>
          </div>
          <Slider
            min={-30}
            max={30}
            step={1}
            value={[imbalancePercent]}
            onValueChange={([v]) => setImbalance(v)}
            className="mt-1"
          />
        </div>

        {/* Summary card */}
        {guadagnoMinimo != null && (
          <div className="mx-5 mt-3 rounded-lg border border-border bg-surface-1 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Guadagno minimo</span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  guadagnoMinimo >= 0 ? 'text-emerald-400' : 'text-rose-400',
                )}
              >
                {formatSigned(guadagnoMinimo)} \u20AC
              </span>
            </div>
          </div>
        )}

        {/* Profit table */}
        {stakeBRounded != null && (
          <div className="px-5 pb-5 pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Scenario</th>
                  <th className="py-2 text-right font-medium">Profitto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">
                    Vince <span className="font-medium">{bookNameA}</span> ({row.a})
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={cn(
                        'font-mono font-medium',
                        (profitIfAWins ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400',
                      )}
                    >
                      {profitIfAWins != null ? formatSigned(profitIfAWins) : '\u2014'} \u20AC
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2">
                    Vince <span className="font-medium">{bookNameB}</span> ({row.b})
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={cn(
                        'font-mono font-medium',
                        (profitIfBWins ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400',
                      )}
                    >
                      {profitIfBWins != null ? formatSigned(profitIfBWins) : '\u2014'} \u20AC
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
