'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  adminCollaboratorsClient,
  type Collaborator,
  type CollaboratorShares,
  type BackfillOperatorResult,
  type CapitalSummary,
  type PayoutEntry,
  type PayoutRecipient,
} from '@/services/api/admin-collaborators-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getApiErrorMessage(e: unknown): string | undefined {
  const err = e as { response?: { data?: { message?: string; errors?: string[] } } }
  return err?.response?.data?.message ?? err?.response?.data?.errors?.[0]
}

export default function BackofficeCollaboratoriPage() {
  const [items, setItems] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTab, setEditTab] = useState<'data' | 'accounts' | 'wallets' | 'share' | 'capital'>(
    'data',
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminCollaboratorsClient.list()
      setItems(data)
    } catch {
      setError('Errore nel caricamento dei collaboratori.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    void fetchAllAccounts()
    void fetchWallets()
  }, [load, fetchAllAccounts, fetchWallets])

  const editing = useMemo(() => items.find((c) => c.id === editingId) ?? null, [items, editingId])

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Collaboratori</h2>
          <p className="text-sm text-muted-foreground">
            Gestisci i collaboratori che lavorano per te: dati di accesso, conti/wallet condivisi e
            quota di profitto.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nuovo collaboratore</Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Quota %</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Conti condivisi
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Wallet condivisi
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Stato</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Creato</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun collaboratore. Creane uno per iniziare.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t border-border transition-colors hover:bg-accent">
                  <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-2 text-foreground">{c.username}</td>
                  <td className="px-4 py-2 text-foreground">
                    {c.profitSharePercentage != null ? `${c.profitSharePercentage}%` : '—'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{c.accountSharesCount}</td>
                  <td className="px-4 py-2 text-foreground">{c.walletSharesCount}</td>
                  <td className="px-4 py-2">
                    <Badge variant={c.status === 'active' ? 'default' : 'outline'}>
                      {c.status === 'active' ? 'Attivo' : 'Disabilitato'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-foreground">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(c.id)
                        setEditTab('data')
                      }}
                    >
                      Modifica
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateCollaboratorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          void load()
        }}
      />

      <EditCollaboratorDialog
        collaborator={editing}
        tab={editTab}
        onTabChange={setEditTab}
        onClose={() => setEditingId(null)}
        accounts={allAccounts}
        wallets={wallets}
        onUpdated={() => {
          void load()
        }}
      />
    </Container>
  )
}

function CreateCollaboratorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [percentage, setPercentage] = useState('60')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setUsername('')
      setPassword('')
      setPercentage('60')
      setErr(null)
      setBusy(false)
    }
  }, [open])

  const submit = useCallback(async () => {
    setBusy(true)
    setErr(null)
    try {
      const pct = Number(percentage)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setErr('Percentuale non valida')
        setBusy(false)
        return
      }
      await adminCollaboratorsClient.create({
        name: name.trim(),
        username: username.trim(),
        password,
        profitSharePercentage: pct,
      })
      onCreated()
    } catch (e) {
      setErr(getApiErrorMessage(e) ?? 'Errore durante la creazione')
    } finally {
      setBusy(false)
    }
  }, [name, username, password, percentage, onCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo collaboratore</DialogTitle>
          <DialogDescription>
            L&apos;utente potrà accedere con username e password. Dopo la creazione puoi condividere
            conti e wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Nome</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Christian"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-username">Username</Label>
            <Input
              id="c-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es. christian"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-password">Password</Label>
            <Input
              id="c-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-pct">Quota collaboratore (%)</Label>
            <Input
              id="c-pct"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              La quota dell&apos;admin sarà {Math.max(0, 100 - Number(percentage || 0)).toFixed(2)}
              %.
            </p>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={busy || !name || !username || !password}>
            {busy ? 'Creazione...' : 'Crea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCollaboratorDialog({
  collaborator,
  tab,
  onTabChange,
  onClose,
  onUpdated,
  accounts,
  wallets,
}: {
  collaborator: Collaborator | null
  tab: 'data' | 'accounts' | 'wallets' | 'share' | 'capital'
  onTabChange: (tab: 'data' | 'accounts' | 'wallets' | 'share' | 'capital') => void
  onClose: () => void
  onUpdated: () => void
  accounts: Array<{ id: string; nome: string; holderId: string; bookId: string }>
  wallets: Array<{ id: string; nome: string; holderId: string }>
}) {
  const [shares, setShares] = useState<CollaboratorShares>({ accountIds: [], walletIds: [] })
  const [loadingShares, setLoadingShares] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [percentage, setPercentage] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [backfillFrom, setBackfillFrom] = useState('')
  const [backfillTo, setBackfillTo] = useState('')
  const [backfillResult, setBackfillResult] = useState<BackfillOperatorResult | null>(null)

  useEffect(() => {
    if (collaborator) {
      setName(collaborator.name)
      setPassword('')
      setPercentage(
        collaborator.profitSharePercentage != null
          ? String(collaborator.profitSharePercentage)
          : '',
      )
      setErr(null)
      setInfo(null)
      setBackfillFrom('')
      setBackfillTo('')
      setBackfillResult(null)
      setLoadingShares(true)
      adminCollaboratorsClient
        .getShares(collaborator.id)
        .then(setShares)
        .catch(() => setErr('Errore nel caricamento delle condivisioni'))
        .finally(() => setLoadingShares(false))
    }
  }, [collaborator])

  const toggleAccount = (id: string) => {
    setShares((s) =>
      s.accountIds.includes(id)
        ? { ...s, accountIds: s.accountIds.filter((x) => x !== id) }
        : { ...s, accountIds: [...s.accountIds, id] },
    )
  }
  const toggleWallet = (id: string) => {
    setShares((s) =>
      s.walletIds.includes(id)
        ? { ...s, walletIds: s.walletIds.filter((x) => x !== id) }
        : { ...s, walletIds: [...s.walletIds, id] },
    )
  }

  const saveData = useCallback(async () => {
    if (!collaborator) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      const payload: { name?: string; password?: string } = {}
      if (name.trim() && name.trim() !== collaborator.name) payload.name = name.trim()
      if (password) payload.password = password
      if (Object.keys(payload).length > 0) {
        await adminCollaboratorsClient.update(collaborator.id, payload)
      }
      onUpdated()
      setInfo('Salvato')
      setPassword('')
    } catch (e) {
      setErr(getApiErrorMessage(e) ?? 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }, [collaborator, name, password, onUpdated])

  const saveShare = useCallback(async () => {
    if (!collaborator) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      const pct = Number(percentage)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setErr('Percentuale non valida')
        setBusy(false)
        return
      }
      await adminCollaboratorsClient.setProfitShare(collaborator.id, pct)
      onUpdated()
      setInfo('Quota aggiornata')
    } catch {
      setErr('Errore durante il salvataggio della quota')
    } finally {
      setBusy(false)
    }
  }, [collaborator, percentage, onUpdated])

  const saveAccounts = useCallback(async () => {
    if (!collaborator) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await adminCollaboratorsClient.setAccountShares(collaborator.id, shares.accountIds)
      onUpdated()
      setInfo('Conti aggiornati')
    } catch {
      setErr('Errore durante il salvataggio dei conti condivisi')
    } finally {
      setBusy(false)
    }
  }, [collaborator, shares.accountIds, onUpdated])

  const runBackfill = useCallback(async () => {
    if (!collaborator) return
    if (shares.accountIds.length === 0) {
      setErr('Nessun conto condiviso: condividi prima i conti, poi esegui il backfill')
      return
    }
    const confirmMsg = `Riassegnare a ${collaborator.name} le operazioni pregresse senza operatore${
      backfillFrom || backfillTo ? ' nel periodo selezionato' : ''
    } sui ${shares.accountIds.length} conti condivisi? L'azione è reversibile solo manualmente.`
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return

    setBusy(true)
    setErr(null)
    setInfo(null)
    setBackfillResult(null)
    try {
      const result = await adminCollaboratorsClient.backfillOperator(collaborator.id, {
        accountIds: shares.accountIds,
        fromDate: backfillFrom ? new Date(backfillFrom).toISOString() : undefined,
        toDate: backfillTo ? new Date(backfillTo + 'T23:59:59').toISOString() : undefined,
        onlyUnassigned: true,
      })
      setBackfillResult(result)
      const total =
        result.ongoingBetsUpdated +
        result.betLegsUpdated +
        result.accountMovementsUpdated +
        result.ledgerUpdated +
        result.quickBetsUpdated
      setInfo(`Backfill completato: ${total} righe aggiornate.`)
      onUpdated()
    } catch (e) {
      setErr(getApiErrorMessage(e) ?? 'Errore durante il backfill')
    } finally {
      setBusy(false)
    }
  }, [collaborator, shares.accountIds, backfillFrom, backfillTo, onUpdated])

  const saveWallets = useCallback(async () => {
    if (!collaborator) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await adminCollaboratorsClient.setWalletShares(collaborator.id, shares.walletIds)
      onUpdated()
      setInfo('Wallet aggiornati')
    } catch {
      setErr('Errore durante il salvataggio dei wallet condivisi')
    } finally {
      setBusy(false)
    }
  }, [collaborator, shares.walletIds, onUpdated])

  const toggleStatus = useCallback(async () => {
    if (!collaborator) return
    setBusy(true)
    setErr(null)
    try {
      if (collaborator.status === 'active') {
        await adminCollaboratorsClient.update(collaborator.id, { status: 'disabled' })
      } else {
        await adminCollaboratorsClient.update(collaborator.id, { status: 'active' })
      }
      onUpdated()
    } catch {
      setErr('Errore durante il cambio stato')
    } finally {
      setBusy(false)
    }
  }, [collaborator, onUpdated])

  if (!collaborator) return null

  return (
    <Dialog open={!!collaborator} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{collaborator.name}</DialogTitle>
          <DialogDescription>
            Username: <span className="font-medium">{collaborator.username}</span>
            {' · '}Stato:{' '}
            <Badge variant={collaborator.status === 'active' ? 'default' : 'outline'}>
              {collaborator.status === 'active' ? 'Attivo' : 'Disabilitato'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-2">
          <Tabs
            tabs={[
              { id: 'data', label: 'Dati' },
              { id: 'share', label: 'Quota %' },
              { id: 'accounts', label: 'Conti' },
              { id: 'wallets', label: 'Wallet' },
              { id: 'capital', label: 'Capitale' },
            ]}
            activeTab={tab}
            onTabChange={(id) => onTabChange(id as typeof tab)}
          />
        </div>

        <div className="px-4">
          {tab === 'data' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="e-name">Nome</Label>
                <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-password">Nuova password (opzionale)</Label>
                <Input
                  id="e-password"
                  type="password"
                  placeholder="Lascia vuoto per non cambiare"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Cambiando la password l&apos;utente verrà disconnesso da tutte le sessioni attive.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveData} disabled={busy}>
                  Salva dati
                </Button>
                <Button variant="outline" onClick={toggleStatus} disabled={busy}>
                  {collaborator.status === 'active' ? 'Disabilita' : 'Riabilita'}
                </Button>
              </div>
            </div>
          )}

          {tab === 'share' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="e-pct">Quota collaboratore (%)</Label>
                <Input
                  id="e-pct"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Quota admin: {Math.max(0, 100 - Number(percentage || 0)).toFixed(2)}%. Lo split
                  viene applicato in modo simmetrico anche alle perdite.
                </p>
              </div>
              <Button onClick={saveShare} disabled={busy}>
                Salva quota
              </Button>
            </div>
          )}

          {tab === 'accounts' && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Seleziona i conti che il collaboratore potrà gestire (deposito/prelievo + giocate).
              </p>
              <div className="max-h-72 overflow-auto rounded border border-border">
                {loadingShares ? (
                  <p className="p-3 text-sm text-muted-foreground">Caricamento...</p>
                ) : accounts.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nessun conto disponibile.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {accounts.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          id={`acc-${a.id}`}
                          checked={shares.accountIds.includes(a.id)}
                          onChange={() => toggleAccount(a.id)}
                        />
                        <Label htmlFor={`acc-${a.id}`} className="cursor-pointer text-sm">
                          {a.nome}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={saveAccounts} disabled={busy || loadingShares}>
                Salva conti condivisi
              </Button>

              <div className="mt-6 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">Backfill operazioni pregresse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Riassegna a questo collaboratore tutte le giocate, movimenti conto e quick bet già
                  esistenti sui conti condivisi sopra, dove l&apos;operatore non è ancora impostato.
                  Utile per ricostruire lo storico quando il collaboratore è stato aggiunto dopo
                  l&apos;inizio dell&apos;attività.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="bf-from" className="text-xs">
                      Dal (opzionale)
                    </Label>
                    <Input
                      id="bf-from"
                      type="date"
                      value={backfillFrom}
                      onChange={(e) => setBackfillFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bf-to" className="text-xs">
                      Al (opzionale)
                    </Label>
                    <Input
                      id="bf-to"
                      type="date"
                      value={backfillTo}
                      onChange={(e) => setBackfillTo(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={runBackfill}
                  disabled={busy || loadingShares || shares.accountIds.length === 0}
                >
                  Esegui backfill
                </Button>
                {backfillResult && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li>Giocate aggiornate: {backfillResult.ongoingBetsUpdated}</li>
                    <li>Leg aggiornate: {backfillResult.betLegsUpdated}</li>
                    <li>Movimenti conto aggiornati: {backfillResult.accountMovementsUpdated}</li>
                    <li>Settlement (ledger) aggiornati: {backfillResult.ledgerUpdated}</li>
                    <li>Quick bet aggiornate: {backfillResult.quickBetsUpdated}</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'wallets' && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Seleziona i wallet che il collaboratore potrà usare nei deposito/prelievo.
              </p>
              <div className="max-h-72 overflow-auto rounded border border-border">
                {loadingShares ? (
                  <p className="p-3 text-sm text-muted-foreground">Caricamento...</p>
                ) : wallets.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">Nessun wallet disponibile.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {wallets.map((w) => (
                      <li key={w.id} className="flex items-center gap-2 px-3 py-2">
                        <Checkbox
                          id={`wal-${w.id}`}
                          checked={shares.walletIds.includes(w.id)}
                          onChange={() => toggleWallet(w.id)}
                        />
                        <Label htmlFor={`wal-${w.id}`} className="cursor-pointer text-sm">
                          {w.nome}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={saveWallets} disabled={busy || loadingShares}>
                Salva wallet condivisi
              </Button>
            </div>
          )}

          {tab === 'capital' && <CapitalPanel collaborator={collaborator} />}
        </div>

        {err && <p className="px-4 text-sm text-destructive">{err}</p>}
        {info && <p className="px-4 text-sm text-emerald-500">{info}</p>}

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const PAYOUT_LABELS: Record<PayoutRecipient, string> = {
  admin: 'Prelievo tua quota',
  collaborator: 'Pagamento collaboratore',
}

function CapitalPanel({ collaborator }: { collaborator: Collaborator }) {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const [shares, setShares] = useState<{ walletIds: string[] }>({ walletIds: [] })
  const [summary, setSummary] = useState<CapitalSummary | null>(null)
  const [payouts, setPayouts] = useState<PayoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [formRecipient, setFormRecipient] = useState<PayoutRecipient>('admin')
  const [formWalletId, setFormWalletId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formDescr, setFormDescr] = useState('')

  const sharedWallets = useMemo(
    () => wallets.filter((w) => shares.walletIds.includes(w.id)),
    [wallets, shares.walletIds],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [s, list, sh] = await Promise.all([
        adminCollaboratorsClient.getCapitalSummary(collaborator.id),
        adminCollaboratorsClient.listPayouts(collaborator.id, { page: 1, limit: 100 }),
        adminCollaboratorsClient.getShares(collaborator.id),
      ])
      setSummary(s)
      setPayouts(list.items)
      setShares({ walletIds: sh.walletIds })
    } catch {
      setErr('Errore nel caricamento del capitale')
    } finally {
      setLoading(false)
    }
  }, [collaborator.id])

  useEffect(() => {
    void fetchWallets()
    void reload()
  }, [reload, fetchWallets])

  // Seleziona automaticamente il primo wallet condiviso quando arrivano i dati
  useEffect(() => {
    if (!formWalletId && sharedWallets.length > 0) {
      setFormWalletId(sharedWallets[0].id)
    }
  }, [sharedWallets, formWalletId])

  const submit = useCallback(async () => {
    const amount = Number.parseFloat(formAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr('Importo non valido')
      return
    }
    if (!formWalletId) {
      setErr('Seleziona un wallet condiviso da cui prelevare')
      return
    }
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await adminCollaboratorsClient.createPayout(collaborator.id, {
        walletId: formWalletId,
        amount,
        recipient: formRecipient,
        dataRegistrazione: new Date(formDate).toISOString(),
        descrizione: formDescr || undefined,
      })
      setFormAmount('')
      setFormDescr('')
      setInfo(
        formRecipient === 'admin'
          ? 'Prelievo registrato sulla tua quota'
          : 'Pagamento al collaboratore registrato',
      )
      await reload()
    } catch (e) {
      setErr(getApiErrorMessage(e) ?? 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }, [collaborator.id, formRecipient, formWalletId, formAmount, formDate, formDescr, reload])

  const handleDelete = useCallback(
    async (movementId: string) => {
      if (
        typeof window !== 'undefined' &&
        !window.confirm('Eliminare il payout? Il saldo del wallet verrà ripristinato.')
      )
        return
      setBusy(true)
      setErr(null)
      try {
        await adminCollaboratorsClient.deletePayout(collaborator.id, movementId)
        await reload()
      } catch {
        setErr("Errore durante l'eliminazione")
      } finally {
        setBusy(false)
      }
    },
    [collaborator.id, reload],
  )

  return (
    <div className="space-y-4 py-4">
      {loading || !summary ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Capitale admin (tuo)
              </p>
              <p
                className={`mt-1 font-mono text-xl font-semibold ${
                  summary.adminCapital >= 0 ? 'text-emerald-400' : 'text-destructive'
                }`}
              >
                {formatCurrency(summary.adminCapital)}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <li>
                  Pool gestito (conti+wallet condivisi): {formatCurrency(summary.poolTotalBalance)}
                </li>
                <li>
                  Quota profitti{' '}
                  {summary.sharePercentage != null
                    ? `(${(100 - summary.sharePercentage).toFixed(2)}%)`
                    : ''}
                  : {formatCurrency(summary.adminShareAmount)}
                </li>
                <li>Tuoi prelievi: -{formatCurrency(summary.adminWithdrawals)}</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Capitale collaboratore (suo)
              </p>
              <p
                className={`mt-1 font-mono text-xl font-semibold ${
                  summary.collaboratorCapital >= 0 ? 'text-foreground' : 'text-destructive'
                }`}
              >
                {formatCurrency(summary.collaboratorCapital)}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <li>
                  Quota profitti{' '}
                  {summary.sharePercentage != null ? `(${summary.sharePercentage}%)` : ''}:{' '}
                  {formatCurrency(summary.collaboratorShareAmount)}
                </li>
                <li>Già pagato al collab: -{formatCurrency(summary.collaboratorWithdrawals)}</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Profitto totale operazioni: <strong>{formatCurrency(summary.totalProfit)}</strong>
              </span>
              <span>
                Saldo conti condivisi:{' '}
                <strong>{formatCurrency(summary.poolAccountsBalance)}</strong>
              </span>
              <span>
                Saldo wallet condivisi:{' '}
                <strong>{formatCurrency(summary.poolWalletsBalance)}</strong>
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug">
              Per aumentare il capitale ricarica un wallet condiviso dalla Gestione Conti (sezione
              Wallet → Ricarica). Per prelevare tua quota o pagare il collaboratore, usa il form qui
              sotto.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-medium text-foreground">Nuovo payout</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Crea un movimento reale di spesa sul wallet condiviso scelto. Il saldo del wallet
              diminuisce dell&apos;importo indicato.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="po-recipient" className="text-xs">
                  Destinatario
                </Label>
                <select
                  id="po-recipient"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formRecipient}
                  onChange={(e) => setFormRecipient(e.target.value as PayoutRecipient)}
                >
                  <option value="admin">Tua quota (admin)</option>
                  <option value="collaborator">Quota collaboratore</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="po-wallet" className="text-xs">
                  Wallet (condiviso)
                </Label>
                <select
                  id="po-wallet"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={formWalletId}
                  onChange={(e) => setFormWalletId(e.target.value)}
                  disabled={sharedWallets.length === 0}
                >
                  {sharedWallets.length === 0 ? (
                    <option value="">Nessun wallet condiviso</option>
                  ) : (
                    sharedWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nome} ({w.saldoAttuale.toFixed(2)} €)
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="po-amount" className="text-xs">
                  Importo (€)
                </Label>
                <Input
                  id="po-amount"
                  type="text"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="po-date" className="text-xs">
                  Data
                </Label>
                <Input
                  id="po-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="po-descr" className="text-xs">
                  Descrizione (opzionale)
                </Label>
                <Input
                  id="po-descr"
                  type="text"
                  value={formDescr}
                  onChange={(e) => setFormDescr(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="mt-3"
              onClick={submit}
              disabled={busy || !formAmount || !formWalletId}
            >
              Registra payout
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
              Storico payout
            </p>
            {payouts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Nessun payout registrato.</p>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Data
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Wallet
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Importo
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Note
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(p.dataRegistrazione).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-3 py-2 text-foreground">{PAYOUT_LABELS[p.recipient]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.walletNome ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-destructive">
                          -{formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{p.descrizione ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            disabled={busy}
                          >
                            Elimina
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {info && <p className="text-sm text-emerald-500">{info}</p>}
        </>
      )}
    </div>
  )
}
