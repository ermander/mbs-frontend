'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  equivalentBackOdds,
  liability,
  layStakeWithImbalance,
  minGain,
  ratingPercent,
  type ImbalanceValue,
} from '@/lib/calculators/punta-banca'
import type { TipologiaCalcolo } from '@/stores/agenda-store'
import { useAgendaStore } from '@/stores/agenda-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const TIPOLOGIE: TipologiaCalcolo[] = ['NORMALE', 'RIMBORSO (CR%)', 'BONUS']

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

export function PuntaBancaCalculator() {
  const addEntry = useAgendaStore((s) => s.addEntry)

  const [tipologia, setTipologia] = useState<TipologiaCalcolo>('NORMALE')
  const [isAvanzato, setIsAvanzato] = useState(false)
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [bonus, setBonus] = useState('')
  const [puntataPotenziata, setPuntataPotenziata] = useState(false)
  const [puntataPotenziataPercent, setPuntataPotenziataPercent] = useState('')
  const [commissione, setCommissione] = useState('0')
  const [quotaBanca, setQuotaBanca] = useState('')
  const [imbalance, setImbalance] = useState<number>(1)
  const [abbinata, setAbbinata] = useState('')
  const [nuovaQuota, setNuovaQuota] = useState('')
  const [banca, setBanca] = useState('')
  const [responsabilitaAbbinata, setResponsabilitaAbbinata] = useState('')
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null)

  const puntataNum = parseNum(puntata)
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)
  const imbalanceVal = (imbalance === 0 ? 0 : imbalance === 2 ? 2 : 1) as ImbalanceValue

  const quotaPuntaEquivalente = useMemo(() => {
    if (quotaBancaNum == null) return null
    return equivalentBackOdds(quotaBancaNum, commissioneNum)
  }, [quotaBancaNum, commissioneNum])

  const layStake = useMemo(() => {
    if (puntataNum == null || quotaPuntaNum == null || quotaBancaNum == null) return null
    return layStakeWithImbalance(
      puntataNum,
      quotaPuntaNum,
      quotaBancaNum,
      commissioneNum,
      imbalanceVal,
    )
  }, [puntataNum, quotaPuntaNum, quotaBancaNum, commissioneNum, imbalanceVal])

  const responsabilita = useMemo(() => {
    if (layStake == null || quotaBancaNum == null) return null
    return liability(layStake, quotaBancaNum)
  }, [layStake, quotaBancaNum])

  const rating = useMemo(() => {
    if (puntataNum == null || puntataNum <= 0 || layStake == null) return null
    return ratingPercent(puntataNum, layStake)
  }, [puntataNum, layStake])

  const guadagnoMinimo = useMemo(() => {
    if (puntataNum == null || quotaPuntaNum == null || responsabilita == null) return null
    return minGain(puntataNum, quotaPuntaNum, responsabilita)
  }, [puntataNum, quotaPuntaNum, responsabilita])

  /** Profitto sull'exchange quando vinci la bancata (dopo commissione). */
  const exchangeProfitAfterCommission = useMemo(() => {
    if (layStake == null) return null
    return layStake * (1 - commissioneNum / 100)
  }, [layStake, commissioneNum])

  const showSummary =
    puntataNum != null &&
    puntataNum > 0 &&
    quotaPuntaNum != null &&
    quotaBancaNum != null &&
    layStake != null &&
    responsabilita != null

  // #region agent log
  useEffect(() => {
    if (
      !showSummary ||
      puntataNum == null ||
      quotaPuntaNum == null ||
      layStake == null ||
      responsabilita == null ||
      guadagnoMinimo == null ||
      quotaBancaNum == null
    )
      return
    const commissionePct = commissioneNum
    const totalRow1 = puntataNum * (quotaPuntaNum - 1) - responsabilita
    const exchangeProfitAfterCommission = layStake * (1 - commissionePct / 100)
    const totalRow2 = -puntataNum + exchangeProfitAfterCommission
    const ts = Date.now()
    fetch('http://127.0.0.1:7629/ingest/3106dbfd-66a0-4e79-9380-92a1b790d016', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '897992' },
      body: JSON.stringify({
        sessionId: '897992',
        location: 'PuntaBancaCalculator.tsx:summary',
        message: 'Tabella profitti calc',
        data: {
          puntataNum,
          quotaPuntaNum,
          commissionePct,
          quotaBancaNum,
          layStake,
          responsabilita,
          guadagnoMinimo,
          totalRow1,
          exchangeProfitAfterCommission,
          totalRow2,
          diffRow1: totalRow1 - guadagnoMinimo,
          diffRow2: totalRow2 - guadagnoMinimo,
        },
        timestamp: ts,
        hypothesisId: 'H1',
      }),
    }).catch(() => {})
    fetch('http://127.0.0.1:7629/ingest/3106dbfd-66a0-4e79-9380-92a1b790d016', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '897992' },
      body: JSON.stringify({
        sessionId: '897992',
        location: 'PuntaBancaCalculator.tsx:compare',
        message: 'Row totals vs guadagnoMinimo',
        data: {
          totalRow1,
          totalRow2,
          guadagnoMinimo,
          row2IfExchangeShownAsLayStake: -puntataNum + layStake,
        },
        timestamp: ts,
        hypothesisId: 'H3',
      }),
    }).catch(() => {})
  }, [
    showSummary,
    puntataNum,
    quotaPuntaNum,
    layStake,
    responsabilita,
    guadagnoMinimo,
    quotaBancaNum,
    commissioneNum,
  ])
  // #endregion

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
      layStake: layStake ?? null,
      responsabilita,
      sbilanciamento: imbalanceVal,
      abbinata: parseNum(abbinata) ?? undefined,
      nuovaQuota: parseNum(nuovaQuota) ?? undefined,
      banca: parseNum(banca) ?? undefined,
      responsabilitaAbbinata: parseNum(responsabilitaAbbinata) ?? undefined,
    })
    setAgendaMessage("Aggiunto all'agenda.")
    setTimeout(() => setAgendaMessage(null), 3000)
  }

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/5 p-0 shadow-xl backdrop-blur-md">
      {/* Barra superiore */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
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
        <Button
          variant={isAvanzato ? 'secondary' : 'success'}
          size="sm"
          onClick={() => setIsAvanzato(!isAvanzato)}
        >
          {isAvanzato ? 'AVANZATO' : 'STANDARD'}
        </Button>
      </div>

      {/* Sezione Puntata */}
      <div className="border-b border-white/10 bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata">Puntata</Label>
            <div className="flex items-center gap-2">
              <Input
                id="puntata"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntata}
                onChange={(e) => setPuntata(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">€</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-punta">Quota Punta</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quota-punta"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={quotaPunta}
                onChange={(e) => setQuotaPunta(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">@</span>
            </div>
          </div>
          {(tipologia === 'RIMBORSO (CR%)' || tipologia === 'BONUS') && (
            <div className="space-y-2">
              {tipologia === 'RIMBORSO (CR%)' ? (
                <>
                  <Label htmlFor="rimborso">Rimborso</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="rimborso"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={rimborso}
                      onChange={(e) => setRimborso(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="bonus">Bonus</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bonus"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={bonus}
                      onChange={(e) => setBonus(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {isAvanzato && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="puntata-potenziata"
                checked={puntataPotenziata}
                onChange={(e) => setPuntataPotenziata(e.target.checked)}
              />
              <Label htmlFor="puntata-potenziata" className="cursor-pointer font-normal">
                Puntata potenziata?
              </Label>
            </div>
            {puntataPotenziata && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={puntataPotenziataPercent}
                  onChange={(e) => setPuntataPotenziataPercent(e.target.value)}
                  className="w-20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sezione Banca */}
      <div className="border-b border-white/10 bg-destructive/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commissione">Commissione</Label>
            <div className="flex items-center gap-2">
              <Input
                id="commissione"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={commissione}
                onChange={(e) => setCommissione(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-banca">Quota Banca</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quota-banca"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={quotaBanca}
                onChange={(e) => setQuotaBanca(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">@</span>
            </div>
          </div>
        </div>
        {isAvanzato && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="quota-punta-equiv">Quota Punta Equivalente</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quota-punta-equiv"
                readOnly
                aria-readonly
                value={formatNum(quotaPuntaEquivalente)}
                className="flex-1 bg-muted/50"
              />
              <span className="text-muted-foreground">@</span>
            </div>
          </div>
        )}
      </div>

      {isAvanzato && (
        <>
          {/* Slider Sbilanciamento */}
          <div className="border-b border-white/10 p-4">
            <Label className="mb-2 block">Sbilanciamento della Bancata</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Under</span>
              <Slider
                value={[imbalance]}
                onValueChange={([v]) => setImbalance(v ?? 1)}
                min={0}
                max={2}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Over</span>
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {imbalance === 0 ? 'Under' : imbalance === 2 ? 'Over' : 'Standard'}
            </p>
          </div>

          {/* Bancata Parziale */}
          <div className="flex justify-center border-b border-white/10 p-4">
            <Button variant="success">Bancata Parziale</Button>
          </div>

          {/* Sezione Abbinata */}
          <div className="border-b border-white/10 bg-muted/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="abbinata">Abbinata</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="abbinata"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={abbinata}
                    onChange={(e) => setAbbinata(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuova-quota">Nuova Quota</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="nuova-quota"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={nuovaQuota}
                    onChange={(e) => setNuovaQuota(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">@</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banca">Banca</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="banca"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={banca}
                    onChange={(e) => setBanca(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsabilita-abbinata">Responsabilità</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="responsabilita-abbinata"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={responsabilitaAbbinata}
                    onChange={(e) => setResponsabilitaAbbinata(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Riepilogo */}
      {showSummary && rating != null && guadagnoMinimo != null && (
        <div className="border-b border-white/10 bg-white/5">
          <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>Rating: {rating.toFixed(2)}%</p>
            <p>
              <span className="font-medium text-primary">Punta</span>{' '}
              <span className="text-primary">{formatNum(puntataNum)} €</span> a quota{' '}
              {formatNum(quotaPuntaNum)} sul Book.
            </p>
            <p>
              <span className="font-medium text-destructive">Banca</span>{' '}
              <span className="text-destructive">{formatNum(layStake)} €</span> a quota{' '}
              {formatNum(quotaBancaNum)} su Betfair, con Responsabilità di{' '}
              <span className="text-destructive">{formatNum(responsabilita)} €</span>.
            </p>
            <p>
              Il guadagno minimo sarà{' '}
              <span className={cn(guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive')}>
                {formatSigned(guadagnoMinimo)} €
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        guadagnoMinimo != null &&
        puntataNum != null &&
        quotaPuntaNum != null &&
        layStake != null &&
        responsabilita != null && (
          <div className="border-b border-white/10 bg-white/5">
            <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              Tabella dei profitti
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="p-3 text-left font-normal"></th>
                    <th className="p-3 text-right font-normal">Book</th>
                    <th className="p-3 text-right font-normal">Exchange</th>
                    <th className="p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10 bg-primary/10">
                    <td className="p-3">Se vinci la puntata sul Book:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(puntataNum * (quotaPuntaNum - 1))}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-responsabilita)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={cn(guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(guadagnoMinimo)} €
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-destructive/10">
                    <td className="p-3">Se vinci la bancata sull&apos;Exchange:</td>
                    <td className="p-3 text-right text-destructive">{formatSigned(-puntataNum)}</td>
                    <td className="p-3 text-right text-primary">
                      {exchangeProfitAfterCommission != null
                        ? formatSigned(exchangeProfitAfterCommission)
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={cn(guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        ={' '}
                        {puntataNum != null && exchangeProfitAfterCommission != null
                          ? formatSigned(-puntataNum + exchangeProfitAfterCommission)
                          : formatSigned(guadagnoMinimo)}{' '}
                        €
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Invia ad Agenda */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={handleInviaAgenda} variant="default">
          Invia ad Agenda Online
        </Button>
        {agendaMessage && <p className={cn('text-sm', 'text-primary')}>{agendaMessage}</p>}
      </div>
    </div>
  )
}
