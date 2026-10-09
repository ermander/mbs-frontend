'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { formatNum, profitClass } from '@/components/strumenti/scanner-v2/calculator-shared'
import { buildDutchBet } from '@/lib/calculators/bet-payloads'
import { loadHolderAccounts } from '@/lib/calculators/load-accounts'
import { RESULT_BTTS_MARKET_LABEL, resultBttsOfflineEventInfo } from '@/lib/result-btts'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

/** A covered leg as the calculator hands it over: priced and staked. */
export interface ResultBttsOfflineLeg {
  label: string
  odds: number
  stake: number
}

interface ResultBttsOfflineSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  legs: ResultBttsOfflineLeg[]
  puntaIndex: number
  puntata: number
  totalOutlay: number
  guadagnoMinimo: number
}

/** «YYYY-MM-DDTHH:mm» of now in the browser's time zone: the default kickoff of the bet. */
function defaultEventoDataLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/**
 * The save modal of the offline «Risultato + Goal» calculator (§14.220):
 * the event typed by the admin (name, kickoff, competition) and one account
 * for the five legs, since the whole dutch lives inside one bookmaker; the
 * bet goes to the Profit Tracker as a surebet through `buildDutchBet`, like
 * the calculator of the page. The caller mounts it fresh at every opening.
 */
export function ResultBttsOfflineSaveModal({
  open,
  onOpenChange,
  legs,
  puntaIndex,
  puntata,
  totalOutlay,
  guadagnoMinimo,
}: ResultBttsOfflineSaveModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [eventoNome, setEventoNome] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoDataLocal())
  const [competizione, setCompetizione] = useState('')
  const [holderId, setHolderId] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null)

  // Collaborators and books once, when the modal opens; the lists are cached in the store.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const state = useProfitTrackerStore.getState()
        if (state.allHolders.length === 0) await state.fetchAllHolders()
        if (state.allBooks.length === 0) await state.fetchAllBooks()
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Errore nel caricamento dei collaboratori')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleChangeHolder = useCallback(async (nextHolderId: string) => {
    setHolderId(nextHolderId)
    setAccounts([])
    setAccountId('')
    if (!nextHolderId) return
    try {
      // Every leg is a back bet: any book of the collaborator, an exchange included.
      const list = await loadHolderAccounts(nextHolderId, 'all')
      setAccounts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
    }
  }, [])

  const event = useMemo(
    () => resultBttsOfflineEventInfo({ eventoNome, eventoDataLocal: eventoData, competizione }),
    [eventoNome, eventoData, competizione],
  )
  const canSave = event != null && accountId !== '' && !saving

  const handleSave = async () => {
    if (!event || !accountId) return
    setSaving(true)
    setError(null)
    try {
      const { betPayload, legsPayload } = buildDutchBet({
        event,
        categoria: 'surebet',
        puntaIndex,
        puntata,
        bonus: 0,
        rimborso: 0,
        legs: legs.map((leg) => ({
          selezione: leg.label,
          quotaGross: leg.odds,
          commissionePercent: 0,
          accountId,
          stake: leg.stake,
        })),
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const holderNameOf = (id: string) => holders.find((h) => h.id === id)?.nome ?? ''

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
        {/* Portal container for the SearchableSelect dropdowns inside the modal */}
        <div ref={setPortalEl} className="pointer-events-none fixed inset-0 z-[9998]" aria-hidden />
        {savedBetId ? (
          <>
            <div className="px-6 pb-4 pt-6">
              <DialogTitle className="text-lg font-medium tracking-[-0.012em] text-foreground">
                Giocata salvata
              </DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                La giocata è stata salvata nel Profit Tracker come bozza.
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Chiudi
              </Button>
            </div>
          </>
        ) : loading ? (
          <>
            <DialogTitle className="sr-only">Caricamento</DialogTitle>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pb-1 pt-6">
              <DialogTitle className="text-lg font-medium tracking-[-0.012em] text-foreground">
                Salva giocata Risultato + Goal
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                I dati dell&apos;evento e il conto del bookmaker: le cinque gambe vanno sullo stesso
                conto, categoria surebet.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="rbo-modal-evento">Nome evento</Label>
                <Input
                  id="rbo-modal-evento"
                  type="text"
                  placeholder="Es. Genoa - Como"
                  value={eventoNome}
                  onChange={(e) => setEventoNome(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rbo-modal-data">Data e ora evento</Label>
                <Input
                  id="rbo-modal-data"
                  type="datetime-local"
                  value={eventoData}
                  onChange={(e) => setEventoData(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rbo-modal-competizione">Competizione (facoltativa)</Label>
                <Input
                  id="rbo-modal-competizione"
                  type="text"
                  placeholder="Es. Serie A"
                  value={competizione}
                  onChange={(e) => setCompetizione(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                <Label className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-primary">
                  Collaboratore (tutte le gambe)
                </Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleziona collaboratore</Label>
                  <SearchableSelect
                    id="rbo-holder"
                    placeholder="Seleziona collaboratore"
                    searchPlaceholder="Cerca collaboratore..."
                    options={holders
                      .filter((h) => h.stato === 'abilitato')
                      .map((h) => ({ value: h.id, label: h.nome }))}
                    value={holderId}
                    onChange={(val) => void handleChangeHolder(val)}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={portalEl}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Conto del bookmaker</Label>
                  <SearchableSelect
                    id="rbo-account"
                    placeholder={holderId ? 'Seleziona conto' : 'Seleziona prima un collaboratore'}
                    searchPlaceholder="Cerca conto..."
                    options={accounts.map((acc) => {
                      const book = books.find((b) => b.id === acc.bookId)
                      return {
                        value: acc.id,
                        label: `${holderNameOf(acc.holderId)} • ${book?.nome ?? acc.nome}`,
                      }
                    })}
                    value={accountId}
                    onChange={setAccountId}
                    disabled={!holderId || accounts.length === 0}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={portalEl}
                  />
                  {holderId && accounts.length === 0 && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                      Nessun conto disponibile per questo collaboratore. Aggiungine uno in Profit
                      Tracker &rarr; Conti.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Riepilogo importi · {RESULT_BTTS_MARKET_LABEL}
                </p>
                {legs.map((leg, i) => (
                  <p key={leg.label} className="mt-1">
                    {i === puntaIndex ? 'Puntata' : 'Copertura'}{' '}
                    <span className="font-medium text-foreground">{leg.label}</span>:{' '}
                    <span className="font-mono">{formatNum(leg.stake)} &euro;</span> a quota{' '}
                    <span className="font-mono">{formatNum(leg.odds)}</span>
                  </p>
                ))}
                <p className="mt-2">
                  Esborso totale <span className="font-mono">{formatNum(totalOutlay)} &euro;</span>{' '}
                  · guadagno minimo{' '}
                  <span className={cn('font-mono', profitClass(guadagnoMinimo))}>
                    {formatNum(guadagnoMinimo)} &euro;
                  </span>
                </p>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Annulla
              </Button>
              <Button onClick={() => void handleSave()} disabled={!canSave}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Salva nel Profit Tracker
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
