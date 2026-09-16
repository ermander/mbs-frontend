'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'

import {
  ROULETTE_MODE_LABELS,
  computeRoulette,
  partageApplies,
  puntaOptions,
  type RouletteLegKey,
  type RouletteMode,
} from '@/lib/calculators/engines/roulette-engine'
import { DEFAULT_CHIP } from '@/lib/calculators/engines/casino-common'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildRouletteBet } from '@/lib/calculators/bet-payloads'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import {
  AmountField,
  ChipSelector,
  LegAccounts,
  LockableAmount,
  SegmentedControl,
  defaultEventoData,
  formatNum,
  formatSigned,
} from '@/components/calculators/casino-shared'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import type { Account, BetCategory } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Calcolatore offline Roulette europea: la puntata (reale + bonus) su Rosso,
 * Nero o una dozzina, le coperture sugli altri esiti e sullo 0 su conti
 * diversi, con o senza la regola «la partage» (sul Rosso/Nero lo 0 restituisce
 * metà puntata). Le coperture sono arrotondate alla fiche minima del tavolo,
 * oppure bloccate e scritte a mano; il rating è sul risultato reale. Il
 * salvataggio assegna un collaboratore e un conto a ogni gamba (tre sul
 * Rosso/Nero, quattro sulle dozzine).
 */

const MODE_OPTIONS = (['rosso_nero', 'dozzine'] as RouletteMode[]).map((m) => ({
  value: m,
  label: ROULETTE_MODE_LABELS[m],
}))

interface LegAccountState {
  holderId: string
  accounts: Account[]
  accountId: string
}

const emptyLegAccount = (): LegAccountState => ({ holderId: '', accounts: [], accountId: '' })

export function RouletteCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [mode, setMode] = useState<RouletteMode>('rosso_nero')
  const [partage, setPartage] = useState(false)
  const [puntaKey, setPuntaKey] = useState<RouletteLegKey | undefined>(undefined)
  const [chip, setChip] = useState<number>(DEFAULT_CHIP)
  /** Locked covers: key → the text typed by the user. */
  const [coverEdits, setCoverEdits] = useState<Partial<Record<RouletteLegKey, string>>>({})
  const [puntata, setPuntata] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [legAccounts, setLegAccounts] = useState<LegAccountState[]>([])
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const coverEditsKey = JSON.stringify(coverEdits)

  const result = useMemo(() => {
    const edits = JSON.parse(coverEditsKey) as Partial<Record<RouletteLegKey, string>>
    const coverOverrides: Partial<Record<RouletteLegKey, number | null>> = {}
    for (const [key, text] of Object.entries(edits)) {
      coverOverrides[key as RouletteLegKey] = parseNum(text ?? '')
    }
    return computeRoulette({
      mode,
      partage,
      puntata: puntataNum,
      bonus: bonusNum,
      rimborso: rimborsoNum,
      puntaKey,
      chip,
      coverOverrides,
    })
  }, [mode, partage, puntataNum, bonusNum, rimborsoNum, puntaKey, chip, coverEditsKey])

  const puntataReale = puntataNum ?? 0
  const partageAvailable = partageApplies(mode)
  const puntaSpec = result.puntaSpec
  const covers = result.legs.filter((l) => !l.isPunta)
  const sideOptions = puntaOptions(mode).map((l) => ({ value: l.key, label: l.label }))
  const showRimborsoColumn = rimborsoNum > 0
  const anyLockedEmpty = covers.some((l) => l.locked && l.stake == null)
  const modeLabel =
    bonusNum > 0 && rimborsoNum > 0
      ? 'BONUS + RIMBORSO • '
      : bonusNum > 0
        ? 'BONUS • '
        : rimborsoNum > 0
          ? 'RIMBORSO • '
          : ''

  const handleChangeMode = (m: RouletteMode) => {
    setMode(m)
    setPuntaKey(undefined)
    setCoverEdits({})
  }

  const handleChangePunta = (key: string) => {
    setPuntaKey(key as RouletteLegKey)
    setCoverEdits({})
  }

  const toggleCoverLock = (key: RouletteLegKey, rounded: number | null) => {
    setCoverEdits((prev) => {
      const next = { ...prev }
      if (key in next) delete next[key]
      else next[key] = rounded != null ? rounded.toFixed(2) : ''
      return next
    })
  }

  const editCover = (key: RouletteLegKey, text: string) => {
    setCoverEdits((prev) => ({ ...prev, [key]: text }))
  }

  const updateLegAccount = useCallback((index: number, patch: Partial<LegAccountState>) => {
    setLegAccounts((prev) => prev.map((la, i) => (i === index ? { ...la, ...patch } : la)))
  }, [])

  const handleChangeHolder = useCallback(
    async (index: number, holderId: string) => {
      updateLegAccount(index, { holderId, accounts: [], accountId: '' })
      if (!holderId) return
      try {
        const accounts = await loadHolderAccounts(holderId)
        updateLegAccount(index, { accounts })
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [updateLegAccount],
  )

  useEffect(() => {
    if (!modalOpen || savedBetId) return
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
  }, [modalOpen, savedBetId, holders.length, books.length, fetchHolders, fetchAllBooks])

  const resetModalState = useCallback(() => {
    setLegAccounts([])
    setModalError(null)
    setSavedBetId(null)
    setCategoria('matched_betting')
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setLegAccounts(result.legs.map(() => emptyLegAccount()))
    setEventoData(defaultEventoData())
    setModalOpen(true)
  }

  const canSave =
    result.showSummary &&
    legAccounts.length === result.legs.length &&
    legAccounts.every((la) => la.accountId !== '') &&
    result.legs.every((l) => l.stake != null) &&
    eventoData !== ''

  const handleSendToProfitTracker = async () => {
    if (!canSave) return
    setIsSaving(true)
    setModalError(null)
    try {
      const { betPayload, legsPayload } = buildRouletteBet({
        eventoDataIso: new Date(eventoData).toISOString(),
        categoria,
        mode,
        partage: result.partageEffective,
        puntata: puntataReale,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        puntaIndex: result.puntaIndex,
        legs: result.legs.map((leg, i) => ({
          selezione: leg.spec.label,
          quota: leg.spec.odds,
          stake: leg.stake ?? 0,
          accountId: legAccounts[i].accountId,
        })),
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const coverLine = (leg: (typeof covers)[number]) => {
    const differs =
      leg.locked &&
      leg.stake != null &&
      leg.stakeRounded != null &&
      Math.abs(leg.stake - leg.stakeRounded) >= 0.005
    return (
      <p key={leg.spec.key}>
        Copri con{' '}
        <LockableAmount
          id={`roulette-cover-${leg.spec.key}`}
          amount={leg.stake ?? leg.stakeRounded}
          locked={leg.locked}
          editValue={coverEdits[leg.spec.key] ?? ''}
          onToggle={() => toggleCoverLock(leg.spec.key, leg.stakeRounded)}
          onEdit={(v) => editCover(leg.spec.key, v)}
        />{' '}
        su <span className="font-medium">{leg.spec.label}</span> a quota{' '}
        <span className="font-mono">{leg.spec.odds.toFixed(2)}</span> su un altro conto.
        {differs && (
          <span className="text-muted-foreground">
            {' '}
            (calcolata: {formatNum(leg.stakeRounded)} €)
          </span>
        )}
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Tavolo e regola */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SegmentedControl
            label="Tavolo"
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleChangeMode}
          />
          <SegmentedControl
            label="Puntata su"
            options={sideOptions}
            value={puntaSpec.key}
            onChange={handleChangePunta}
          />
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id="roulette-partage"
            checked={partage}
            disabled={!partageAvailable}
            onChange={(e) => setPartage(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="roulette-partage" className="cursor-pointer">
              Regola «la partage»
            </Label>
            <p className="text-xs text-muted-foreground">
              {partageAvailable
                ? 'Quando esce lo 0, Rosso e Nero perdono solo metà della puntata.'
                : 'Vale solo sulle puntate a pari chance: sulle dozzine lo 0 fa perdere tutto.'}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === 'rosso_nero'
            ? 'Rosso e Nero pagano 1:1 (quota 2.00), lo 0 paga 35:1 (quota 36.00). Tre conti: Rosso, Nero e 0.'
            : 'Ogni dozzina paga 2:1 (quota 3.00), lo 0 paga 35:1 (quota 36.00). Quattro conti: le tre dozzine e lo 0.'}
        </p>
      </div>

      {/* Sezione input */}
      <div className="space-y-4 border-b border-border bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <AmountField
            id="roulette-puntata"
            label="Stake reale"
            value={puntata}
            onChange={setPuntata}
          />
          <AmountField id="roulette-bonus" label="Stake bonus" value={bonus} onChange={setBonus} />
          <AmountField
            id="roulette-rimborso"
            label="Valore rimborso"
            value={rimborso}
            onChange={setRimborso}
          />
        </div>
        <ChipSelector value={chip} onChange={setChip} />
      </div>

      {/* Riepilogo */}
      {result.showSummary && result.guadagnoMinimo != null ? (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {modeLabel}Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              {result.isRimborso && result.crPercent != null
                ? `CR%: ${result.crPercent.toFixed(2)}%`
                : `Rating: ${result.rating != null ? result.rating.toFixed(2) : '—'}%`}
              <span className="text-muted-foreground">
                {' '}
                (sul risultato reale{result.partageEffective ? ', con la partage' : ''})
              </span>
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">
                {formatNum(result.puntataEffettiva)} €
              </span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} € bonus)
                </span>
              )}{' '}
              su <span className="font-medium">{puntaSpec.label}</span> a quota{' '}
              <span className="font-mono">{puntaSpec.odds.toFixed(2)}</span>.
            </p>
            {covers.map(coverLine)}
            <p>
              Il guadagno minimo sarà{' '}
              <span
                className={cn(
                  'font-mono',
                  result.guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive',
                )}
              >
                {formatSigned(result.guadagnoMinimo)} €
              </span>
            </p>
          </div>
        </div>
      ) : anyLockedEmpty ? (
        <div className="space-y-2 border-b border-border bg-card p-4 text-sm">
          <p className="text-muted-foreground">
            Copertura bloccata: scrivi l&apos;importo giocato o sblocca per tornare al valore
            calcolato.
          </p>
          {covers.map(coverLine)}
        </div>
      ) : null}

      {/* Tabella dei profitti */}
      {result.showSummary && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {modeLabel}Tabella dei profitti
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="p-2 text-left font-normal">Esce</th>
                  {result.legs.map((leg) => (
                    <th key={leg.spec.key} className="whitespace-nowrap p-2 text-right font-normal">
                      Conto {leg.spec.label}
                      {leg.isPunta ? '' : ' (cop.)'}
                    </th>
                  ))}
                  {showRimborsoColumn && <th className="p-2 text-right font-normal">Rimborso</th>}
                  <th className="p-2 text-right font-normal">Totale</th>
                </tr>
              </thead>
              <tbody>
                {result.outcomes.map((outcome, k) => (
                  <tr
                    key={outcome.spec.key}
                    className={cn(k < result.outcomes.length - 1 && 'border-b border-border')}
                  >
                    <td className="whitespace-nowrap p-2 font-medium text-foreground">
                      {outcome.spec.label}
                      {outcome.spec.isZero && result.partageEffective && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (la partage)
                        </span>
                      )}
                    </td>
                    {outcome.byLeg.map((v, i) => (
                      <td
                        key={result.legs[i].spec.key}
                        className={cn(
                          'whitespace-nowrap p-2 text-right font-mono',
                          v != null && v > 0
                            ? 'text-primary'
                            : v != null && v < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground',
                        )}
                      >
                        {formatSigned(v)}
                      </td>
                    ))}
                    {showRimborsoColumn && (
                      <td
                        className={cn(
                          'whitespace-nowrap p-2 text-right font-mono',
                          outcome.rimborso > 0 ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {formatSigned(outcome.rimborso)}
                      </td>
                    )}
                    <td
                      className={cn(
                        'whitespace-nowrap p-2 text-right font-mono font-medium',
                        outcome.profit != null && outcome.profit >= 0
                          ? 'text-primary'
                          : 'text-destructive',
                      )}
                    >
                      = {formatSigned(outcome.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invia al Profit Tracker */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={handleOpenModal} variant="default" disabled={!result.showSummary}>
          Invia al Profit Tracker
        </Button>
      </div>

      {/* Modale: un collaboratore e un conto per gamba */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
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
                    setModalOpen(false)
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
                  Salva giocata Roulette
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Assegna collaboratore e conto alla puntata su {puntaSpec.label} e a ogni
                  copertura.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="roulette-modal-data">Data e ora</Label>
                  <Input
                    id="roulette-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>

                <BetCategorySelect value={categoria} onChange={setCategoria} />

                {result.legs.map((leg, i) => {
                  const la = legAccounts[i] ?? emptyLegAccount()
                  return (
                    <LegAccounts
                      key={leg.spec.key}
                      idPrefix={`roulette-${leg.spec.key}`}
                      title={`Collaboratore ${leg.spec.label}`}
                      accountLabel={
                        leg.isPunta
                          ? `Conto ${leg.spec.label} (puntata)`
                          : `Conto ${leg.spec.label} (copertura)`
                      }
                      holders={holders}
                      books={books}
                      holderId={la.holderId}
                      accounts={la.accounts}
                      accountId={la.accountId}
                      onChangeHolder={(v) => void handleChangeHolder(i, v)}
                      onChangeAccount={(v) => updateLegAccount(i, { accountId: v })}
                      portalContainer={dropdownPortalEl}
                    />
                  )
                })}

                {result.showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      {puntaSpec.label}:{' '}
                      <span className="font-mono">{result.puntataEffettiva.toFixed(2)} €</span> a
                      quota <span className="font-mono">{puntaSpec.odds.toFixed(2)}</span>
                      {bonusNum > 0 && <> (di cui {bonusNum.toFixed(2)} € bonus)</>}
                      {rimborsoNum > 0 && <>, rimborso {rimborsoNum.toFixed(2)} €</>}
                    </p>
                    {covers.map((leg) => (
                      <p key={leg.spec.key}>
                        {leg.spec.label} (copertura):{' '}
                        <span className="font-mono">{formatNum(leg.stake)} €</span> a quota{' '}
                        <span className="font-mono">{leg.spec.odds.toFixed(2)}</span>
                        {leg.locked && <> (importo bloccato)</>}
                      </p>
                    ))}
                    {result.guadagnoMinimo != null && (
                      <p>
                        Guadagno minimo:{' '}
                        <span className="font-mono">{formatSigned(result.guadagnoMinimo)} €</span>
                      </p>
                    )}
                  </div>
                )}

                {modalError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {modalError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="outline"
                  className="sm:min-w-[100px]"
                  onClick={() => setModalOpen(false)}
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
