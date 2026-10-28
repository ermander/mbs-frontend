'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Filter, ListChecks, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsMoney } from '@/components/landing/ds-data'
import { OmBookLogo, OmDropdown, OmPagination } from '@/components/strumenti/scanner-v2/om-ds'
import { QuickBetModal } from '@/components/profit-tracker/quick-bet-modal'
import {
  DsModal,
  GIconButton,
  GNotice,
  GSelect,
  GTextField,
  dsDangerButtonClass,
  type GNoticeData,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { useAccountInfo } from '@/components/profit-tracker/giocate-rapide/use-account-info'
import { formatMoney } from '@/lib/landing-format'
import { getErrorMessage } from '@/lib/error-utils'
import { QUICK_METHODS } from '@/lib/profit-tracker/categories'
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import {
  EMPTY_QUICK_FILTERS,
  NO_TAG,
  quickMethodLabel,
  registeredLabel,
  type QuickBetFilters,
  type QuickBetSort,
} from '@/lib/profit-tracker/quick-bets'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { QuickBet } from '@/types/profit-tracker'

/**
 * Giocate rapide dal design «OddWise Giocate rapide» di Claude Design: testata con «Nuova giocata
 * rapida», ricerca, Filtri, Ordina per, filtri attivi, tabella con tag in riga, Inverti ed
 * Elimina (schede sul telefono), paginazione, avvisi con «Annulla» e conferma dell'eliminazione.
 * Filtri, ricerca, ordinamento e pagine li fa il backend (§14.293): la vista chiede una pagina
 * alla volta e la richiede dopo ogni modifica.
 */

const NOTICE_MS = 7000
const FLASH_MS = 1500
const PAGE_SIZES = [10, 25, 50]
/** La ricerca parte quando si smette di scrivere. */
const SEARCH_DEBOUNCE_MS = 300

const SORT_OPTIONS = [
  { value: 'data', label: 'Data registrazione' },
  { value: 'alto', label: 'Movimento, dal più alto' },
  { value: 'basso', label: 'Movimento, dal più basso' },
]
const METHOD_FILTER_OPTIONS = [
  { value: '', label: 'Tutti i metodi' },
  ...QUICK_METHODS.map((m) => ({ value: m.value, label: m.label })),
]

const ymdToDmy = (v: string) => v.split('-').reverse().join('/')
const money = (n: number) => formatMoney(n, { sign: true })

export function GiocateRapideView() {
  const pageRows = useProfitTrackerStore((s) => s.quickBets)
  const total = useProfitTrackerStore((s) => s.quickBetsTotal)
  const servedPage = useProfitTrackerStore((s) => s.quickBetsPage)
  const isLoading = useProfitTrackerStore((s) => s.isLoadingQuickBets)
  const loadError = useProfitTrackerStore((s) => s.quickBetsError)
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchQuickBets = useProfitTrackerStore((s) => s.fetchQuickBets)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)
  const updateQuickBet = useProfitTrackerStore((s) => s.updateQuickBet)
  const removeQuickBet = useProfitTrackerStore((s) => s.removeQuickBet)
  const { accountInfo, accountOptions } = useAccountInfo()

  const [q, setQ] = useState('')
  const [searched, setSearched] = useState('')
  const [reload, setReload] = useState(0)
  const [sort, setSort] = useState<QuickBetSort>('data')
  const [filters, setFilters] = useState<QuickBetFilters>(EMPTY_QUICK_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [newOpen, setNewOpen] = useState(false)
  const [toDelete, setToDelete] = useState<QuickBet | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<GNoticeData | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  useEffect(() => {
    void fetchTags()
  }, [fetchTags])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearched(q.trim())
      setPage(0)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    void fetchQuickBets({
      page: page + 1,
      limit: pageSize,
      q: searched,
      accountId: filters.accountId,
      method: filters.metodo,
      tag: filters.tag,
      dal: filters.dal,
      al: filters.al,
      sort,
    })
  }, [fetchQuickBets, page, pageSize, searched, filters, sort, reload])

  /** Richiede la pagina: dopo una modifica righe e totale possono cambiare. */
  const refresh = () => setReload((n) => n + 1)

  // L'avviso se ne va da solo dopo 7 s, il lampo della riga dopo 1,5 s.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(t)
  }, [notice])
  useEffect(() => {
    if (!flashId) return
    const t = setTimeout(() => setFlashId(null), FLASH_MS)
    return () => clearTimeout(t)
  }, [flashId])

  // Il backend serve l'ultima pagina al posto di una che non esiste più (filtri, eliminazioni).
  const shownPage = Math.max(0, servedPage - 1)

  const tagOptions = [
    { value: '', label: 'Nessun tag' },
    ...tags.map((t) => ({ value: t.nome, label: t.nome })),
  ]

  const setFilter = <K extends keyof QuickBetFilters>(k: K, v: QuickBetFilters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setPage(0)
  }
  const resetAll = () => {
    setQ('')
    setSearched('')
    setFilters(EMPTY_QUICK_FILTERS)
    setPage(0)
  }

  const active: { key: keyof QuickBetFilters; label: string; value: string }[] = []
  if (filters.accountId)
    active.push({ key: 'accountId', label: 'Conto', value: accountInfo(filters.accountId).label })
  if (filters.metodo)
    active.push({ key: 'metodo', label: 'Metodo', value: quickMethodLabel(filters.metodo) })
  if (filters.tag)
    active.push({
      key: 'tag',
      label: 'Tag',
      value: filters.tag === NO_TAG ? 'Nessun tag' : filters.tag,
    })
  if (filters.dal) active.push({ key: 'dal', label: 'Dal', value: ymdToDmy(filters.dal) })
  if (filters.al) active.push({ key: 'al', label: 'Al', value: ymdToDmy(filters.al) })
  const hasAnyFilter = active.length > 0 || q.trim() !== ''
  // Quello che il backend ha davvero filtrato, per gli stati vuoti.
  const filtered = active.length > 0 || searched !== ''

  const where = (bet: QuickBet) => `su ${accountInfo(bet.accountId).label}`

  /* ---------- Azioni ---------- */

  const handleInvert = async (bet: QuickBet) => {
    const was = bet.movimento
    try {
      await updateQuickBet(bet.id, { movimento: -was })
      refresh()
      setFlashId(bet.id)
      setNotice({
        title: 'Movimento invertito',
        text: `Ora è ${money(-was)} ${where(bet)}.`,
        actions: [
          {
            label: 'Annulla',
            onClick: () => {
              setNotice(null)
              void updateQuickBet(bet.id, { movimento: was })
                .then(refresh)
                .catch((err) =>
                  toast.error(getErrorMessage(err) ?? 'Impossibile rimettere il movimento.'),
                )
            },
          },
        ],
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile invertire il movimento.')
    }
  }

  const handleTag = (bet: QuickBet, value: string) =>
    void updateQuickBet(bet.id, { tag: value || null })
      .then(refresh)
      .catch((err) => toast.error(getErrorMessage(err) ?? 'Impossibile cambiare il tag.'))

  const confirmDelete = async () => {
    const bet = toDelete
    if (!bet) return
    setDeleting(true)
    try {
      await removeQuickBet(bet.id)
      refresh()
      setToDelete(null)
      setNotice({
        title: 'Giocata eliminata',
        text: `${money(bet.movimento)} ${where(bet)} non conta più nel saldo.`,
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile eliminare la giocata.')
    } finally {
      setDeleting(false)
    }
  }

  const onSaved = (created: QuickBet[]) => {
    if (created.length === 0) return
    const first = created[0]
    const names = created.map((b) => accountInfo(b.accountId).label)
    const list =
      names.length > 2
        ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
        : names.join(' e ')
    setSort('data')
    setPage(0)
    refresh()
    setFlashId(first.id)
    setNotice({
      title: created.length === 1 ? 'Giocata salvata' : `${created.length} giocate salvate`,
      text: `${money(first.movimento)} in ${quickMethodLabel(first.quickMethod)} su ${list}.`,
      actions: [
        {
          label: 'Annulla',
          onClick: () => {
            setNotice(null)
            void Promise.all(created.map((b) => removeQuickBet(b.id)))
              .catch((err) =>
                toast.error(getErrorMessage(err) ?? 'Impossibile togliere le giocate salvate.'),
              )
              .finally(refresh)
          },
        },
      ],
    })
  }

  /* ---------- Pezzi delle righe ---------- */

  const whenCell = (bet: QuickBet) => {
    const r = registeredLabel(bet)
    return (
      <>
        <span className="ds-num-sm block whitespace-nowrap text-ds-ink">{r.date}</span>
        {r.caption && (
          <span className="ds-caption mt-0.5 block whitespace-nowrap tabular-nums text-ds-ink-muted">
            {r.caption}
          </span>
        )}
      </>
    )
  }

  const accountCell = (bet: QuickBet) => {
    const info = accountInfo(bet.accountId)
    return (
      <>
        {info.book ? (
          <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />
        ) : (
          <span className="text-ds-ink-faint">—</span>
        )}
        <span className="ds-caption mt-1 block text-ds-ink-muted">{info.holderName}</span>
      </>
    )
  }

  const tagSelect = (bet: QuickBet, where: 'riga' | 'scheda') => (
    <GSelect
      id={`rapida-tag-${where}-${bet.id}`}
      ariaLabel={`Tag della giocata del ${registeredLabel(bet).date}`}
      size="sm"
      options={
        bet.tag && !tags.some((t) => t.nome === bet.tag)
          ? [...tagOptions, { value: bet.tag, label: bet.tag }]
          : tagOptions
      }
      value={bet.tag ?? ''}
      onChange={(v) => handleTag(bet, v)}
    />
  )

  const notaCell = (bet: QuickBet) =>
    bet.nota ? (
      <span title={bet.nota} className="ds-body-sm block truncate text-ds-ink-muted">
        {bet.nota}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const actions = (bet: QuickBet) => (
    <div className="flex items-center justify-end gap-0.5">
      <GIconButton label="Inverti il segno" onClick={() => void handleInvert(bet)}>
        <ArrowLeftRight className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label="Elimina" danger onClick={() => setToDelete(bet)}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  const newButton = (
    <button
      type="button"
      onClick={() => setNewOpen(true)}
      className={dsButtonClass('primary', 'md')}
    >
      <Plus className="h-5 w-5" aria-hidden />
      Nuova giocata rapida
    </button>
  )

  const isEmptyAll = !isLoading && total === 0 && !filtered
  const isEmptyFiltered = !isLoading && total === 0 && filtered

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="ds-title m-0">Giocate rapide</h1>
        {newButton}
      </div>

      {loadError && (
        <p
          role="alert"
          className="ds-body-sm m-0 rounded-ds-sm bg-ds-loss-soft px-3 py-2 text-ds-loss"
        >
          {loadError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <GTextField
            id="rapide-cerca"
            ariaLabel="Cerca conto, metodo o nota"
            type="search"
            placeholder="Cerca conto, metodo o nota"
            value={q}
            onChange={setQ}
            prefix={<Search className="h-5 w-5" aria-hidden />}
            className="w-full sm:w-[280px]"
          />
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="rapide-filtri"
            onClick={() => setShowFilters((v) => !v)}
            className={dsButtonClass(showFilters ? 'primary' : 'secondary', 'md')}
          >
            <Filter className="h-5 w-5" aria-hidden />
            Filtri{active.length ? ` · ${active.length}` : ''}
          </button>
          {hasAnyFilter && (
            <button type="button" onClick={resetAll} className={dsButtonClass('ghost', 'md')}>
              <X className="h-5 w-5" aria-hidden />
              Azzera
            </button>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="rapide-ordina" className="ds-body-sm text-ds-ink-muted">
            Ordina per
          </label>
          <GSelect
            id="rapide-ordina"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => {
              setSort(v as QuickBetSort)
              setPage(0)
            }}
            className="w-[220px]"
          />
        </div>
      </div>

      {showFilters && (
        <div
          id="rapide-filtri"
          className="grid grid-cols-1 gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-6 py-5 shadow-ds-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <OmDropdown
            id="rapide-filtro-conto"
            label="Conto / bookmaker"
            allLabel="Tutti i conti"
            single
            size="sm"
            panelWidth={300}
            emptyText="Nessun conto con questo nome."
            options={accountOptions}
            selected={filters.accountId ? [filters.accountId] : []}
            onChange={(next) => setFilter('accountId', next[0] ?? '')}
          />
          <GSelect
            id="rapide-filtro-metodo"
            label="Metodo"
            size="sm"
            options={METHOD_FILTER_OPTIONS}
            value={filters.metodo}
            onChange={(v) => setFilter('metodo', v)}
          />
          <GSelect
            id="rapide-filtro-tag"
            label="Tag"
            size="sm"
            options={[
              { value: '', label: 'Tutti i tag' },
              { value: NO_TAG, label: 'Nessun tag' },
              ...tags.map((t) => ({ value: t.nome, label: t.nome })),
            ]}
            value={filters.tag}
            onChange={(v) => setFilter('tag', v)}
          />
          <GTextField
            id="rapide-filtro-dal"
            label="Registrata dal"
            size="sm"
            type="date"
            value={filters.dal}
            onChange={(v) => setFilter('dal', v)}
          />
          <GTextField
            id="rapide-filtro-al"
            label="Registrata al"
            size="sm"
            type="date"
            value={filters.al}
            onChange={(v) => setFilter('al', v)}
          />
        </div>
      )}

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="ds-label uppercase text-ds-ink-muted">Filtri attivi</span>
          {active.map((a) => (
            <button
              key={a.key}
              type="button"
              aria-label={`Togli il filtro ${a.label}: ${a.value}`}
              onClick={() => setFilter(a.key, EMPTY_QUICK_FILTERS[a.key])}
              className={dsButtonClass('ghost', 'sm')}
            >
              {a.label}: {a.value}
              <X className="h-4 w-4" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {isLoading && pageRows.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento giocate…</p>
      )}
      {isEmptyAll && !loadError && (
        <EmptyCard
          icon={<ListChecks className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessuna giocata rapida"
          description="Registra la prima sessione di casinò, un gratta e vinci o una partita veloce."
          action={newButton}
        />
      )}
      {isEmptyFiltered && (
        <EmptyCard
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessuna giocata con questi filtri"
          description="Togli un filtro o cerca un altro conto."
          action={
            <button type="button" onClick={resetAll} className={dsButtonClass('secondary', 'md')}>
              Azzera i filtri
            </button>
          }
        />
      )}

      {pageRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                Giocate rapide, ordinate per{' '}
                {sort === 'data'
                  ? 'data, dalla più recente'
                  : SORT_OPTIONS.find((o) => o.value === sort)?.label.toLowerCase()}
              </caption>
              <thead>
                <tr className="ds-label bg-ds-surface-sunken text-left uppercase text-ds-ink-muted">
                  <th scope="col" className="w-[116px] whitespace-nowrap py-3 pl-4 pr-2.5">
                    Registrata il
                  </th>
                  <th scope="col" className="w-[150px] px-2.5 py-3">
                    Conto
                  </th>
                  <th scope="col" className="w-[130px] px-2.5 py-3">
                    Metodo
                  </th>
                  <th scope="col" className="w-[170px] px-2.5 py-3">
                    Tag
                  </th>
                  <th scope="col" className="min-w-[180px] px-2.5 py-3">
                    Nota
                  </th>
                  <th scope="col" className="w-[120px] px-2.5 py-3 text-right">
                    Movimento
                  </th>
                  <th scope="col" className="w-[84px] py-3 pl-2 pr-4">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((bet) => (
                  <tr
                    key={bet.id}
                    className={cn(
                      'border-t border-ds-line align-top transition-colors',
                      flashId === bet.id && 'bg-ds-brand-soft',
                    )}
                  >
                    <td className="py-3 pl-4 pr-2.5">{whenCell(bet)}</td>
                    <td className="px-2.5 py-3">{accountCell(bet)}</td>
                    <td className="whitespace-nowrap px-2.5 py-3 font-semibold text-ds-ink">
                      {quickMethodLabel(bet.quickMethod)}
                    </td>
                    <td className="px-2.5 py-3">{tagSelect(bet, 'riga')}</td>
                    <td className="max-w-[260px] px-2.5 py-3">{notaCell(bet)}</td>
                    <td className="px-2.5 py-3 text-right">
                      <DsMoney value={bet.movimento} size="sm" />
                    </td>
                    <td className="py-2 pl-2 pr-4">{actions(bet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {pageRows.map((bet) => (
              <li
                key={bet.id}
                className={cn(
                  'flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm transition-colors',
                  flashId === bet.id && 'bg-ds-brand-soft',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold text-ds-ink">
                      {quickMethodLabel(bet.quickMethod)}
                    </span>
                    <div>{whenCell(bet)}</div>
                  </div>
                  <DsMoney value={bet.movimento} />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>{accountCell(bet)}</div>
                  {bet.nota && (
                    <div className="min-w-0 max-w-[60%] text-right">{notaCell(bet)}</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-ds-line pt-3">
                  <div className="w-[170px]">{tagSelect(bet, 'scheda')}</div>
                  {actions(bet)}
                </div>
              </li>
            ))}
          </ul>

          <OmPagination
            page={shownPage}
            pageSize={pageSize}
            total={total}
            unit={total === 1 ? 'giocata' : 'giocate'}
            onChange={setPage}
          >
            <span className="flex items-center gap-2.5">
              <label htmlFor="rapide-righe" className="whitespace-nowrap">
                Righe per pagina
              </label>
              <GSelect
                id="rapide-righe"
                size="sm"
                options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v))
                  setPage(0)
                }}
                className="w-[76px]"
              />
            </span>
          </OmPagination>
        </div>
      )}

      <QuickBetModal open={newOpen} onOpenChange={setNewOpen} onSaved={onSaved} />

      <DsModal
        open={toDelete != null}
        onOpenChange={(next) => !next && !deleting && setToDelete(null)}
        title="Eliminare la giocata rapida?"
        description={
          toDelete
            ? `${quickMethodLabel(toDelete.quickMethod)} · ${accountInfo(toDelete.accountId).label} · ${money(toDelete.movimento)}`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setToDelete(null)}
              disabled={deleting}
              className={dsButtonClass('ghost', 'md')}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
            >
              {deleting ? 'Eliminazione…' : 'Elimina la giocata'}
            </button>
          </>
        }
      >
        <p className="ds-body m-0 text-ds-ink [text-wrap:pretty]">
          L&apos;eliminazione è definitiva: il movimento non conterà più nel saldo del conto e nelle
          statistiche.
        </p>
      </DsModal>

      {notice && <GNotice notice={notice} onDismiss={() => setNotice(null)} />}
    </>
  )
}

function EmptyCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm">
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted">
          {icon}
        </span>
        <h2 className="ds-heading m-0">{title}</h2>
        <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">{description}</p>
        <div className="mt-3">{action}</div>
      </div>
    </div>
  )
}
