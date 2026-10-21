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
import { CHIP_OPTIONS, DEFAULT_CHIP } from '@/lib/calculators/engines/casino-common'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildRouletteBet } from '@/lib/calculators/bet-payloads'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import {
  LegAccounts,
  defaultEventoData,
  formatNum,
  formatSigned,
} from '@/components/calculators/casino-shared'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import type { Account, BetCategory } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import {
  CalcChoice,
  CalcFigure,
  CalcLayout,
  CalcLockableFigure,
  CalcNumberField,
  CalcOutcomeTable,
  CalcProfits,
  CalcSwitch,
  CasinoRow,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * Calcolatore offline Roulette europea: la puntata (reale + bonus) su Rosso,
 * Nero o una dozzina, le coperture sugli altri esiti e sullo 0 su conti
 * diversi, con o senza la regola «la partage» (sul Rosso/Nero lo 0 restituisce
 * metà puntata). Le coperture sono arrotondate alla fiche minima del tavolo,
 * oppure bloccate e scritte a mano; il rating è sul risultato reale. Il
 * salvataggio assegna un collaboratore e un conto a ogni gamba (tre sul
 * Rosso/Nero, quattro sulle dozzine).
 */

const CHIP_CHOICES = CHIP_OPTIONS.map((c) => ({
  value: String(c),
  label: c < 1 ? c.toFixed(2).replace('.', ',') : String(c),
}))

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
  const anyLockedEmpty = covers.some((l) => l.locked && l.stake == null)

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

  const showCr = result.isRimborso && result.crPercent != null
  const profitRows: OutcomeProfitRow[] = result.showSummary
    ? result.outcomes.map((o) => ({
        id: o.spec.key,
        esito: `Se esce ${o.spec.isZero ? 'lo 0' : o.spec.label}${
          o.spec.isZero && result.partageEffective ? ' · la partage' : ''
        }`,
        legs: o.byLeg,
        rimborso: o.rimborso,
        totale: o.profit,
      }))
    : []
  const rowTone = (key: RouletteLegKey) =>
    key === 'rosso' ? 'red' : key === 'nero' ? 'black' : key === 'zero' ? 'profit' : 'info'

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating
        label={showCr ? 'CR' : 'Rating'}
        value={showCr ? result.crPercent : result.showSummary ? result.rating : null}
      />

      <CalcLayout
        outcomes={
          <>
            {result.legs.map((leg) => {
              const tone = rowTone(leg.spec.key)
              const dark = tone === 'red' || tone === 'black'
              return (
                <CasinoRow
                  key={leg.spec.key}
                  tone={tone}
                  caption={leg.isPunta ? 'Puntata' : 'Copertura'}
                  name={leg.spec.isZero ? 'Zero' : leg.spec.label}
                  odds={leg.spec.odds}
                  figure={
                    leg.isPunta ? (
                      <CalcFigure
                        label="Puntata"
                        live
                        onDark={dark}
                        value={amount(result.puntataEffettiva > 0 ? result.puntataEffettiva : null)}
                      />
                    ) : (
                      <CalcLockableFigure
                        id={`roulette-cover-${leg.spec.key}`}
                        label="Copertura"
                        amount={leg.stake ?? leg.stakeRounded}
                        rounded={leg.stakeRounded}
                        locked={leg.locked}
                        editValue={coverEdits[leg.spec.key] ?? ''}
                        onToggle={() => toggleCoverLock(leg.spec.key, leg.stakeRounded)}
                        onEdit={(v) => editCover(leg.spec.key, v)}
                        onDark={dark}
                      />
                    )
                  }
                />
              )
            })}
            <p className="ds-body-sm m-0 text-ds-ink-muted">
              {mode === 'rosso_nero'
                ? 'Rosso e Nero pagano 1:1 (quota 2,00), lo 0 paga 35:1 (quota 36,00). Tre conti: Rosso, Nero e 0.'
                : 'Ogni dozzina paga 2:1 (quota 3,00), lo 0 paga 35:1 (quota 36,00). Quattro conti: le tre dozzine e lo 0.'}{' '}
              Il rating è sul risultato reale.
            </p>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="roulette-puntata"
              label="Puntata reale"
              size="lg"
              suffix="€"
              value={puntata}
              onChange={setPuntata}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="roulette-bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={setBonus}
              />
              <CalcNumberField
                id="roulette-rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={setRimborso}
              />
            </div>
            <CalcChoice
              label="Tavolo"
              options={MODE_OPTIONS}
              value={mode}
              onChange={handleChangeMode}
              columns={2}
            />
            <CalcChoice
              label="Puntata su"
              options={sideOptions}
              value={puntaSpec.key}
              onChange={handleChangePunta}
            />
            <div className="border-t border-ds-line pt-3">
              <CalcSwitch
                label="Regola «la partage»"
                checked={partage}
                disabled={!partageAvailable}
                onChange={setPartage}
                hint={
                  partageAvailable
                    ? 'Quando esce lo 0, Rosso e Nero perdono solo metà della puntata.'
                    : 'Vale solo sulle puntate a pari chance: sulle dozzine lo 0 fa perdere tutto.'
                }
              />
            </div>
            <CalcChoice
              label="Fiche minima (€)"
              options={CHIP_CHOICES}
              value={String(chip)}
              onChange={(v) => setChip(Number(v))}
              columns={6}
            />
          </>
        }
      />

      <CalcProfits
        outlay={result.showSummary ? puntataReale + (result.totalCovers ?? 0) : null}
        minGain={result.showSummary ? result.guadagnoMinimo : null}
      >
        <CalcOutcomeTable
          legLabels={result.legs.map((l) => l.spec.label)}
          rows={profitRows}
          stake={puntataReale}
          emptyText={
            anyLockedEmpty
              ? "Copertura bloccata: scrivi l'importo giocato o sblocca per tornare al valore calcolato."
              : 'Il risultato compare quando la puntata è compilata.'
          }
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={handleOpenModal} disabled={!result.showSummary} />

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
                  <div className="rounded-lg border border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
