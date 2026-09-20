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
import { DEFAULT_CHIP } from '@/lib/calculators/engines/casino-common'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildBaccaratBet } from '@/lib/calculators/bet-payloads'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Calcolatore offline Baccarat: la puntata (reale + bonus) su Player o su
 * Banco, la copertura sull'altro lato su un altro conto. Player paga 1:1,
 * Banco 1:1 meno il 5% di commissione; il pareggio è una mano nulla. La
 * copertura è arrotondata alla fiche minima del tavolo, oppure bloccata e
 * scritta a mano; il rating è sul risultato reale. Il salvataggio nel Profit
 * Tracker assegna un collaboratore e un conto a Player e a Banco.
 */

const SIDE_OPTIONS = BACCARAT_SIDES.map((s) => ({ value: s, label: BACCARAT_SIDE_LABELS[s] }))
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
  const showRimborsoColumn = rimborsoNum > 0
  const modeLabel =
    bonusNum > 0 && rimborsoNum > 0
      ? 'BONUS + RIMBORSO • '
      : bonusNum > 0
        ? 'BONUS • '
        : rimborsoNum > 0
          ? 'RIMBORSO • '
          : ''

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

  const coverDiffers =
    result.coverLocked &&
    result.stakeCover != null &&
    result.stakeCoverRounded != null &&
    Math.abs(result.stakeCover - result.stakeCoverRounded) >= 0.005

  return (
    <div className="mx-auto max-w-2xl">
      {/* Regole del tavolo */}
      <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Player paga 1:1 (quota <span className="font-mono">{QUOTA_PLAYER_LABEL}</span>), Banco 1:1
        meno la commissione del {BACCARAT_BANCO_COMMISSION_PERCENT}% (quota{' '}
        <span className="font-mono">{QUOTA_BANCO_LABEL}</span>). La puntata va su un conto, la
        copertura sull&apos;altro. Pareggio: mano nulla, le puntate tornano indietro e si rigioca.
      </div>

      {/* Sezione input */}
      <div className="space-y-4 border-b border-border bg-muted/40 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <AmountField
            id="baccarat-puntata"
            label="Stake reale"
            value={puntata}
            onChange={setPuntata}
          />
          <AmountField id="baccarat-bonus" label="Stake bonus" value={bonus} onChange={setBonus} />
          <AmountField
            id="baccarat-rimborso"
            label="Valore rimborso"
            value={rimborso}
            onChange={setRimborso}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <SegmentedControl
            label="Puntata su"
            options={SIDE_OPTIONS}
            value={puntaSide}
            onChange={handleChangeSide}
          />
          <ChipSelector value={chip} onChange={setChip} />
        </div>
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
              <span className="text-muted-foreground"> (sul risultato reale)</span>
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
              su <span className="font-medium">{puntaLabel}</span> a quota{' '}
              <span className="font-mono">{quotaPunta}</span>.
            </p>
            <p>
              Copri con{' '}
              <LockableAmount
                id="baccarat-cover"
                amount={result.stakeCover}
                locked={coverLocked}
                editValue={coverEdit}
                onToggle={toggleCoverLock}
                onEdit={setCoverEdit}
              />{' '}
              su <span className="font-medium">{coverLabel}</span> a quota{' '}
              <span className="font-mono">{quotaCover}</span> sull&apos;altro conto.
              {coverDiffers && (
                <span className="text-muted-foreground">
                  {' '}
                  (calcolata: {formatNum(result.stakeCoverRounded)} €)
                </span>
              )}
            </p>
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
      ) : coverLocked && result.stakeCoverRounded != null ? (
        <div className="border-b border-border bg-card p-4 text-sm">
          Copertura bloccata: scrivi l&apos;importo giocato su {coverLabel}{' '}
          <LockableAmount
            id="baccarat-cover"
            amount={result.stakeCoverRounded}
            locked={coverLocked}
            editValue={coverEdit}
            onToggle={toggleCoverLock}
            onEdit={setCoverEdit}
          />
          <span className="text-muted-foreground">
            {' '}
            (calcolata: {formatNum(result.stakeCoverRounded)} €)
          </span>
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
                  <th className="p-2 text-left font-normal">Esito</th>
                  {result.legs.map((leg) => (
                    <th key={leg.side} className="whitespace-nowrap p-2 text-right font-normal">
                      Conto {leg.label}
                      {leg.isPunta ? '' : ' (copertura)'}
                    </th>
                  ))}
                  {showRimborsoColumn && <th className="p-2 text-right font-normal">Rimborso</th>}
                  <th className="p-2 text-right font-normal">Totale</th>
                </tr>
              </thead>
              <tbody>
                {result.outcomes.map((outcome) => (
                  <tr key={outcome.winner} className="border-b border-border">
                    <td className="whitespace-nowrap p-2 font-medium text-foreground">
                      {outcome.label}
                    </td>
                    {outcome.byLeg.map((v, i) => (
                      <td
                        key={result.legs[i].side}
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
                <tr>
                  <td className="p-2 text-muted-foreground">
                    Pareggio <span className="text-xs">(mano nulla, si rigioca)</span>
                  </td>
                  {result.legs.map((leg) => (
                    <td
                      key={leg.side}
                      className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground"
                    >
                      {formatSigned(0)}
                    </td>
                  ))}
                  {showRimborsoColumn && (
                    <td className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground">
                      {formatSigned(0)}
                    </td>
                  )}
                  <td className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground">
                    = {formatSigned(0)}
                  </td>
                </tr>
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
