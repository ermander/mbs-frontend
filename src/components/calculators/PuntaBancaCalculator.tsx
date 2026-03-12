'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  equivalentBackOdds,
  getImbalanceFactor,
  liability,
  layStakeRimborso,
  layStakeWithImbalance,
  minGain,
  ratingPercent,
  remainingLayStakeAtNewOdds,
} from '@/lib/calculators/punta-banca'
import type { TipologiaCalcolo, SbilanciamentoValue } from '@/stores/agenda-store'
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
  const [imbalance, setImbalance] = useState<number>(0)
  const [abbinata, setAbbinata] = useState('')
  const [nuovaQuota, setNuovaQuota] = useState('')
  const [showBancataParziale, setShowBancataParziale] = useState(false)
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)
  /** Sbilanciamento -30..+30%; usato solo se isAvanzato, altrimenti 0. */
  const imbalancePercent = isAvanzato ? Math.max(-30, Math.min(30, imbalance)) : 0

  const quotaPuntaEquivalente = useMemo(() => {
    if (quotaBancaNum == null) return null
    return equivalentBackOdds(quotaBancaNum, commissioneNum)
  }, [quotaBancaNum, commissioneNum])

  const layStake = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || quotaBancaNum == null)
        return null
      const base = layStakeRimborso(
        puntataNum,
        quotaPuntaNum,
        rimborsoNum,
        quotaBancaNum,
        commissioneNum,
      )
      if (base == null) return null
      const factor = getImbalanceFactor(imbalancePercent)
      const adjusted = base * factor
      return Number.isFinite(adjusted) ? adjusted : null
    }
    if (puntataEffettiva <= 0 || quotaPuntaNum == null || quotaBancaNum == null) return null
    return layStakeWithImbalance(
      puntataEffettiva,
      quotaPuntaNum,
      quotaBancaNum,
      commissioneNum,
      imbalancePercent,
    )
  }, [
    tipologia,
    puntataNum,
    rimborsoNum,
    puntataEffettiva,
    quotaPuntaNum,
    quotaBancaNum,
    commissioneNum,
    imbalancePercent,
  ])

  const responsabilita = useMemo(() => {
    if (layStake == null || quotaBancaNum == null) return null
    return liability(layStake, quotaBancaNum)
  }, [layStake, quotaBancaNum])

  const abbinataNum = parseNum(abbinata) ?? 0
  const nuovaQuotaNum = parseNum(nuovaQuota)
  /** Stake da abbinare alla nuova quota: stesso profitto in entrambi gli esiti (formula equal profit). */
  const bancaParziale = useMemo(() => {
    if (
      puntataEffettiva <= 0 ||
      quotaPuntaNum == null ||
      quotaPuntaNum <= 0 ||
      quotaBancaNum == null ||
      quotaBancaNum <= 1 ||
      nuovaQuotaNum == null ||
      nuovaQuotaNum <= 1
    )
      return null
    return remainingLayStakeAtNewOdds(
      puntataEffettiva,
      quotaPuntaNum,
      abbinataNum,
      quotaBancaNum,
      nuovaQuotaNum,
      commissioneNum,
    )
  }, [puntataEffettiva, quotaPuntaNum, abbinataNum, quotaBancaNum, nuovaQuotaNum, commissioneNum])
  /** Responsabilità sulla parte da abbinare alla nuova quota. */
  const responsabilitaParziale = useMemo(() => {
    if (bancaParziale == null || nuovaQuotaNum == null || nuovaQuotaNum <= 1) return null
    const liab = bancaParziale * (nuovaQuotaNum - 1)
    return Number.isFinite(liab) ? liab : null
  }, [bancaParziale, nuovaQuotaNum])
  /** Nuova responsabilità totale (abbinate a quota originale + resto a nuova quota). */
  const nuovaResponsabilita = useMemo(() => {
    if (responsabilitaParziale == null) return null
    const liabilityAbbinata =
      quotaBancaNum != null && quotaBancaNum > 1 ? abbinataNum * (quotaBancaNum - 1) : 0
    return liabilityAbbinata + responsabilitaParziale
  }, [abbinataNum, quotaBancaNum, responsabilitaParziale])

  /** Responsabilità da usare in riepilogo/tabella: con bancata parziale attiva usa la nuova totale. */
  const effectiveLiability =
    showBancataParziale && nuovaResponsabilita != null ? nuovaResponsabilita : responsabilita
  /** Profitto exchange quando vinci la bancata: con bancata parziale attiva = (abbinata + bancaParziale) × (1 - comm). */
  const effectiveExchangeProfit = useMemo(() => {
    if (layStake == null) return null
    const factor = 1 - commissioneNum / 100
    if (showBancataParziale && bancaParziale != null && (abbinataNum > 0 || bancaParziale > 0))
      return (abbinataNum + bancaParziale) * factor
    return layStake * factor
  }, [layStake, commissioneNum, showBancataParziale, abbinataNum, bancaParziale])

  const rating = useMemo(() => {
    if (puntataEffettiva <= 0 || layStake == null) return null
    return ratingPercent(puntataEffettiva, layStake)
  }, [puntataEffettiva, layStake])

  const baseMinGain = useMemo(() => {
    if (quotaPuntaNum == null || effectiveLiability == null) return null
    return minGain(puntataEffettiva, quotaPuntaNum, effectiveLiability)
  }, [puntataEffettiva, quotaPuntaNum, effectiveLiability])

  /** Totale se vinci la puntata sul Book (riga 1 tabella). */
  const totalSeVinciPuntata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || quotaPuntaNum == null || effectiveLiability == null) return null
      return puntataNum * (quotaPuntaNum - 1) - effectiveLiability
    }
    if (baseMinGain == null) return null
    return baseMinGain + bonusNum
  }, [tipologia, puntataNum, quotaPuntaNum, effectiveLiability, baseMinGain, bonusNum])

  /** Totale se vinci la bancata sull'Exchange (riga 2 tabella). */
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
    const minGainValue = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(minGainValue) ? minGainValue : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const crPercent =
    tipologia === 'RIMBORSO (CR%)' &&
    rimborsoNum > 0 &&
    guadagnoMinimo != null &&
    Number.isFinite(guadagnoMinimo)
      ? (guadagnoMinimo / rimborsoNum) * 100
      : null

  const showSummary =
    tipologia === 'RIMBORSO (CR%)'
      ? puntataNum != null &&
        puntataNum > 0 &&
        quotaPuntaNum != null &&
        quotaBancaNum != null &&
        layStake != null &&
        responsabilita != null
      : puntataEffettiva > 0 &&
        quotaPuntaNum != null &&
        quotaBancaNum != null &&
        layStake != null &&
        responsabilita != null

  // #region agent log
  useEffect(() => {
    if (
      !showSummary ||
      quotaPuntaNum == null ||
      layStake == null ||
      responsabilita == null ||
      guadagnoMinimo == null ||
      quotaBancaNum == null
    )
      return
    const commissionePct = commissioneNum
    const totalRow1 = puntataEffettiva * (quotaPuntaNum - 1) - responsabilita
    const exchangeProfitAfterCommission = layStake * (1 - commissionePct / 100)
    const totalRow2 = -puntataEffettiva + exchangeProfitAfterCommission
    const ts = Date.now()
    fetch('http://127.0.0.1:7629/ingest/3106dbfd-66a0-4e79-9380-92a1b790d016', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '897992' },
      body: JSON.stringify({
        sessionId: '897992',
        location: 'PuntaBancaCalculator.tsx:summary',
        message: 'Tabella profitti calc',
        data: {
          puntataEffettiva,
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
          row2IfExchangeShownAsLayStake: -puntataEffettiva + layStake,
        },
        timestamp: ts,
        hypothesisId: 'H3',
      }),
    }).catch(() => {})
  }, [
    showSummary,
    puntataEffettiva,
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
      sbilanciamento: imbalancePercent as SbilanciamentoValue,
      abbinata: parseNum(abbinata) ?? undefined,
      nuovaQuota: parseNum(nuovaQuota) ?? undefined,
      banca: bancaParziale ?? undefined,
      responsabilitaAbbinata: responsabilitaParziale ?? undefined,
    })
    setAgendaMessage('Aggiunto al Profit Tracker.')
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
          {tipologia === 'RIMBORSO (CR%)' && (
            <div className="space-y-2">
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
            </div>
          )}
          {(tipologia === 'NORMALE' || tipologia === 'BONUS') && (
            <div className="space-y-2">
              <Label htmlFor="bonus">
                {tipologia === 'NORMALE' ? 'Saldo bonus (opz.)' : 'Bonus'}
              </Label>
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

      {/* Riepilogo */}
      {showSummary &&
        guadagnoMinimo != null &&
        (tipologia !== 'RIMBORSO (CR%)' ? rating != null : true) && (
          <div className="border-b border-white/10 bg-white/5">
            <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              {tipologia === 'RIMBORSO (CR%)'
                ? 'BANCATA RIMBORSO • '
                : bonusNum > 0
                  ? 'BANCATA STANDARD + BONUS • '
                  : ''}
              Riepilogo
            </div>
            <div className="space-y-2 p-4 text-sm">
              <p>
                {tipologia === 'RIMBORSO (CR%)'
                  ? `CR%: ${crPercent != null ? crPercent.toFixed(2) : '—'}%`
                  : `Rating: ${rating != null ? rating.toFixed(2) : '—'}%`}
              </p>
              <p>
                <span className="font-medium text-primary">Punta</span>{' '}
                <span className="text-primary">
                  {formatNum(tipologia === 'RIMBORSO (CR%)' ? puntataNum : puntataEffettiva)} €
                </span>
                {tipologia !== 'RIMBORSO (CR%)' && bonusNum > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    (di cui {formatNum(bonusNum)} € bonus)
                  </span>
                )}{' '}
                a quota {formatNum(quotaPuntaNum)} sul Book.
              </p>
              <p>
                <span className="font-medium text-destructive">Banca</span>{' '}
                <span className="text-destructive">{formatNum(layStake)} €</span> a quota{' '}
                {formatNum(quotaBancaNum)} su Betfair, con Responsabilità di{' '}
                <span className="text-destructive">{formatNum(responsabilita)} €</span>.
              </p>
              {showBancataParziale &&
                nuovaResponsabilita != null &&
                abbinataNum > 0 &&
                nuovaQuotaNum != null && (
                  <p>
                    <span className="font-medium text-destructive">Nuova Responsabilità:</span>{' '}
                    <span className="text-destructive">{formatNum(nuovaResponsabilita)} €</span>
                  </p>
                )}
              <p>
                Il guadagno minimo sarà{' '}
                <span className={cn(guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive')}>
                  {formatSigned(guadagnoMinimo)} €
                </span>
              </p>
            </div>
          </div>
        )}

      {isAvanzato && (
        <>
          {/* Slider Sbilanciamento (-30% … +30%), solo in modalità avanzata */}
          <div className="border-b border-white/10 p-4">
            <Label className="mb-2 block">Sbilanciamento della Bancata</Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">−30%</span>
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

          {/* Bancata Parziale */}
          <div className="flex justify-center border-b border-white/10 p-4">
            <Button
              type="button"
              variant="success"
              onClick={() => {
                if (showBancataParziale) {
                  setAbbinata('')
                  setNuovaQuota('')
                }
                setShowBancataParziale((v) => !v)
              }}
              aria-expanded={showBancataParziale}
            >
              Bancata Parziale
            </Button>
          </div>

          {/* Sezione Abbinata (visibile solo se Bancata Parziale espansa) */}
          {showBancataParziale && (
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
                  <Label htmlFor="banca">Banca (stake da abbinare)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="banca"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={bancaParziale != null ? bancaParziale.toFixed(2) : ''}
                      readOnly
                      aria-readonly
                      className="flex-1 bg-muted/50"
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
                      value={
                        responsabilitaParziale != null ? responsabilitaParziale.toFixed(2) : ''
                      }
                      readOnly
                      aria-readonly
                      className="flex-1 bg-muted/50"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        guadagnoMinimo != null &&
        quotaPuntaNum != null &&
        layStake != null &&
        responsabilita != null &&
        (tipologia === 'RIMBORSO (CR%)' ? puntataNum != null : true) && (
          <div className="border-b border-white/10 bg-white/5">
            <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              {tipologia === 'RIMBORSO (CR%)'
                ? 'BANCATA RIMBORSO • '
                : bonusNum > 0
                  ? 'BANCATA STANDARD + BONUS • '
                  : ''}
              Tabella dei profitti
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="p-3 text-left font-normal"></th>
                    <th className="p-3 text-right font-normal">Book</th>
                    <th className="p-3 text-right font-normal">Exchange</th>
                    {tipologia === 'RIMBORSO (CR%)' && (
                      <th className="p-3 text-right font-normal">Rimborso</th>
                    )}
                    <th className="p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {tipologia === 'RIMBORSO (CR%)' ? (
                    <>
                      <tr className="border-b border-white/10 bg-primary/10">
                        <td className="p-3">Se vinci la puntata sul Book:</td>
                        <td className="p-3 text-right text-primary">
                          {formatSigned((puntataNum ?? 0) * (quotaPuntaNum - 1))}
                        </td>
                        <td className="p-3 text-right text-destructive">
                          {formatSigned(-(effectiveLiability ?? 0))}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{formatSigned(0)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={cn(
                              totalSeVinciPuntata != null && totalSeVinciPuntata >= 0
                                ? 'text-primary'
                                : 'text-destructive',
                            )}
                          >
                            ={' '}
                            {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'}{' '}
                            €
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-destructive/10">
                        <td className="p-3">Se vinci la bancata sull&apos;Exchange:</td>
                        <td className="p-3 text-right text-destructive">
                          {formatSigned(-(puntataNum ?? 0))}
                        </td>
                        <td className="p-3 text-right text-primary">
                          {effectiveExchangeProfit != null
                            ? formatSigned(effectiveExchangeProfit)
                            : '—'}
                        </td>
                        <td className="p-3 text-right text-primary">{formatSigned(rimborsoNum)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={cn(
                              totalSeVinciBancata != null && totalSeVinciBancata >= 0
                                ? 'text-primary'
                                : 'text-destructive',
                            )}
                          >
                            ={' '}
                            {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'}{' '}
                            €
                          </span>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="border-b border-white/10 bg-primary/10">
                        <td className="p-3">Se vinci la puntata sul Book:</td>
                        <td className="p-3 text-right text-primary">
                          {formatSigned(
                            bonusNum > 0
                              ? puntataEffettiva * quotaPuntaNum - (puntataNum ?? 0)
                              : puntataEffettiva * (quotaPuntaNum - 1),
                          )}
                        </td>
                        <td className="p-3 text-right text-destructive">
                          {formatSigned(-(effectiveLiability ?? 0))}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={cn(
                              totalSeVinciPuntata != null && totalSeVinciPuntata >= 0
                                ? 'text-primary'
                                : 'text-destructive',
                            )}
                          >
                            ={' '}
                            {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'}{' '}
                            €
                          </span>
                        </td>
                      </tr>
                      <tr className="bg-destructive/10">
                        <td className="p-3">Se vinci la bancata sull&apos;Exchange:</td>
                        <td className="p-3 text-right text-destructive">
                          {formatSigned(bonusNum > 0 ? -(puntataNum ?? 0) : -puntataEffettiva)}
                        </td>
                        <td className="p-3 text-right text-primary">
                          {effectiveExchangeProfit != null
                            ? formatSigned(effectiveExchangeProfit)
                            : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={cn(
                              totalSeVinciBancata != null && totalSeVinciBancata >= 0
                                ? 'text-primary'
                                : 'text-destructive',
                            )}
                          >
                            ={' '}
                            {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'}{' '}
                            €
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Invia al Profit Tracker */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={handleInviaAgenda} variant="default">
          Invia al Profit Tracker
        </Button>
        {agendaMessage && <p className={cn('text-sm', 'text-primary')}>{agendaMessage}</p>}
      </div>
    </div>
  )
}
