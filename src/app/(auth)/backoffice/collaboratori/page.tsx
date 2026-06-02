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
  type CapitalSummary,
  type PayoutEntry,
  type DepositEntry,
  type SeedProfitEntry,
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
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)

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
    void fetchAllHolders()
  }, [load, fetchAllAccounts, fetchWallets, fetchAllHolders])

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
        holders={allHolders}
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
  holders,
}: {
  collaborator: Collaborator | null
  tab: 'data' | 'accounts' | 'wallets' | 'share' | 'capital'
  onTabChange: (tab: 'data' | 'accounts' | 'wallets' | 'share' | 'capital') => void
  onClose: () => void
  onUpdated: () => void
  accounts: Array<{ id: string; nome: string; holderId: string; bookId: string }>
  wallets: Array<{ id: string; nome: string; holderId: string }>
  holders: Array<{ id: string; nome: string }>
}) {
  const holderById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of holders) map.set(h.id, h.nome)
    return map
  }, [holders])
  const walletLabel = useCallback(
    (w: { nome: string; holderId: string }) => {
      const holderName = holderById.get(w.holderId)
      return holderName ? `${w.nome} · ${holderName}` : w.nome
    },
    [holderById],
  )
  const accountLabel = useCallback(
    (a: { nome: string; holderId: string }) => {
      const holderName = holderById.get(a.holderId)
      // accounts.nome è già "Book (Intestatario)" ma per coerenza la versione esplicita
      return holderName && !a.nome.includes(holderName) ? `${a.nome} · ${holderName}` : a.nome
    },
    [holderById],
  )
  const [shares, setShares] = useState<CollaboratorShares>({ accountIds: [], walletIds: [] })
  const [loadingShares, setLoadingShares] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [percentage, setPercentage] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [accountQuery, setAccountQuery] = useState('')
  const [walletQuery, setWalletQuery] = useState('')

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
      setAccountQuery('')
      setWalletQuery('')
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
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{collaborator.name}</DialogTitle>
          <DialogDescription>
            Username: <span className="font-medium">{collaborator.username}</span>
            {' · '}Stato:{' '}
            <Badge variant={collaborator.status === 'active' ? 'default' : 'outline'}>
              {collaborator.status === 'active' ? 'Attivo' : 'Disabilitato'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 pt-3">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
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
              <Input
                type="search"
                placeholder="Cerca conto, intestatario, book..."
                value={accountQuery}
                onChange={(e) => setAccountQuery(e.target.value)}
              />
              {(() => {
                const q = accountQuery.trim().toLowerCase()
                const filtered = q
                  ? accounts.filter((a) => accountLabel(a).toLowerCase().includes(q))
                  : accounts
                return (
                  <>
                    <div className="max-h-72 overflow-auto rounded border border-border">
                      {loadingShares ? (
                        <p className="p-3 text-sm text-muted-foreground">Caricamento...</p>
                      ) : accounts.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nessun conto disponibile.
                        </p>
                      ) : filtered.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nessun conto corrisponde alla ricerca.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {filtered.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
                              <Checkbox
                                id={`acc-${a.id}`}
                                checked={shares.accountIds.includes(a.id)}
                                onChange={() => toggleAccount(a.id)}
                              />
                              <Label htmlFor={`acc-${a.id}`} className="cursor-pointer text-sm">
                                {accountLabel(a)}
                              </Label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {shares.accountIds.length} selezionati · {filtered.length} visibili su{' '}
                      {accounts.length} totali
                    </p>
                  </>
                )
              })()}
              <Button onClick={saveAccounts} disabled={busy || loadingShares}>
                Salva conti condivisi
              </Button>
            </div>
          )}

          {tab === 'wallets' && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Seleziona i wallet che il collaboratore potrà usare nei deposito/prelievo.
              </p>
              <Input
                type="search"
                placeholder="Cerca wallet o intestatario..."
                value={walletQuery}
                onChange={(e) => setWalletQuery(e.target.value)}
              />
              {(() => {
                const q = walletQuery.trim().toLowerCase()
                const filtered = q
                  ? wallets.filter((w) => walletLabel(w).toLowerCase().includes(q))
                  : wallets
                return (
                  <>
                    <div className="max-h-72 overflow-auto rounded border border-border">
                      {loadingShares ? (
                        <p className="p-3 text-sm text-muted-foreground">Caricamento...</p>
                      ) : wallets.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nessun wallet disponibile.
                        </p>
                      ) : filtered.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Nessun wallet corrisponde alla ricerca.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {filtered.map((w) => (
                            <li key={w.id} className="flex items-center gap-2 px-3 py-2">
                              <Checkbox
                                id={`wal-${w.id}`}
                                checked={shares.walletIds.includes(w.id)}
                                onChange={() => toggleWallet(w.id)}
                              />
                              <Label htmlFor={`wal-${w.id}`} className="cursor-pointer text-sm">
                                {walletLabel(w)}
                              </Label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {shares.walletIds.length} selezionati · {filtered.length} visibili su{' '}
                      {wallets.length} totali
                    </p>
                  </>
                )
              })()}
              <Button onClick={saveWallets} disabled={busy || loadingShares}>
                Salva wallet condivisi
              </Button>
            </div>
          )}

          {tab === 'capital' && <CapitalPanel collaborator={collaborator} />}
        </div>

        {err && <p className="shrink-0 px-4 pt-2 text-sm text-destructive">{err}</p>}
        {info && <p className="shrink-0 px-4 pt-2 text-sm text-emerald-500">{info}</p>}

        <DialogFooter className="shrink-0 p-4 pt-3">
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

function CapitalPanel({ collaborator }: { collaborator: Collaborator }) {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const holderById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of allHolders) map.set(h.id, h.nome)
    return map
  }, [allHolders])
  const [shares, setShares] = useState<CollaboratorShares>({ accountIds: [], walletIds: [] })
  const [summary, setSummary] = useState<CapitalSummary | null>(null)
  const [payouts, setPayouts] = useState<PayoutEntry[]>([])
  const [deposits, setDeposits] = useState<DepositEntry[]>([])
  const [seeds, setSeeds] = useState<SeedProfitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [formWalletId, setFormWalletId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formDescr, setFormDescr] = useState('')

  const [depWalletId, setDepWalletId] = useState('')
  const [depAmount, setDepAmount] = useState('')
  const [depDate, setDepDate] = useState(new Date().toISOString().slice(0, 10))
  const [depDescr, setDepDescr] = useState('')

  const [seedAccountId, setSeedAccountId] = useState('')
  const [seedAmount, setSeedAmount] = useState('')
  const [seedDate, setSeedDate] = useState(new Date().toISOString().slice(0, 10))
  const [seedDescr, setSeedDescr] = useState('')

  const sharedWallets = useMemo(
    () => wallets.filter((w) => shares.walletIds.includes(w.id)),
    [wallets, shares.walletIds],
  )
  const sharedAccounts = useMemo(
    () => allAccounts.filter((a) => shares.accountIds.includes(a.id)),
    [allAccounts, shares.accountIds],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [s, list, sh, seedList, depList] = await Promise.all([
        adminCollaboratorsClient.getCapitalSummary(collaborator.id),
        adminCollaboratorsClient.listPayouts(collaborator.id, { page: 1, limit: 100 }),
        adminCollaboratorsClient.getShares(collaborator.id),
        adminCollaboratorsClient.listSeedProfits(collaborator.id),
        adminCollaboratorsClient.listDeposits(collaborator.id, { page: 1, limit: 100 }),
      ])
      setSummary(s)
      setPayouts(list.items)
      setShares(sh)
      setSeeds(seedList)
      setDeposits(depList.items)
    } catch {
      setErr('Errore nel caricamento del capitale')
    } finally {
      setLoading(false)
    }
  }, [collaborator.id])

  useEffect(() => {
    void fetchWallets()
    void fetchAllAccounts()
    void fetchAllHolders()
    void reload()
  }, [reload, fetchWallets, fetchAllAccounts, fetchAllHolders])

  // Seleziona automaticamente il primo wallet/conto condiviso quando arrivano i dati
  useEffect(() => {
    if (!formWalletId && sharedWallets.length > 0) {
      setFormWalletId(sharedWallets[0].id)
    }
    if (!depWalletId && sharedWallets.length > 0) {
      setDepWalletId(sharedWallets[0].id)
    }
  }, [sharedWallets, formWalletId, depWalletId])

  useEffect(() => {
    if (!seedAccountId && sharedAccounts.length > 0) {
      setSeedAccountId(sharedAccounts[0].id)
    }
  }, [sharedAccounts, seedAccountId])

  const submitDeposit = useCallback(async () => {
    const amount = Number.parseFloat(depAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr('Importo non valido')
      return
    }
    if (!depWalletId) {
      setErr('Seleziona un wallet condiviso su cui depositare')
      return
    }
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await adminCollaboratorsClient.createDeposit(collaborator.id, {
        walletId: depWalletId,
        amount,
        dataRegistrazione: new Date(depDate).toISOString(),
        descrizione: depDescr || undefined,
      })
      setDepAmount('')
      setDepDescr('')
      setInfo('Deposito registrato come capitale del collaboratore')
      await reload()
    } catch (e: unknown) {
      const apiMsg = getApiErrorMessage(e)
      setErr(apiMsg ?? 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }, [collaborator.id, depWalletId, depAmount, depDate, depDescr, reload])

  const handleDeleteDeposit = useCallback(
    async (movementId: string) => {
      if (
        typeof window !== 'undefined' &&
        !window.confirm("Eliminare il deposito? Il saldo del wallet verrà ridotto dell'importo.")
      )
        return
      setBusy(true)
      setErr(null)
      try {
        await adminCollaboratorsClient.deleteDeposit(collaborator.id, movementId)
        await reload()
      } catch (e: unknown) {
        const apiMsg = getApiErrorMessage(e)
        setErr(apiMsg ?? "Errore durante l'eliminazione")
      } finally {
        setBusy(false)
      }
    },
    [collaborator.id, reload],
  )

  const submitSeed = useCallback(async () => {
    const amount = Number.parseFloat(seedAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount === 0) {
      setErr('Importo non valido (diverso da zero)')
      return
    }
    if (!seedAccountId) {
      setErr('Seleziona un conto condiviso')
      return
    }
    setBusy(true)
    setErr(null)
    setInfo(null)
    try {
      await adminCollaboratorsClient.createSeedProfit(collaborator.id, {
        accountId: seedAccountId,
        amount,
        dataRegistrazione: new Date(seedDate).toISOString(),
        descrizione: seedDescr || undefined,
      })
      setSeedAmount('')
      setSeedDescr('')
      setInfo('Profitto pregresso registrato')
      await reload()
    } catch (e: unknown) {
      const apiMsg = getApiErrorMessage(e)
      setErr(apiMsg ?? 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }, [collaborator.id, seedAccountId, seedAmount, seedDate, seedDescr, reload])

  const handleDeleteSeed = useCallback(
    async (seedId: string) => {
      if (typeof window !== 'undefined' && !window.confirm('Eliminare questo profitto pregresso?'))
        return
      setBusy(true)
      setErr(null)
      try {
        await adminCollaboratorsClient.deleteSeedProfit(collaborator.id, seedId)
        await reload()
      } catch {
        setErr("Errore durante l'eliminazione")
      } finally {
        setBusy(false)
      }
    },
    [collaborator.id, reload],
  )

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
        dataRegistrazione: new Date(formDate).toISOString(),
        descrizione: formDescr || undefined,
      })
      setFormAmount('')
      setFormDescr('')
      setInfo('Pagamento al collaboratore registrato')
      await reload()
    } catch (e) {
      setErr(getApiErrorMessage(e) ?? 'Errore durante il salvataggio')
    } finally {
      setBusy(false)
    }
  }, [collaborator.id, formWalletId, formAmount, formDate, formDescr, reload])

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
                <li>Depositi accreditati: +{formatCurrency(summary.collaboratorCredits)}</li>
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
              Il tuo capitale è derivato: cresce/cala automaticamente al variare dei saldi reali dei
              conti/wallet condivisi (che restano comunque <strong>tuoi conti</strong>) e dei
              profitti generati dal collab. Per movimentare il tuo capitale usa la Gestione Conti
              come al solito (Ricarica/Spesa/Trasferimento). I form qui sotto registrano invece le
              operazioni che riguardano <strong>il capitale del collaboratore</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm font-medium text-foreground">Paga il collaboratore</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Registra il pagamento della quota dovuta al collaboratore. Crea un movimento reale di
              spesa sul wallet condiviso scelto: il saldo del wallet diminuisce dell&apos;importo
              indicato e il debito verso il collaboratore si riduce dello stesso ammontare.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                    sharedWallets.map((w) => {
                      const holderName = holderById.get(w.holderId)
                      return (
                        <option key={w.id} value={w.id}>
                          {holderName ? `${w.nome} · ${holderName}` : w.nome} (
                          {w.saldoAttuale.toFixed(2)} €)
                        </option>
                      )
                    })
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
              Registra pagamento
            </Button>
          </div>

          <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
            <p className="text-sm font-medium text-foreground">
              Deposito capitale del collaboratore
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Registra una ricarica di un wallet condiviso accreditata{' '}
              <strong>interamente al collaboratore</strong> (es. soldi suoi versati nel pool, o
              capitale che ha già guadagnato e che gli riconosci). Il saldo del wallet aumenta
              dell&apos;importo indicato e il suo capitale cresce dello stesso ammontare. Niente
              split sulla %.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dep-wallet" className="text-xs">
                  Wallet (condiviso)
                </Label>
                <select
                  id="dep-wallet"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={depWalletId}
                  onChange={(e) => setDepWalletId(e.target.value)}
                  disabled={sharedWallets.length === 0}
                >
                  {sharedWallets.length === 0 ? (
                    <option value="">Nessun wallet condiviso</option>
                  ) : (
                    sharedWallets.map((w) => {
                      const holderName = holderById.get(w.holderId)
                      return (
                        <option key={w.id} value={w.id}>
                          {holderName ? `${w.nome} · ${holderName}` : w.nome} (
                          {w.saldoAttuale.toFixed(2)} €)
                        </option>
                      )
                    })
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dep-amount" className="text-xs">
                  Importo (€)
                </Label>
                <Input
                  id="dep-amount"
                  type="text"
                  inputMode="decimal"
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dep-date" className="text-xs">
                  Data
                </Label>
                <Input
                  id="dep-date"
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="dep-descr" className="text-xs">
                  Descrizione (opzionale)
                </Label>
                <Input
                  id="dep-descr"
                  type="text"
                  value={depDescr}
                  onChange={(e) => setDepDescr(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="mt-3"
              onClick={submitDeposit}
              disabled={busy || !depAmount || !depWalletId}
            >
              Registra deposito
            </Button>

            {deposits.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md border border-border bg-card">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Data
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
                    {deposits.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(d.dataRegistrazione).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{d.walletNome ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400">
                          +{formatCurrency(d.amount)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{d.descrizione ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDeposit(d.id)}
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

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-medium text-foreground">
              Profitto pregresso del collaboratore
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Registra qui i profitti generati dal collaboratore <strong>prima</strong> di iniziare
              a tracciare le sue giocate nel sistema. Il saldo del conto/wallet condiviso{' '}
              <strong>non</strong> viene modificato (è già aggiornato sulla realtà); il sistema
              riconosce X € come totale profitti del collaboratore e applica la sua quota{' '}
              {summary.sharePercentage != null ? `(${summary.sharePercentage}%)` : ''} per
              alimentare il suo capitale.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="seed-account" className="text-xs">
                  Conto (condiviso)
                </Label>
                <select
                  id="seed-account"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={seedAccountId}
                  onChange={(e) => setSeedAccountId(e.target.value)}
                  disabled={sharedAccounts.length === 0}
                >
                  {sharedAccounts.length === 0 ? (
                    <option value="">Nessun conto condiviso</option>
                  ) : (
                    sharedAccounts.map((a) => {
                      const holderName = holderById.get(a.holderId)
                      const label =
                        holderName && !a.nome.includes(holderName)
                          ? `${a.nome} · ${holderName}`
                          : a.nome
                      return (
                        <option key={a.id} value={a.id}>
                          {label}
                        </option>
                      )
                    })
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="seed-amount" className="text-xs">
                  Importo lordo (€)
                </Label>
                <Input
                  id="seed-amount"
                  type="text"
                  inputMode="decimal"
                  value={seedAmount}
                  onChange={(e) => setSeedAmount(e.target.value)}
                  placeholder="es. 200.00"
                />
                {Number.isFinite(Number.parseFloat(seedAmount.replace(',', '.'))) &&
                  summary.sharePercentage != null && (
                    <p className="text-[11px] text-muted-foreground">
                      Quota collab:{' '}
                      {formatCurrency(
                        (Number.parseFloat(seedAmount.replace(',', '.')) *
                          summary.sharePercentage) /
                          100,
                      )}
                    </p>
                  )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="seed-date" className="text-xs">
                  Data di riferimento
                </Label>
                <Input
                  id="seed-date"
                  type="date"
                  value={seedDate}
                  onChange={(e) => setSeedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seed-descr" className="text-xs">
                  Descrizione (opzionale)
                </Label>
                <Input
                  id="seed-descr"
                  type="text"
                  value={seedDescr}
                  onChange={(e) => setSeedDescr(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="mt-3"
              onClick={submitSeed}
              disabled={busy || !seedAmount || !seedAccountId}
            >
              Registra profitto pregresso
            </Button>

            {seeds.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md border border-border bg-card">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Data
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Conto
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Importo lordo
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Note
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {seeds.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(s.dataRegistrazione).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-3 py-2 text-foreground">{s.accountNome ?? '—'}</td>
                        <td
                          className={`px-3 py-2 text-right font-mono ${
                            s.amount >= 0 ? 'text-emerald-400' : 'text-destructive'
                          }`}
                        >
                          {s.amount >= 0 ? '+' : ''}
                          {formatCurrency(s.amount)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{s.descrizione ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSeed(s.id)}
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

          <div className="rounded-lg border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
              Storico pagamenti al collaboratore
            </p>
            {payouts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nessun pagamento al collaboratore registrato.
              </p>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Data
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
