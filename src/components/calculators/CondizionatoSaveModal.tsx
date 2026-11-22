'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TeamScopeToggle } from '@/components/calculators/team-scope-toggle'
import { BetCategorySelect } from '@/components/profit-tracker/bet-category-select'
import { profitClass } from '@/components/strumenti/scanner-v2/calculator-shared'
import { loadHolderAccounts, type AccountBookFilter } from '@/lib/calculators/load-accounts'
import {
  PUNTA_BANCA_MARKET_OPTIONS,
  formatMercatoString,
  getMarketOption,
  isTeamScopedMarket,
  type TeamScope,
} from '@/lib/calculators/markets'
import { buildCondizionatoBet } from '@/lib/calculators/condizionato-bet'
import type {
  CondizionatoResult,
  CoverLegResult,
} from '@/lib/calculators/engines/condizionato-engine'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account, BetCategory, SportType } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

interface CondizionatoSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stake: number
  odds: number
  refund: number
  result: CondizionatoResult
}

/** Una gamba da assegnare: la qualificante o una copertura. */
interface Slot {
  key: string
  title: string
  summary: string
  /** Quali conti offrire: exchange per le bancate, book per la qualificante, tutti per le punte. */
  filter: AccountBookFilter
  /** La bancata unica della qualificante banca lo stesso esito: prende il suo mercato. */
  followsQualifier: boolean
}

interface Assignment {
  mercato: string
  scope: TeamScope | ''
  holderId: string
  accounts: Account[]
  accountId: string
}

const EMPTY_ASSIGNMENT: Assignment = {
  mercato: '',
  scope: '',
  holderId: '',
  accounts: [],
  accountId: '',
}

const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`
const odd = (n: number) => n.toFixed(2).replace('.', ',')

/** «YYYY-MM-DDTHH:mm» di adesso nel fuso del browser: l'ora proposta per l'evento. */
function defaultEventoDataLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function legSummary(leg: CoverLegResult): string {
  return leg.mode === 'banca'
    ? `Banca ${eur(leg.stake)} a ${odd(leg.odds)} · resp. ${eur(leg.liability)}`
    : `Punta ${eur(leg.stake)} a ${odd(leg.odds)}`
}

function coverSlots(
  prefix: string,
  base: string,
  legs: CoverLegResult[],
  canFollow: boolean,
): Slot[] {
  return legs.map((leg, i) => ({
    key: `${prefix}${i}`,
    title: legs.length > 1 ? `${base} ${i + 1}` : base,
    summary: legSummary(leg),
    filter: leg.mode === 'banca' ? 'exchange' : 'all',
    followsQualifier: canFollow && leg.mode === 'banca' && legs.length === 1,
  }))
}

/**
 * Il salvataggio del calcolatore Condizionato (§14.352): evento, categoria e condizione, poi per
 * ogni gamba il mercato e il conto (collaboratore e conto, exchange per le bancate). La giocata va
 * nel Profit Tracker in bozza con `buildCondizionatoBet`. Il chiamante la monta a ogni apertura.
 */
export function CondizionatoSaveModal({
  open,
  onOpenChange,
  stake,
  odds,
  refund,
  result,
}: CondizionatoSaveModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [eventoNome, setEventoNome] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoDataLocal())
  const [competizione, setCompetizione] = useState('')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [condizione, setCondizione] = useState('')
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null)

  const slots = useMemo<Slot[]>(
    () => [
      {
        key: 'q',
        title: 'Qualificante',
        summary: `Punta ${eur(stake)} a ${odd(odds)} · rimborso ${eur(refund)}`,
        filter: 'non-exchange',
        followsQualifier: false,
      },
      ...coverSlots('qc', 'Copertura qualificante', result.qualifierCovers, true),
      ...coverSlots('cc', 'Copertura condizione', result.conditionCovers, false),
    ],
    [stake, odds, refund, result],
  )

  // Collaboratori e book una volta, all'apertura; le liste restano nello store.
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

  const get = (key: string) => assignments[key] ?? EMPTY_ASSIGNMENT
  const patch = (key: string, next: Partial<Assignment>) =>
    setAssignments((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_ASSIGNMENT), ...next } }))

  const changeHolder = async (slot: Slot, holderId: string) => {
    patch(slot.key, { holderId, accounts: [], accountId: '' })
    if (!holderId) return
    try {
      const list = await loadHolderAccounts(holderId, slot.filter)
      patch(slot.key, { accounts: list })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
    }
  }

  /** Il mercato salvato di una gamba: quello scelto, quello della qualificante o «—». */
  const mercatoOf = (slot: Slot): string => {
    const own = slot.followsQualifier ? get('q') : get(slot.key)
    return formatMercatoString(own.mercato, own.scope) || '—'
  }

  const kickoff = eventoData ? new Date(eventoData) : null
  const kickoffValid = kickoff != null && !Number.isNaN(kickoff.getTime())
  const canSave =
    eventoNome.trim() !== '' &&
    kickoffValid &&
    get('q').mercato !== '' &&
    slots.every((slot) => get(slot.key).accountId !== '') &&
    !saving

  const handleSave = async () => {
    if (!canSave || !kickoff) return
    setSaving(true)
    setError(null)
    try {
      const sport: SportType = getMarketOption(get('q').mercato)?.sport ?? 'altro'
      const cover = (prefix: string, legs: CoverLegResult[]) =>
        legs.map((leg, i) => {
          const slot = slots.find((s) => s.key === `${prefix}${i}`)!
          return { mercato: mercatoOf(slot), accountId: get(slot.key).accountId, leg }
        })
      const { betPayload, legsPayload } = buildCondizionatoBet({
        eventoDataIso: kickoff.toISOString(),
        eventoNome: eventoNome.trim(),
        competizione: competizione.trim() || 'N/D',
        sport,
        categoria,
        qualifier: {
          mercato: mercatoOf(slots[0]),
          accountId: get('q').accountId,
          stake,
          odds,
          refund,
        },
        qualifierCovers: cover('qc', result.qualifierCovers),
        conditionCovers: cover('cc', result.conditionCovers),
        condizione,
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
  const holderOptions = holders
    .filter((h) => h.stato === 'abilitato')
    .map((h) => ({ value: h.id, label: h.nome }))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
        {/* Contenitore dei menu SearchableSelect dentro la finestra (Radix blocca il body). */}
        <div ref={setPortalEl} className="pointer-events-none fixed inset-0 z-9998" aria-hidden />
        {savedBetId ? (
          <>
            <div className="px-6 pt-6 pb-4">
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
            <div className="px-6 pt-6 pb-1">
              <DialogTitle className="text-lg font-medium tracking-[-0.012em] text-foreground">
                Salva giocata Condizionato
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                I dati dell&apos;evento, poi mercato e conto di ogni gamba. La condizione finisce
                nella nota della giocata.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="cond-modal-evento">Nome evento</Label>
                <Input
                  id="cond-modal-evento"
                  type="text"
                  placeholder="Es. Juventus - Milan"
                  value={eventoNome}
                  onChange={(e) => setEventoNome(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cond-modal-data">Data e ora evento</Label>
                  <Input
                    id="cond-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cond-modal-competizione">Competizione (facoltativa)</Label>
                  <Input
                    id="cond-modal-competizione"
                    type="text"
                    placeholder="Es. Coppa Italia"
                    value={competizione}
                    onChange={(e) => setCompetizione(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cond-modal-condizione">Condizione del rimborso (facoltativa)</Label>
                <Input
                  id="cond-modal-condizione"
                  type="text"
                  placeholder="Es. tempi supplementari"
                  value={condizione}
                  onChange={(e) => setCondizione(e.target.value)}
                  className="h-10"
                />
              </div>

              <BetCategorySelect value={categoria} onChange={setCategoria} />

              {slots.map((slot) => {
                const a = get(slot.key)
                const exchange = slot.filter === 'exchange'
                return (
                  <div
                    key={slot.key}
                    className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <Label
                        className={cn(
                          'font-mono text-xs font-medium tracking-[0.02em] uppercase',
                          exchange ? 'text-destructive' : 'text-primary',
                        )}
                      >
                        {slot.title}
                      </Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {slot.summary}
                      </span>
                    </div>

                    {slot.followsQualifier ? (
                      <p className="text-xs text-muted-foreground">
                        Mercato: lo stesso della qualificante.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Mercato{slot.key === 'q' ? '' : ' (facoltativo)'}
                        </Label>
                        <SearchableSelect
                          id={`cond-${slot.key}-mercato`}
                          placeholder="Seleziona"
                          searchPlaceholder="Cerca mercato..."
                          options={PUNTA_BANCA_MARKET_OPTIONS}
                          value={a.mercato}
                          onChange={(v) =>
                            patch(slot.key, {
                              mercato: v,
                              scope: isTeamScopedMarket(v) ? a.scope || 'CASA' : '',
                            })
                          }
                          size="sm"
                          className="w-full"
                          portalContainer={portalEl}
                        />
                        {isTeamScopedMarket(a.mercato) && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Squadra</span>
                            <TeamScopeToggle
                              value={a.scope}
                              onChange={(scope) => patch(slot.key, { scope })}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Collaboratore</Label>
                        <SearchableSelect
                          id={`cond-${slot.key}-holder`}
                          placeholder="Seleziona"
                          searchPlaceholder="Cerca collaboratore..."
                          options={holderOptions}
                          value={a.holderId}
                          onChange={(val) => void changeHolder(slot, val)}
                          allowEmpty={false}
                          size="sm"
                          className="w-full"
                          portalContainer={portalEl}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {exchange ? 'Conto exchange' : 'Conto'}
                        </Label>
                        <SearchableSelect
                          id={`cond-${slot.key}-account`}
                          placeholder={a.holderId ? 'Seleziona conto' : 'Prima il collaboratore'}
                          searchPlaceholder="Cerca conto..."
                          options={a.accounts.map((acc) => {
                            const book = books.find((b) => b.id === acc.bookId)
                            return {
                              value: acc.id,
                              label: `${holderNameOf(acc.holderId)} • ${book?.nome ?? acc.nome}`,
                            }
                          })}
                          value={a.accountId}
                          onChange={(v) => patch(slot.key, { accountId: v })}
                          disabled={!a.holderId || a.accounts.length === 0}
                          allowEmpty={false}
                          size="sm"
                          className="w-full"
                          portalContainer={portalEl}
                        />
                      </div>
                    </div>
                    {a.holderId && a.accounts.length === 0 && (
                      <p className="rounded-md bg-ds-warning-soft px-3 py-2 text-xs text-ds-warning">
                        {exchange
                          ? 'Nessun conto exchange per questo collaboratore.'
                          : 'Nessun conto disponibile per questo collaboratore.'}{' '}
                        Aggiungine uno in Profit Tracker &rarr; Conti.
                      </p>
                    )}
                  </div>
                )
              })}

              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                Esborso totale <span className="font-mono">{eur(result.outlay)}</span> · guadagno
                minimo{' '}
                <span className={cn('font-mono', profitClass(result.minProfit))}>
                  {eur(result.minProfit)}
                </span>
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
