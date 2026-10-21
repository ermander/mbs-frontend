'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'

import {
  BACCARAT_BANCO_COMMISSION_PERCENT,
  BACCARAT_BANCO_ODDS,
  BACCARAT_PLAYER_ODDS,
  BACCARAT_SIDES,
  BACCARAT_SIDE_LABELS,
  computeBaccarat,
  type BaccaratSide,
} from '@/lib/calculators/engines/baccarat-engine'
import { CHIP_OPTIONS, DEFAULT_CHIP } from '@/lib/calculators/engines/casino-common'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildBaccaratBet } from '@/lib/calculators/bet-payloads'
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
  CasinoRow,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { formatOdds } from '@/lib/landing-format'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * Calcolatore offline Baccarat: la puntata (reale + bonus) su Player o su
 * Banco, la copertura sull'altro lato su un altro conto. Player paga 1:1,
 * Banco 1:1 meno il 5% di commissione; il pareggio è una mano nulla. La
 * copertura è arrotondata alla fiche minima del tavolo, oppure bloccata e
 * scritta a mano; il rating è sul risultato reale. Il salvataggio nel Profit
 * Tracker assegna un collaboratore e un conto a Player e a Banco.
 */

const SIDE_OPTIONS = BACCARAT_SIDES.map((s) => ({ value: s, label: BACCARAT_SIDE_LABELS[s] }))
const CHIP_CHOICES = CHIP_OPTIONS.map((c) => ({
  value: String(c),
  label: c < 1 ? c.toFixed(2).replace('.', ',') : String(c),
}))
const QUOTA_PLAYER_LABEL = BACCARAT_PLAYER_ODDS.toFixed(2)
const QUOTA_BANCO_LABEL = BACCARAT_BANCO_ODDS.toFixed(2)

export function BaccaratCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [puntata, setPuntata] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [puntaSide, setPuntaSide] = useState<BaccaratSide>('player')
  const [chip, setChip] = useState<number>(DEFAULT_CHIP)
  const [coverLocked, setCoverLocked] = useState(false)
  const [coverEdit, setCoverEdit] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [holderIdPlayer, setHolderIdPlayer] = useState('')
  const [holderIdBanco, setHolderIdBanco] = useState('')
  const [accountsPlayer, setAccountsPlayer] = useState<Account[]>([])
  const [accountsBanco, setAccountsBanco] = useState<Account[]>([])
  const [accountIdPlayer, setAccountIdPlayer] = useState('')
  const [accountIdBanco, setAccountIdBanco] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const coverOverride = parseNum(coverEdit)

  const result = useMemo(
    () =>
      computeBaccarat({
        puntata: puntataNum,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        puntaSide,
        chip,
        coverLocked,
        coverOverride,
      }),
    [puntataNum, bonusNum, rimborsoNum, puntaSide, chip, coverLocked, coverOverride],
  )
  const puntataReale = puntataNum ?? 0
  const puntaLabel = BACCARAT_SIDE_LABELS[result.puntaSide]
  const coverLabel = BACCARAT_SIDE_LABELS[result.coverSide]
  const quotaPunta = result.puntaSide === 'player' ? QUOTA_PLAYER_LABEL : QUOTA_BANCO_LABEL
  const quotaCover = result.coverSide === 'player' ? QUOTA_PLAYER_LABEL : QUOTA_BANCO_LABEL

  const handleChangeSide = (side: BaccaratSide) => {
    setPuntaSide(side)
    setCoverLocked(false)
  }

  const toggleCoverLock = () => {
    if (coverLocked) {
      setCoverLocked(false)
      return
    }
    setCoverEdit(result.stakeCoverRounded != null ? result.stakeCoverRounded.toFixed(2) : '')
    setCoverLocked(true)
  }

  const handleChangeHolderPlayer = useCallback(async (holderId: string) => {
    setHolderIdPlayer(holderId)
    setAccountsPlayer([])
    setAccountIdPlayer('')
    if (!holderId) return
    try {
      setAccountsPlayer(await loadHolderAccounts(holderId))
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
    }
  }, [])

  const handleChangeHolderBanco = useCallback(async (holderId: string) => {
    setHolderIdBanco(holderId)
    setAccountsBanco([])
    setAccountIdBanco('')
    if (!holderId) return
    try {
      setAccountsBanco(await loadHolderAccounts(holderId))
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
    }
  }, [])

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
    setHolderIdPlayer('')
    setHolderIdBanco('')
    setAccountsPlayer([])
    setAccountsBanco([])
    setAccountIdPlayer('')
    setAccountIdBanco('')
    setModalError(null)
    setSavedBetId(null)
    setCategoria('matched_betting')
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setEventoData(defaultEventoData())
    setModalOpen(true)
  }

  const canSave =
    result.showSummary &&
    result.stakeCover != null &&
    accountIdPlayer !== '' &&
    accountIdBanco !== '' &&
    eventoData !== ''

  const handleSendToProfitTracker = async () => {
    if (!canSave || result.stakeCover == null) return
    setIsSaving(true)
    setModalError(null)
    try {
      const { betPayload, legsPayload } = buildBaccaratBet({
        eventoDataIso: new Date(eventoData).toISOString(),
        categoria,
        puntaSide: result.puntaSide,
        accountIdPlayer,
        accountIdBanco,
        puntata: puntataReale,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        stakeCover: result.stakeCover,
        quotaPlayer: BACCARAT_PLAYER_ODDS,
        quotaBanco: BACCARAT_BANCO_ODDS,
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
  const puntaLeg = result.legs.find((l) => l.isPunta)
  const coverLeg = result.legs.find((l) => !l.isPunta)
  const profitRows: OutcomeProfitRow[] = result.showSummary
    ? [
        ...result.outcomes.map((o) => ({
          id: o.winner,
          esito: o.label,
          legs: o.byLeg,
          rimborso: o.rimborso,
          totale: o.profit,
        })),
        {
          id: 'pareggio',
          esito: 'Pareggio · mano nulla, si rigioca',
          legs: result.legs.map(() => 0),
          rimborso: 0,
          totale: 0,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating
        label={showCr ? 'CR' : 'Rating'}
        value={showCr ? result.crPercent : result.showSummary ? result.rating : null}
      />

      <CalcLayout
        outcomes={
          <>
            {puntaLeg && (
              <CasinoRow
                tone="info"
                caption="Puntata"
                name={puntaLeg.label}
                odds={puntaLeg.odds}
                figure={
                  <CalcFigure
                    label="Puntata"
                    live
                    value={amount(result.puntataEffettiva > 0 ? result.puntataEffettiva : null)}
                  />
                }
              />
            )}
            {coverLeg && (
              <CasinoRow
                tone="loss"
                caption="Copertura"
                name={coverLeg.label}
                odds={coverLeg.odds}
                figure={
                  <CalcLockableFigure
                    id="baccarat-cover"
                    label="Copertura"
                    amount={result.stakeCover}
                    rounded={result.stakeCoverRounded}
                    locked={coverLocked}
                    editValue={coverEdit}
                    onToggle={toggleCoverLock}
                    onEdit={setCoverEdit}
                  />
                }
              />
            )}
            <p className="ds-body-sm m-0 text-ds-ink-muted">
              {puntaLabel} su un conto, {coverLabel} sull&apos;altro. Player paga 1:1 (quota{' '}
              {formatOdds(BACCARAT_PLAYER_ODDS)}), Banco 1:1 meno la commissione del{' '}
              {BACCARAT_BANCO_COMMISSION_PERCENT} % (quota {formatOdds(BACCARAT_BANCO_ODDS)}).
              Pareggio: mano nulla, le puntate tornano indietro e si rigioca. Il rating è sul
              risultato reale.
            </p>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="baccarat-puntata"
              label="Puntata reale"
              size="lg"
              suffix="€"
              value={puntata}
              onChange={setPuntata}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="baccarat-bonus"
                label="Puntata bonus"
                suffix="€"
                value={bonus}
                onChange={setBonus}
              />
              <CalcNumberField
                id="baccarat-rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={setRimborso}
              />
            </div>
            <CalcChoice
              label="Puntata su"
              options={SIDE_OPTIONS}
              value={puntaSide}
              onChange={handleChangeSide}
            />
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
        outlay={result.showSummary ? puntataReale + (result.stakeCover ?? 0) : null}
        minGain={result.showSummary ? result.guadagnoMinimo : null}
      >
        <CalcOutcomeTable
          legLabels={result.legs.map((l) => l.label)}
          rows={profitRows}
          stake={puntataReale}
          emptyText={
            coverLocked && result.stakeCover == null
              ? "Copertura bloccata: scrivi l'importo giocato o sblocca per tornare al valore calcolato."
              : 'Il risultato compare quando la puntata è compilata.'
          }
        />
      </CalcProfits>

      <CalculatorSaveAction onClick={handleOpenModal} disabled={!result.showSummary} />

      {/* Modale: collaboratori e conti di Player e Banco */}
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
                  Salva giocata Baccarat
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Assegna collaboratore e conto alla puntata su {puntaLabel} e alla copertura su{' '}
                  {coverLabel}.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="baccarat-modal-data">Data e ora</Label>
                  <Input
                    id="baccarat-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>

                <BetCategorySelect value={categoria} onChange={setCategoria} />

                <LegAccounts
                  idPrefix="baccarat-player"
                  title="Collaboratore Player"
                  accountLabel={
                    result.puntaSide === 'player'
                      ? 'Conto Player (puntata)'
                      : 'Conto Player (copertura)'
                  }
                  holders={holders}
                  books={books}
                  holderId={holderIdPlayer}
                  accounts={accountsPlayer}
                  accountId={accountIdPlayer}
                  onChangeHolder={(v) => void handleChangeHolderPlayer(v)}
                  onChangeAccount={setAccountIdPlayer}
                  portalContainer={dropdownPortalEl}
                />

                <LegAccounts
                  idPrefix="baccarat-banco"
                  title="Collaboratore Banco"
                  accountLabel={
                    result.puntaSide === 'banco'
                      ? 'Conto Banco (puntata)'
                      : 'Conto Banco (copertura)'
                  }
                  holders={holders}
                  books={books}
                  holderId={holderIdBanco}
                  accounts={accountsBanco}
                  accountId={accountIdBanco}
                  onChangeHolder={(v) => void handleChangeHolderBanco(v)}
                  onChangeAccount={setAccountIdBanco}
                  portalContainer={dropdownPortalEl}
                />

                {result.showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      {puntaLabel}:{' '}
                      <span className="font-mono">{result.puntataEffettiva.toFixed(2)} €</span> a
                      quota <span className="font-mono">{quotaPunta}</span>
                      {bonusNum > 0 && <> (di cui {bonusNum.toFixed(2)} € bonus)</>}
                      {rimborsoNum > 0 && <>, rimborso {rimborsoNum.toFixed(2)} €</>}
                    </p>
                    <p>
                      {coverLabel} (copertura):{' '}
                      <span className="font-mono">{formatNum(result.stakeCover)} €</span> a quota{' '}
                      <span className="font-mono">{quotaCover}</span>
                      {result.coverLocked && <> (importo bloccato)</>}
                    </p>
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
