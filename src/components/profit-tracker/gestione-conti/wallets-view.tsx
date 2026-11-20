'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Hourglass,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Receipt,
  Search,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { OmDropdown, OmPagination, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  GIconButton,
  GSelect,
  GTextField,
  dsDangerButtonClass,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  AccountChip,
  useAccountInfo,
} from '@/components/profit-tracker/giocate-rapide/use-account-info'
import {
  DS_CARD,
  DS_PANEL,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAmount,
  DsBadgeToggle,
  DsBalancePanel,
  DsEmptyState,
  DsPageHeader,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'
import { WalletEditModal } from '@/components/profit-tracker/wallet-edit-modal'
import { WalletTransferModal } from '@/components/profit-tracker/wallet-transfer-modal'
import { WalletTopupExpenseModal } from '@/components/profit-tracker/wallet-topup-expense-modal'
import { dashMoney } from '@/lib/profit-tracker/dashboard'
import { getErrorMessage } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { AccountMovement, Wallet } from '@/types/profit-tracker'

/**
 * I wallet dei collaboratori sul design OddWise (§14.350), scheda «Wallets» di Gestione conti:
 * saldo e prelievi in attesa, l'elenco dei prelievi da segnare pagati o da annullare, filtri,
 * tabella (schede sul telefono) con stato e blocco cambiabili dalla riga, e le modali Nuovo
 * wallet, Trasferisci, Ricarica o spesa e Modifica. Filtri, ordine e pagine restano nel browser.
 */

const PAGE_SIZE = 20

type Bloccato = '' | 'solo' | 'no'

const STATO_FILTER = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'abilitato', label: 'Abilitati' },
  { value: 'disabilitato', label: 'Non abilitati' },
]
const BLOCCATO_FILTER = [
  { value: '', label: 'Bloccati e liberi' },
  { value: 'solo', label: 'Solo bloccati' },
  { value: 'no', label: 'Solo liberi' },
]
const SORT_OPTIONS = [
  { value: 'desc', label: 'Saldo, dal più alto' },
  { value: 'asc', label: 'Saldo, dal più basso' },
]

const money = (value: number) => dashMoney(value, { sign: false })
const day = (iso: string) => new Date(iso).toLocaleDateString('it-IT')

export function WalletsView() {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)
  const paymentMethods = useProfitTrackerStore((s) => s.paymentMethods)
  const fetchPaymentMethods = useProfitTrackerStore((s) => s.fetchPaymentMethods)
  const pendingWithdrawals = useProfitTrackerStore((s) => s.pendingWithdrawals)
  const fetchPendingWithdrawals = useProfitTrackerStore((s) => s.fetchPendingWithdrawals)
  const markAccountMovementPaid = useProfitTrackerStore((s) => s.markAccountMovementPaid)
  const cancelAccountMovement = useProfitTrackerStore((s) => s.cancelAccountMovement)
  const isAdmin = useAuthStore((s) => s.user?.role) === 'ADMIN_ROLE'
  const { accountInfo } = useAccountInfo()

  const [loaded, setLoaded] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<AccountMovement | null>(null)

  const [holderIds, setHolderIds] = useState<string[]>([])
  const [methodIds, setMethodIds] = useState<string[]>([])
  const [descrizione, setDescrizione] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterBloccato, setFilterBloccato] = useState<Bloccato>('')
  const [sortSaldo, setSortSaldo] = useState<'asc' | 'desc'>('desc')
  /** Da 0, come la paginazione del design. */
  const [page, setPage] = useState(0)

  useEffect(() => {
    void fetchHolders()
    void fetchPaymentMethods()
    void fetchPendingWithdrawals()
    void fetchWallets().finally(() => setLoaded(true))
  }, [fetchHolders, fetchWallets, fetchPaymentMethods, fetchPendingWithdrawals])

  const holderName = (id: string | undefined) =>
    (id && holders.find((h) => h.id === id)?.nome) || '—'

  const holderOptions: OmOption[] = useMemo(
    () =>
      holders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [holders],
  )
  // Il catalogo può arrivare dopo i wallet: i nomi dei metodi vengono anche dai wallet stessi.
  const methodOptions: OmOption[] = useMemo(() => {
    const byId = new Map<string, string>()
    for (const m of paymentMethods) byId.set(m.id, m.nome)
    for (const w of wallets) if (!byId.has(w.paymentMethodId)) byId.set(w.paymentMethodId, w.nome)
    return [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'it'))
  }, [paymentMethods, wallets])

  const filteredWallets = useMemo(() => {
    const q = descrizione.toLowerCase().trim()
    return wallets
      .filter(
        (w) =>
          (holderIds.length === 0 || holderIds.includes(w.holderId)) &&
          (methodIds.length === 0 || methodIds.includes(w.paymentMethodId)) &&
          (!filterStato || w.stato === filterStato) &&
          (filterBloccato !== 'solo' || w.bloccato) &&
          (filterBloccato !== 'no' || !w.bloccato) &&
          (!q || (w.descrizione ?? '').toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sortSaldo === 'desc' ? b.saldoAttuale - a.saldoAttuale : a.saldoAttuale - b.saldoAttuale,
      )
  }, [wallets, holderIds, methodIds, descrizione, filterStato, filterBloccato, sortSaldo])

  const total = filteredWallets.length
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
  const safePage = Math.min(page, maxPage)
  const visible = filteredWallets.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const saldoTotale = wallets.reduce((sum, w) => sum + (Number(w.saldoAttuale) || 0), 0)
  const inAttesaTotale = wallets.reduce((sum, w) => sum + (Number(w.inAttesa) || 0), 0)

  const active: { key: string; label: string; clear: () => void }[] = []
  for (const id of holderIds)
    active.push({
      key: `h-${id}`,
      label: holderName(id),
      clear: () => setHolderIds((prev) => prev.filter((v) => v !== id)),
    })
  for (const id of methodIds)
    active.push({
      key: `m-${id}`,
      label: methodOptions.find((o) => o.value === id)?.label ?? 'Metodo',
      clear: () => setMethodIds((prev) => prev.filter((v) => v !== id)),
    })
  if (descrizione.trim())
    active.push({
      key: 'descrizione',
      label: `«${descrizione.trim()}»`,
      clear: () => setDescrizione(''),
    })
  if (filterStato)
    active.push({
      key: 'stato',
      label: filterStato === 'abilitato' ? 'Abilitati' : 'Non abilitati',
      clear: () => setFilterStato(''),
    })
  if (filterBloccato)
    active.push({
      key: 'bloccato',
      label: filterBloccato === 'solo' ? 'Solo bloccati' : 'Solo liberi',
      clear: () => setFilterBloccato(''),
    })
  const filtered = active.length > 0

  const resetFilters = () => {
    setHolderIds([])
    setMethodIds([])
    setDescrizione('')
    setFilterStato('')
    setFilterBloccato('')
    setPage(0)
  }

  /* ---------- Azioni ---------- */

  // §14.109: i prelievi in attesa si chiudono da qui (pagato) o si annullano.
  const handlePay = async (movement: AccountMovement) => {
    setBusyId(movement.id)
    try {
      await markAccountMovementPaid(movement.id)
      toast.success(`Prelievo di ${money(movement.valore)} pagato: wallet accreditato`)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile segnare il prelievo come pagato.')
    } finally {
      setBusyId(null)
    }
  }
  const confirmCancel = async () => {
    if (!cancelling) return
    setBusyId(cancelling.id)
    try {
      await cancelAccountMovement(cancelling.id)
      toast.success('Prelievo annullato: il conto ha ripreso l’importo')
      setCancelling(null)
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile annullare il prelievo.')
    } finally {
      setBusyId(null)
    }
  }

  // Stato e blocco dall'elenco passano dallo store, che salva sul backend (§14.105).
  const toggleStato = async (wallet: Wallet) => {
    setBusyId(wallet.id)
    try {
      await updateWallet(wallet.id, {
        stato: wallet.stato === 'abilitato' ? 'disabilitato' : 'abilitato',
      })
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile aggiornare lo stato del wallet.')
    } finally {
      setBusyId(null)
    }
  }
  const toggleBloccato = async (wallet: Wallet) => {
    setBusyId(wallet.id)
    try {
      await updateWallet(wallet.id, { bloccato: !wallet.bloccato })
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile aggiornare il blocco del wallet.')
    } finally {
      setBusyId(null)
    }
  }

  /* ---------- Pezzi delle righe ---------- */

  const statusCell = (w: Wallet) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <DsBadgeToggle
        tone={w.stato === 'abilitato' ? 'profit' : 'neutral'}
        label={w.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
        actionLabel={w.stato === 'abilitato' ? 'Disabilita il wallet' : 'Abilita il wallet'}
        onClick={() => void toggleStato(w)}
        disabled={busyId === w.id}
      />
      {isAdmin ? (
        <DsBadgeToggle
          tone={w.bloccato ? 'warning' : 'neutral'}
          label={w.bloccato ? 'Bloccato' : 'Libero'}
          actionLabel={w.bloccato ? 'Sblocca il wallet' : 'Segna il wallet come bloccato'}
          icon={
            w.bloccato ? (
              <Lock className="h-3 w-3" aria-hidden />
            ) : (
              <LockOpen className="h-3 w-3" aria-hidden />
            )
          }
          onClick={() => void toggleBloccato(w)}
          disabled={busyId === w.id}
        />
      ) : (
        w.bloccato && (
          <DsBadge tone="warning">
            <Lock className="h-3 w-3" aria-hidden />
            Bloccato
          </DsBadge>
        )
      )}
    </div>
  )

  const walletCell = (w: Wallet) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="font-semibold text-ds-ink">{w.nome}</span>
      <span className="ds-caption text-ds-ink-muted">{holderName(w.holderId)}</span>
    </div>
  )

  const descrizioneCell = (w: Wallet) =>
    w.descrizione ? (
      <span title={w.descrizione} className="ds-body-sm block truncate text-ds-ink-muted">
        {w.descrizione}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const inAttesaCell = (w: Wallet) =>
    w.inAttesa > 0 ? (
      <span className="ds-num-sm whitespace-nowrap text-ds-warning">{money(w.inAttesa)}</span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const editButton = (w: Wallet) => (
    <GIconButton label={`Modifica il wallet ${w.nome}`} onClick={() => setEditing(w)}>
      <Pencil className="h-4 w-4" aria-hidden />
    </GIconButton>
  )

  const pendingAccount = (m: AccountMovement) => {
    const info = accountInfo(m.accountId)
    return info.book ? (
      <AccountChip info={info} />
    ) : (
      <span className="truncate">{m.accountNome ?? 'Conto'}</span>
    )
  }

  return (
    <>
      <DsPageHeader
        title="Wallets"
        description="I metodi di pagamento dei collaboratori e la liquidità che c'è sopra."
        actions={
          <>
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              className={dsButtonClass('secondary', 'md')}
            >
              <ArrowLeftRight className="h-5 w-5" aria-hidden />
              Trasferisci
            </button>
            <button
              type="button"
              onClick={() => setTopupOpen(true)}
              className={dsButtonClass('secondary', 'md')}
            >
              <Receipt className="h-5 w-5" aria-hidden />
              Ricarica o spesa
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={dsButtonClass('primary', 'md')}
            >
              <Plus className="h-5 w-5" aria-hidden />
              Nuovo wallet
            </button>
          </>
        }
      />

      <DsBalancePanel
        icon={WalletIcon}
        label="Saldo attuale dei wallet"
        value={saldoTotale}
        note={
          inAttesaTotale > 0 ? (
            <span className="text-ds-warning">
              più {money(inAttesaTotale)} in attesa di pagamento
            </span>
          ) : undefined
        }
      />

      {pendingWithdrawals.length > 0 && (
        <section
          aria-labelledby="wallets-in-attesa"
          className="flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-warning-soft px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-ds-warning" aria-hidden />
            <h2 id="wallets-in-attesa" className="m-0 text-base leading-6 font-semibold">
              Prelievi in attesa di pagamento ({pendingWithdrawals.length})
            </h2>
          </div>
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            Il conto è già sceso; il wallet riceve l&apos;importo quando segni il prelievo come
            pagato.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pendingWithdrawals.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-3 rounded-ds-sm border border-ds-line bg-ds-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5">
                    <span className="flex min-w-0 items-center">{pendingAccount(m)}</span>
                    <span aria-hidden className="text-ds-ink-muted">
                      →
                    </span>
                    <span className="sr-only">verso</span>
                    <span className="font-semibold">{m.walletNome ?? 'wallet'}</span>
                  </div>
                  <span className="ds-caption text-ds-ink-muted">
                    {day(m.dataRegistrazione)}
                    {m.descrizione ? ` · ${m.descrizione}` : ''}
                  </span>
                </div>
                <div className="flex flex-none items-center justify-between gap-3 sm:justify-end">
                  <DsAmount value={m.valore} neutral />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelling(m)}
                      disabled={busyId === m.id}
                      className={cn(dsButtonClass('ghost', 'sm'), 'disabled:opacity-50')}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePay(m)}
                      disabled={busyId === m.id}
                      className={cn(dsButtonClass('primary', 'sm'), 'disabled:opacity-50')}
                    >
                      Segna pagato
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className={cn(DS_PANEL, 'grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-5')}
      >
        <OmDropdown
          id="wallets-filtro-collaboratore"
          label="Collaboratore"
          allLabel="Tutti i collaboratori"
          size="sm"
          emptyText="Nessun collaboratore con questo nome."
          options={holderOptions}
          selected={holderIds}
          onChange={(next) => {
            setHolderIds(next)
            setPage(0)
          }}
        />
        <OmDropdown
          id="wallets-filtro-metodo"
          label="Metodo"
          allLabel="Tutti i metodi"
          size="sm"
          emptyText="Nessun metodo con questo nome."
          options={methodOptions}
          selected={methodIds}
          onChange={(next) => {
            setMethodIds(next)
            setPage(0)
          }}
        />
        <GTextField
          id="wallets-filtro-descrizione"
          label="Descrizione"
          type="search"
          size="sm"
          placeholder="Cerca nella descrizione"
          value={descrizione}
          onChange={(v) => {
            setDescrizione(v)
            setPage(0)
          }}
        />
        <GSelect
          id="wallets-filtro-stato"
          label="Stato"
          size="sm"
          options={STATO_FILTER}
          value={filterStato}
          onChange={(v) => {
            setFilterStato(v)
            setPage(0)
          }}
        />
        <GSelect
          id="wallets-filtro-bloccato"
          label="Blocco"
          size="sm"
          options={BLOCCATO_FILTER}
          value={filterBloccato}
          onChange={(v) => {
            setFilterBloccato(v as Bloccato)
            setPage(0)
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filtered ? (
            <>
              <span className="ds-label text-ds-ink-muted uppercase">Filtri attivi</span>
              {active.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-label={`Togli il filtro ${f.label}`}
                  onClick={() => {
                    f.clear()
                    setPage(0)
                  }}
                  className={dsButtonClass('ghost', 'sm')}
                >
                  {f.label}
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ))}
              <button type="button" onClick={resetFilters} className={dsButtonClass('ghost', 'sm')}>
                Azzera
              </button>
            </>
          ) : (
            <span className="ds-body-sm text-ds-ink-muted">
              {loaded ? countLabel(wallets.length, 'wallet', 'wallet') : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="wallets-ordina" className="ds-body-sm text-ds-ink-muted">
            Ordina per
          </label>
          <GSelect
            id="wallets-ordina"
            options={SORT_OPTIONS}
            value={sortSaldo}
            onChange={(v) => {
              setSortSaldo(v as 'asc' | 'desc')
              setPage(0)
            }}
            className="w-[210px]"
          />
        </div>
      </div>

      {!loaded && wallets.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei wallet…</p>
      )}
      {loaded && wallets.length === 0 && (
        <DsEmptyState
          icon={<WalletIcon className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun wallet registrato"
          description="Apri il primo wallet di un collaboratore su un metodo di pagamento: lo ritrovi qui con il suo saldo."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={dsButtonClass('primary', 'md')}
            >
              <Plus className="h-5 w-5" aria-hidden />
              Nuovo wallet
            </button>
          }
        />
      )}
      {wallets.length > 0 && total === 0 && (
        <DsEmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun wallet con questi filtri"
          description="Togli un filtro o scegli un altro collaboratore."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className={dsButtonClass('secondary', 'md')}
            >
              Azzera i filtri
            </button>
          }
        />
      )}

      {visible.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">
                Wallet, ordinati per saldo dal più {sortSaldo === 'desc' ? 'alto' : 'basso'}
              </caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="w-[200px] py-3 pr-2.5 pl-4">
                    Metodo e collaboratore
                  </th>
                  <th scope="col" className="min-w-[160px] px-2.5 py-3">
                    Descrizione
                  </th>
                  <th scope="col" className="w-[128px] px-2.5 py-3 text-right">
                    Saldo attuale
                  </th>
                  <th scope="col" className="w-[112px] px-2.5 py-3 text-right">
                    In attesa
                  </th>
                  <th scope="col" className="w-[200px] px-2.5 py-3">
                    Stato
                  </th>
                  <th scope="col" className="w-[64px] py-3 pr-4 pl-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => (
                  <tr key={w.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4">{walletCell(w)}</td>
                    <td className="max-w-[260px] px-2.5 py-3">{descrizioneCell(w)}</td>
                    <td className="px-2.5 py-3 text-right">
                      <DsAmount value={w.saldoAttuale} neutral size="sm" />
                    </td>
                    <td className="px-2.5 py-3 text-right">{inAttesaCell(w)}</td>
                    <td className="px-2.5 py-3">{statusCell(w)}</td>
                    <td className="py-2 pr-4 pl-2 text-right">{editButton(w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {visible.map((w) => (
              <li key={w.id} className={DS_CARD}>
                <div className="flex items-start justify-between gap-3">
                  {walletCell(w)}
                  <div className="flex flex-col items-end gap-0.5">
                    <DsAmount value={w.saldoAttuale} neutral />
                    {w.inAttesa > 0 && (
                      <span className="ds-caption text-ds-warning">
                        più {money(w.inAttesa)} in attesa
                      </span>
                    )}
                  </div>
                </div>
                {w.descrizione && descrizioneCell(w)}
                <div className="flex items-center justify-between gap-2 border-t border-ds-line pt-3">
                  {statusCell(w)}
                  {editButton(w)}
                </div>
              </li>
            ))}
          </ul>

          {total > PAGE_SIZE && (
            <OmPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={total}
              unit="wallet"
              onChange={setPage}
            />
          )}
        </div>
      )}

      <WalletCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <WalletEditModal
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        wallet={editing}
      />
      <WalletTransferModal
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open)
          if (!open) void fetchWallets()
        }}
      />
      <WalletTopupExpenseModal
        open={topupOpen}
        onOpenChange={(open) => {
          setTopupOpen(open)
          if (!open) void fetchWallets()
        }}
      />

      <DsModal
        open={cancelling != null}
        onOpenChange={(open) => {
          if (!open && busyId !== cancelling?.id) setCancelling(null)
        }}
        title="Annullare il prelievo?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCancelling(null)}
              disabled={busyId === cancelling?.id}
              className={dsButtonClass('ghost', 'md')}
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={() => void confirmCancel()}
              disabled={busyId === cancelling?.id}
              className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
            >
              {busyId === cancelling?.id ? 'Annullamento…' : 'Annulla il prelievo'}
            </button>
          </>
        }
      >
        <p className="ds-body m-0 text-pretty text-ds-ink">
          {cancelling
            ? `Il prelievo di ${money(cancelling.valore)} verso ${cancelling.walletNome ?? 'il wallet'} sparisce e il conto riprende l’importo.`
            : ''}
        </p>
      </DsModal>
    </>
  )
}
