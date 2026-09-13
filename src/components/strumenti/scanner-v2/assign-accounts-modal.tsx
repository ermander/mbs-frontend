'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Send, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { getAccounts } from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { resolveProfitTrackerBook, shortBookmakerName } from '@/lib/bookmakers'
import type { Account } from '@/types/profit-tracker'
import { cn } from '@/lib/utils'

export type AssignTone = 'primary' | 'destructive' | 'sky'

export interface AssignLeg {
  key: string
  /** «Punta», «Banca», «Punta 1»… */
  title: string
  /** What the leg bets on, for the card subtitle. */
  detail: string
  bookmaker: { slug: string; name: string; isExchange: boolean }
  tone: AssignTone
}

interface AssignAccountsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  legs: AssignLeg[]
  /** Called with one account id per leg key; the caller saves and reports through the props below. */
  onConfirm: (accountIds: Record<string, string>) => void
  saving: boolean
  error: string | null
  savedBetId: string | null
  /** Closes both this modal and the calculator behind it. */
  onDone: () => void
}

const TONES: Record<AssignTone, { box: string; label: string; badge: string }> = {
  primary: {
    box: 'border-primary/20 bg-primary/5',
    label: 'text-primary',
    badge: 'bg-primary/15 text-primary',
  },
  destructive: {
    box: 'border-destructive/20 bg-destructive/5',
    label: 'text-destructive',
    badge: 'bg-destructive/15 text-destructive',
  },
  sky: {
    box: 'border-sky-500/20 bg-sky-500/5',
    label: 'text-sky-300',
    badge: 'bg-sky-500/15 text-sky-300',
  },
}

interface LegAccounts {
  bookId: string | null
  bookName: string | null
  accounts: Account[]
}

/**
 * «Assegna collaboratori» of the scanner v2: one account per leg, the accounts
 * of the Profit Tracker book behind each bookmaker (linked by external id or by
 * name, see `resolveProfitTrackerBook`). Generalises the sub-modal of the old
 * Oddsmatcher calculator to two or three legs.
 */
export function AssignAccountsModal({
  open,
  onOpenChange,
  legs,
  onConfirm,
  saving,
  error,
  savedBetId,
  onDone,
}: AssignAccountsModalProps) {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [byLeg, setByLeg] = useState<Record<string, LegAccounts>>({})
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null)

  const legsKey = useMemo(() => legs.map((l) => `${l.key}:${l.bookmaker.slug}`).join('|'), [legs])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      setSelected({})
      try {
        if (holders.length === 0) await fetchHolders()
        let resolvedBooks = books
        if (resolvedBooks.length === 0) {
          await fetchAllBooks()
          resolvedBooks = useProfitTrackerStore.getState().allBooks
        }
        const next: Record<string, LegAccounts> = {}
        for (const leg of legs) {
          const book = resolveProfitTrackerBook(resolvedBooks, leg.bookmaker)
          if (!book) {
            next[leg.key] = { bookId: null, bookName: null, accounts: [] }
            continue
          }
          const res = await getAccounts({ bookId: book.id })
          next[leg.key] = { bookId: book.id, bookName: book.nome, accounts: res.items }
        }
        if (!cancelled) setByLeg(next)
      } catch (err) {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // legsKey stands for `legs`: a new array with the same legs must not reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, legsKey, books, holders.length, fetchAllBooks, fetchHolders])

  const allChosen = legs.every((l) => selected[l.key])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md gap-0 p-0" showClose={true}>
        {/* Portal container per dropdown SearchableSelect dentro la modale */}
        <div ref={setPortalEl} className="pointer-events-none fixed inset-0 z-[9998]" aria-hidden />
        {savedBetId ? (
          <>
            <div className="px-6 pb-4 pt-6">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
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
              <Button variant="outline" onClick={onDone}>
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
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Assegna collaboratori
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Scegli il conto per ogni gamba. Potrai aggiungere altre puntate o bancate dal
                dettaglio della giocata.
              </p>
            </div>

            <div className="grid gap-3 px-6 py-5">
              {legs.map((leg) => {
                const tone = TONES[leg.tone]
                const info = byLeg[leg.key]
                const bookmakerName = shortBookmakerName(leg.bookmaker.name)
                return (
                  <div key={leg.key} className={cn('space-y-2 rounded-xl border p-4', tone.box)}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Label
                          className={cn('text-xs font-medium uppercase tracking-wide', tone.label)}
                        >
                          {leg.title}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">{leg.detail}</p>
                      </div>
                      <span
                        className={cn('rounded-md px-2 py-0.5 text-xs font-medium', tone.badge)}
                      >
                        {bookmakerName}
                      </span>
                    </div>
                    <SearchableSelect
                      options={(info?.accounts ?? []).map((acc) => {
                        const holder = holders.find((h) => h.id === acc.holderId)
                        return { value: acc.id, label: holder?.nome ?? acc.nome }
                      })}
                      value={selected[leg.key] ?? ''}
                      onChange={(value) => setSelected((prev) => ({ ...prev, [leg.key]: value }))}
                      placeholder="Seleziona collaboratore"
                      searchPlaceholder="Cerca collaboratore…"
                      allowEmpty={false}
                      portalContainer={portalEl}
                    />
                    {info && info.bookId == null && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun libro del Profit Tracker corrisponde a {bookmakerName}. Collegalo dal
                        backoffice (External ID «{leg.bookmaker.slug}») o chiama il libro come il
                        bookmaker.
                      </p>
                    )}
                    {info && info.bookId != null && info.accounts.length === 0 && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
                        Nessun conto su {info.bookName}. Aggiungine uno in Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {(error || loadError) && (
              <div className="mx-6 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{error ?? loadError}</p>
              </div>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
              <Button
                variant="outline"
                className="sm:min-w-[100px]"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Annulla
              </Button>
              <Button
                variant="success"
                className="sm:min-w-[120px]"
                onClick={() => onConfirm(selected)}
                disabled={saving || !allChosen}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Salvataggio…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Invia
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
