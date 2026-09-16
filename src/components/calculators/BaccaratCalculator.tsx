'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, X } from 'lucide-react'

import {
  BACCARAT_BANCO_COMMISSION_PERCENT,
  BACCARAT_BANCO_ODDS,
  BACCARAT_PLAYER_ODDS,
  computeBaccarat,
} from '@/lib/calculators/engines/baccarat-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildBaccaratBet } from '@/lib/calculators/bet-payloads'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { Account, BetCategory, Book, Holder } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Calcolatore offline Baccarat: Player su un conto (paga 1:1), copertura con
 * Banco sull'altro (paga 1:1 meno il 5% di commissione). Il pareggio è una
 * mano nulla: le puntate tornano indietro e si rigioca. Stessi input dei
 * calcolatori sport (stake reale, stake bonus, valore rimborso); il
 * salvataggio nel Profit Tracker assegna un collaboratore e un conto alla
 * puntata Player e uno alla copertura Banco.
 */

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatSigned(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function defaultEventoData(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

const QUOTA_PLAYER_LABEL = BACCARAT_PLAYER_ODDS.toFixed(2)
const QUOTA_BANCO_LABEL = BACCARAT_BANCO_ODDS.toFixed(2)

interface LegAccountsProps {
  idPrefix: string
  title: string
  accountLabel: string
  holders: Holder[]
  books: Book[]
  holderId: string
  accounts: Account[]
  accountId: string
  onChangeHolder: (holderId: string) => void
  onChangeAccount: (accountId: string) => void
  portalContainer: HTMLDivElement | null
}

function LegAccounts({
  idPrefix,
  title,
  accountLabel,
  holders,
  books,
  holderId,
  accounts,
  accountId,
  onChangeHolder,
  onChangeAccount,
  portalContainer,
}: LegAccountsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <Label className="text-xs font-medium uppercase tracking-wide text-primary">{title}</Label>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
        <SearchableSelect
          id={`${idPrefix}-holder`}
          placeholder="Seleziona collaboratore"
          searchPlaceholder="Cerca collaboratore..."
          options={holders
            .filter((h) => h.stato === 'abilitato')
            .map((h) => ({ value: h.id, label: h.nome }))}
          value={holderId}
          onChange={onChangeHolder}
          allowEmpty={false}
          size="sm"
          className="w-full"
          portalContainer={portalContainer}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{accountLabel}</Label>
        <SearchableSelect
          id={`${idPrefix}-account`}
          placeholder={holderId ? 'Seleziona conto' : 'Seleziona prima un collaboratore'}
          searchPlaceholder="Cerca conto..."
          options={accounts.map((acc) => {
            const holderName = getHolderName(holders, acc.holderId)
            const book = books.find((b) => b.id === acc.bookId)
            return { value: acc.id, label: `${holderName} • ${book?.nome ?? acc.nome}` }
          })}
          value={accountId}
          onChange={onChangeAccount}
          disabled={!holderId || accounts.length === 0}
          allowEmpty={false}
          size="sm"
          className="w-full"
          portalContainer={portalContainer}
        />
        {holderId && accounts.length === 0 && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            Nessun conto disponibile per questo collaboratore. Aggiungine uno in Profit Tracker →
            Conti.
          </p>
        )}
      </div>
    </div>
  )
}

interface AmountFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

function AmountField({ id, label, value, onChange }: AmountFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          €
        </span>
      </div>
    </div>
  )
}

export function BaccaratCalculator() {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [puntata, setPuntata] = useState('')
  const [bonus, setBonus] = useState('')
  const [rimborso, setRimborso] = useState('')

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

  const result = useMemo(
    () => computeBaccarat({ puntata: puntataNum, bonus: bonusNum, rimborso: rimborsoNum }),
    [puntataNum, bonusNum, rimborsoNum],
  )
  const puntataReale = puntataNum ?? 0
  const showRimborsoColumn = rimborsoNum > 0
  const modeLabel =
    bonusNum > 0 && rimborsoNum > 0
      ? 'BONUS + RIMBORSO • '
      : bonusNum > 0
        ? 'BONUS • '
        : rimborsoNum > 0
          ? 'RIMBORSO • '
          : ''

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
    result.stakeBancoRounded != null &&
    accountIdPlayer !== '' &&
    accountIdBanco !== '' &&
    eventoData !== ''

  const handleSendToProfitTracker = async () => {
    if (!canSave || result.stakeBancoRounded == null) return
    setIsSaving(true)
    setModalError(null)
    try {
      const { betPayload, legsPayload } = buildBaccaratBet({
        eventoDataIso: new Date(eventoData).toISOString(),
        categoria,
        accountIdPlayer,
        accountIdBanco,
        puntata: puntataReale,
        bonus: bonusNum,
        rimborso: rimborsoNum,
        stakeBanco: result.stakeBancoRounded,
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

  const playerIfPlayer = result.returnPlayer != null ? result.returnPlayer - puntataReale : null
  const bancoIfPlayer = result.stakeBancoRounded != null ? -result.stakeBancoRounded : null
  const playerIfBanco = result.stakeBancoRounded != null ? -puntataReale : null
  const bancoIfBanco =
    result.returnBanco != null && result.stakeBancoRounded != null
      ? result.returnBanco - result.stakeBancoRounded
      : null

  return (
    <div className="mx-auto max-w-2xl">
      {/* Regole del tavolo */}
      <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Player a quota <span className="font-mono">{QUOTA_PLAYER_LABEL}</span> su un conto, Banco a
        quota <span className="font-mono">{QUOTA_BANCO_LABEL}</span> (commissione{' '}
        {BACCARAT_BANCO_COMMISSION_PERCENT}%) sull&apos;altro. Pareggio: mano nulla, le puntate
        tornano indietro e si rigioca.
      </div>

      {/* Sezione input */}
      <div className="border-b border-border bg-primary/5 p-4">
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
      </div>

      {/* Riepilogo */}
      {result.showSummary && result.guadagnoMinimo != null && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {modeLabel}Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              {result.isRimborso && result.crPercent != null
                ? `CR%: ${result.crPercent.toFixed(2)}%`
                : `Rating: ${result.rating != null ? result.rating.toFixed(2) : '—'}%`}
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
              su <span className="font-medium">Player</span> a quota{' '}
              <span className="font-mono">{QUOTA_PLAYER_LABEL}</span>.
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">
                {formatNum(result.stakeBancoRounded)} €
              </span>{' '}
              su <span className="font-medium">Banco</span> a quota{' '}
              <span className="font-mono">{QUOTA_BANCO_LABEL}</span> sull&apos;altro conto.
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
      )}

      {/* Tabella dei profitti */}
      {result.showSummary && result.profitIfPlayer != null && result.profitIfBanco != null && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {modeLabel}Tabella dei profitti
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="p-2 text-left font-normal">Esito</th>
                  <th className="p-2 text-right font-normal">Conto Player</th>
                  <th className="p-2 text-right font-normal">Conto Banco</th>
                  {showRimborsoColumn && <th className="p-2 text-right font-normal">Rimborso</th>}
                  <th className="p-2 text-right font-normal">Totale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">Vince Player</td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-primary">
                    {formatSigned(playerIfPlayer)}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-destructive">
                    {formatSigned(bancoIfPlayer)}
                  </td>
                  {showRimborsoColumn && (
                    <td className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground">
                      {formatSigned(0)}
                    </td>
                  )}
                  <td
                    className={cn(
                      'whitespace-nowrap p-2 text-right font-mono font-medium',
                      result.profitIfPlayer >= 0 ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    = {formatSigned(result.profitIfPlayer)}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">Vince Banco</td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-destructive">
                    {formatSigned(playerIfBanco)}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-primary">
                    {formatSigned(bancoIfBanco)}
                  </td>
                  {showRimborsoColumn && (
                    <td className="whitespace-nowrap p-2 text-right font-mono text-primary">
                      {formatSigned(rimborsoNum)}
                    </td>
                  )}
                  <td
                    className={cn(
                      'whitespace-nowrap p-2 text-right font-mono font-medium',
                      result.profitIfBanco >= 0 ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    = {formatSigned(result.profitIfBanco)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-muted-foreground">
                    Pareggio <span className="text-xs">(mano nulla, si rigioca)</span>
                  </td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground">
                    {formatSigned(0)}
                  </td>
                  <td className="whitespace-nowrap p-2 text-right font-mono text-muted-foreground">
                    {formatSigned(0)}
                  </td>
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
                  Assegna collaboratore e conto alla puntata Player e alla copertura Banco.
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
                  accountLabel="Conto Player"
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
                  accountLabel="Conto Banco (copertura)"
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
                      Player:{' '}
                      <span className="font-mono">{result.puntataEffettiva.toFixed(2)} €</span> a
                      quota <span className="font-mono">{QUOTA_PLAYER_LABEL}</span>
                      {bonusNum > 0 && <> (di cui {bonusNum.toFixed(2)} € bonus)</>}
                      {rimborsoNum > 0 && <>, rimborso {rimborsoNum.toFixed(2)} €</>}
                    </p>
                    <p>
                      Banco (copertura):{' '}
                      <span className="font-mono">{formatNum(result.stakeBancoRounded)} €</span> a
                      quota <span className="font-mono">{QUOTA_BANCO_LABEL}</span>
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
