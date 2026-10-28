'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArchiveRestore, ArrowRight, Filter, ListChecks, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge, DsMoney } from '@/components/landing/ds-data'
import {
  OmBookLogo,
  OmDropdown,
  OmPagination,
  OmSportIcon,
} from '@/components/strumenti/scanner-v2/om-ds'
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
import {
  EMPTY_ARCHIVED_FILTERS,
  ESITO_LABEL,
  NO_TAG,
  archivedCaption,
  archivedListParams,
  eventDateLabel,
  type ArchivedFilters,
  type ArchivedSort,
} from '@/lib/profit-tracker/archived-bets'
import {
  SPORT_LABEL,
  bookLogoSlug,
  displayName,
  isMultipla,
  multiplaEvents,
} from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import {
  deleteBet,
  getArchivedBetsPage,
  updateBet,
  type ArchivedBetPage,
} from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { ArchivedBet, ModalitaSaldo } from '@/types/profit-tracker'

/**
 * Giocate archiviate dal design «OddWise Giocate archiviate» di Claude Design (§14.298): ricerca,
 * Filtri, Ordina per, filtri attivi, tabella con profitto e data di archiviazione, Ripristina ed
 * Elimina (schede sul telefono), paginazione e avvisi con «Annulla». Filtri, ricerca, ordinamento
 * e pagine li fa il backend: la vista chiede una pagina alla volta e la richiede dopo ogni modifica.
 */

const NOTICE_MS = 7000
const FLASH_MS = 1500
const PAGE_SIZES = [10, 25, 50]
/** La ricerca parte quando si smette di scrivere. */
const SEARCH_DEBOUNCE_MS = 300

const SORT_OPTIONS = [
  { value: 'evento', label: 'Data evento' },
  { value: 'archiviazione', label: 'Data archiviazione' },
  { value: 'profitto', label: 'Profitto, dal più alto' },
]
const SPORT_OPTIONS = [
  { value: '', label: 'Tutti gli sport' },
  ...Object.entries(SPORT_LABEL).map(([value, label]) => ({ value, label })),
]
const MODE_LABEL: Record<ModalitaSaldo, string> = {
  reale: 'Reale',
  bonus: 'Bonus',
  rimborso: 'Rimborso',
}
const MODE_OPTIONS = [
  { value: '', label: 'Tutti i saldi' },
  { value: 'reale', label: 'Saldo reale' },
  { value: 'bonus', label: 'Saldo bonus' },
  { value: 'rimborso', label: 'Saldo rimborso' },
]
const ESITO_OPTIONS = [
  { value: '', label: 'Tutti gli esiti' },
  ...Object.entries(ESITO_LABEL).map(([value, label]) => ({ value, label })),
]
const TIPO_OPTIONS = [
  { value: '', label: 'Singole e multiple' },
  { value: 'singola', label: 'Singola' },
  { value: 'multipla', label: 'Multipla' },
]

const ymdToDmy = (v: string) => v.split('-').reverse().join('/')
const money = (n: number) => formatMoney(n, { sign: true })

const NOT_DELETABLE =
  'Elimina: non disponibile, la giocata ha gambe vinte o perse che contano nei saldi'

export function GiocateArchiviateView() {
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)
  const { accountInfo, accountOptions } = useAccountInfo()

  const [q, setQ] = useState('')
  const [searched, setSearched] = useState('')
  const [reload, setReload] = useState(0)
  const [sort, setSort] = useState<ArchivedSort>('evento')
  const [filters, setFilters] = useState<ArchivedFilters>(EMPTY_ARCHIVED_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [toDelete, setToDelete] = useState<ArchivedBet | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<GNoticeData | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<{
    key: string
    data?: ArchivedBetPage
    error?: string
  } | null>(null)

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

  const params = useMemo(
    () => archivedListParams(page, pageSize, searched, filters, sort),
    [page, pageSize, searched, filters, sort],
  )
  // Ogni richiesta ha la sua chiave: «in caricamento» è una chiave ancora senza risposta, così
  // l'effetto cambia stato solo quando la risposta arriva (lint di React Compiler).
  const requestKey = `${JSON.stringify(params)}#${reload}`
  useEffect(() => {
    let alive = true
    getArchivedBetsPage(params)
      .then((data) => alive && setLoaded({ key: requestKey, data }))
      .catch(
        (err) =>
          alive &&
          setLoaded((prev) => ({
            key: requestKey,
            data: prev?.data,
            error: getErrorMessage(err) ?? 'Impossibile caricare le giocate archiviate.',
          })),
      )
    return () => {
      alive = false
    }
  }, [params, requestKey])

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

  const isLoading = loaded?.key !== requestKey
  const loadError = loaded?.key === requestKey ? loaded.error : undefined
  // Durante una richiesta resta la pagina di prima, non una tabella vuota.
  const pageRows = loaded?.data?.items ?? []
  const total = loaded?.data?.total ?? 0
  // Il backend serve l'ultima pagina al posto di una che non esiste più (filtri, eliminazioni).
  const shownPage = Math.max(0, (loaded?.data?.page ?? 1) - 1)

  const setFilter = <K extends keyof ArchivedFilters>(k: K, v: ArchivedFilters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }))
    setPage(0)
  }
  const resetAll = () => {
    setQ('')
    setSearched('')
    setFilters(EMPTY_ARCHIVED_FILTERS)
    setPage(0)
  }

  const active: { key: keyof ArchivedFilters; label: string; value: string }[] = []
  if (filters.sport)
    active.push({ key: 'sport', label: 'Sport', value: SPORT_LABEL[filters.sport] })
  if (filters.accountId)
    active.push({ key: 'accountId', label: 'Conto', value: accountInfo(filters.accountId).label })
  if (filters.modalitaSaldo)
    active.push({ key: 'modalitaSaldo', label: 'Saldo', value: MODE_LABEL[filters.modalitaSaldo] })
  if (filters.esito)
    active.push({ key: 'esito', label: 'Esito', value: ESITO_LABEL[filters.esito] })
  if (filters.tag)
    active.push({
      key: 'tag',
      label: 'Tag',
      value: filters.tag === NO_TAG ? 'Nessun tag' : filters.tag,
    })
  if (filters.tipo)
    active.push({
      key: 'tipo',
      label: 'Tipo',
      value: filters.tipo === 'singola' ? 'Singola' : 'Multipla',
    })
  if (filters.dal) active.push({ key: 'dal', label: 'Dal', value: ymdToDmy(filters.dal) })
  if (filters.al) active.push({ key: 'al', label: 'Al', value: ymdToDmy(filters.al) })
  const hasAnyFilter = active.length > 0 || q.trim() !== ''
  // Quello che il backend ha davvero filtrato, per gli stati vuoti.
  const filtered = active.length > 0 || searched !== ''

  /* ---------- Azioni ---------- */

  const handleRestore = async (bet: ArchivedBet) => {
    try {
      await updateBet(bet.id, { archiviata: false })
      refresh()
      setNotice({
        title: 'Giocata ripristinata',
        text: `${displayName(bet)} è di nuovo tra le giocate in corso.`,
        actions: [
          {
            label: 'Annulla',
            onClick: () => {
              setNotice(null)
              void updateBet(bet.id, { archiviata: true })
                .then(() => {
                  refresh()
                  setFlashId(bet.id)
                })
                .catch((err) =>
                  toast.error(
                    getErrorMessage(err) ?? 'Impossibile archiviare di nuovo la giocata.',
                  ),
                )
            },
          },
        ],
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile ripristinare la giocata.')
    }
  }

  const confirmDelete = async () => {
    const bet = toDelete
    if (!bet) return
    setDeleting(true)
    try {
      await deleteBet(bet.id)
      refresh()
      setToDelete(null)
      setNotice({
        title: 'Giocata eliminata',
        text: `${displayName(bet)} non è più nello storico.`,
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile eliminare la giocata.')
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Pezzi delle righe ---------- */

  const whenCell = (bet: ArchivedBet) => {
    const caption = archivedCaption(bet.archiviataAt)
    return (
      <>
        <span className="ds-num-sm block whitespace-nowrap text-ds-ink">
          {eventDateLabel(bet.eventoData)}
        </span>
        {caption && (
          <span className="ds-caption mt-0.5 block whitespace-nowrap tabular-nums text-ds-ink-muted">
            {caption}
          </span>
        )}
      </>
    )
  }

  const eventCell = (bet: ArchivedBet) => {
    const multi = isMultipla(bet)
    const events = multi ? multiplaEvents(bet) : []
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start gap-2" title={multi ? events.join(', ') : bet.eventoNome}>
          <span className="mt-0.5 inline-flex text-ds-ink-muted">
            <OmSportIcon sport={bet.sport} size={20} />
          </span>
          <span className="font-semibold text-ds-ink [text-wrap:pretty]">
            {multi ? events[0] : bet.eventoNome}
            {multi && events.length > 1 && (
              <span className="font-normal text-ds-ink-muted"> +{events.length - 1}</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-7">
          <DsBadge tone={multi ? 'brand' : 'neutral'}>{multi ? 'Multipla' : 'Singola'}</DsBadge>
        </div>
      </div>
    )
  }

  const accountCell = (bet: ArchivedBet) => {
    const info = accountInfo(bet.accountId)
    const mode = bet.modalitaSaldo !== 'reale' ? ` · saldo ${bet.modalitaSaldo}` : ''
    return (
      <>
        {info.book ? (
          <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />
        ) : (
          <span className="text-ds-ink-faint">—</span>
        )}
        <span className="ds-caption mt-1 block text-ds-ink-muted">
          {info.holderName}
          {mode}
        </span>
      </>
    )
  }

  const profitCell = (bet: ArchivedBet, size: 'sm' | 'md') => (
    <>
      <DsMoney value={bet.profitto} size={size} />
      {bet.esito === 'void' && (
        <span className="ds-caption block whitespace-nowrap text-ds-ink-muted">rimborsata</span>
      )}
    </>
  )

  const muted = (text: string | undefined | null) =>
    text ? (
      <span title={text} className="ds-body-sm block truncate text-ds-ink-muted">
        {text}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const actions = (bet: ArchivedBet) => (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/profit-tracker/giocate-archiviate/${bet.id}`}
        title={`Apri il dettaglio di ${displayName(bet)}`}
        className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
      >
        Dettaglio
      </Link>
      <GIconButton label="Ripristina" onClick={() => void handleRestore(bet)}>
        <ArchiveRestore className="h-4 w-4" aria-hidden />
      </GIconButton>
      {bet.eliminabile ? (
        <GIconButton label="Elimina" danger onClick={() => setToDelete(bet)}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </GIconButton>
      ) : (
        // Il backend non elimina una giocata con gambe chiuse: il titolo sul contenitore,
        // perché un pulsante disattivato non mostra il suo.
        <span title={NOT_DELETABLE} className="inline-flex">
          <GIconButton label={NOT_DELETABLE} danger disabled onClick={() => undefined}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </GIconButton>
        </span>
      )}
    </div>
  )

  const isEmptyAll = !isLoading && !loadError && total === 0 && !filtered
  const isEmptyFiltered = !isLoading && !loadError && total === 0 && filtered

  return (
    <>
      <h1 className="ds-title m-0">Giocate archiviate</h1>

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
            id="archiviate-cerca"
            ariaLabel="Cerca evento o conto"
            type="search"
            placeholder="Cerca evento o conto"
            value={q}
            onChange={setQ}
            prefix={<Search className="h-5 w-5" aria-hidden />}
            className="w-full sm:w-[280px]"
          />
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="archiviate-filtri"
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
          <label htmlFor="archiviate-ordina" className="ds-body-sm text-ds-ink-muted">
            Ordina per
          </label>
          <GSelect
            id="archiviate-ordina"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => {
              setSort(v as ArchivedSort)
              setPage(0)
            }}
            className="w-[220px]"
          />
        </div>
      </div>

      {showFilters && (
        <div
          id="archiviate-filtri"
          className="grid grid-cols-1 gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-6 py-5 shadow-ds-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <GSelect
            id="archiviate-filtro-sport"
            label="Sport"
            size="sm"
            options={SPORT_OPTIONS}
            value={filters.sport}
            onChange={(v) => setFilter('sport', v as ArchivedFilters['sport'])}
          />
          <OmDropdown
            id="archiviate-filtro-conto"
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
            id="archiviate-filtro-saldo"
            label="Modalità saldo"
            size="sm"
            options={MODE_OPTIONS}
            value={filters.modalitaSaldo}
            onChange={(v) => setFilter('modalitaSaldo', v as ArchivedFilters['modalitaSaldo'])}
          />
          <GSelect
            id="archiviate-filtro-esito"
            label="Esito"
            size="sm"
            options={ESITO_OPTIONS}
            value={filters.esito}
            onChange={(v) => setFilter('esito', v as ArchivedFilters['esito'])}
          />
          <GSelect
            id="archiviate-filtro-tag"
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
          <GSelect
            id="archiviate-filtro-tipo"
            label="Tipo giocata"
            size="sm"
            options={TIPO_OPTIONS}
            value={filters.tipo}
            onChange={(v) => setFilter('tipo', v as ArchivedFilters['tipo'])}
          />
          <GTextField
            id="archiviate-filtro-dal"
            label="Evento dal"
            size="sm"
            type="date"
            value={filters.dal}
            onChange={(v) => setFilter('dal', v)}
          />
          <GTextField
            id="archiviate-filtro-al"
            label="Evento al"
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
              onClick={() => setFilter(a.key, EMPTY_ARCHIVED_FILTERS[a.key])}
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
      {isEmptyAll && (
        <EmptyCard
          icon={<ListChecks className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessuna giocata archiviata"
          description="Quando una giocata in corso si chiude, archiviala: la ritrovi qui con il suo profitto."
          action={
            <Link href="/profit-tracker/giocate" className={dsButtonClass('primary', 'md')}>
              Vai alle giocate in corso
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          }
        />
      )}
      {isEmptyFiltered && (
        <EmptyCard
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessuna giocata con questi filtri"
          description="Togli un filtro o cerca un altro evento."
          action={
            <button type="button" onClick={resetAll} className={dsButtonClass('secondary', 'md')}>
              Azzera i filtri
            </button>
          }
        />
      )}

      {pageRows.length > 0 && total > 0 && (
        <div className="flex flex-col gap-3">
          <div className="hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                Giocate archiviate, ordinate per{' '}
                {sort === 'evento'
                  ? 'data dell’evento, dalla più recente'
                  : sort === 'archiviazione'
                    ? 'data di archiviazione, dalla più recente'
                    : 'profitto, dal più alto'}
              </caption>
              <thead>
                <tr className="ds-label bg-ds-surface-sunken text-left uppercase text-ds-ink-muted">
                  <th scope="col" className="w-[118px] whitespace-nowrap py-3 pl-4 pr-2.5">
                    Data evento
                  </th>
                  <th scope="col" className="min-w-[220px] px-2.5 py-3">
                    Evento
                  </th>
                  <th scope="col" className="w-[124px] px-2.5 py-3">
                    Conto
                  </th>
                  <th scope="col" className="w-[96px] px-2.5 py-3 text-right">
                    Profitto
                  </th>
                  <th scope="col" className="w-[128px] px-2.5 py-3">
                    Tag
                  </th>
                  <th scope="col" className="w-[160px] px-2.5 py-3">
                    Nota
                  </th>
                  <th scope="col" className="w-[150px] py-3 pl-2 pr-4">
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
                    <td className="px-2.5 py-3">{eventCell(bet)}</td>
                    <td className="px-2.5 py-3">{accountCell(bet)}</td>
                    <td className="px-2.5 py-3 text-right">{profitCell(bet, 'sm')}</td>
                    <td className="max-w-[128px] px-2.5 py-3">{muted(bet.tag)}</td>
                    <td className="max-w-[160px] px-2.5 py-3">{muted(bet.nota)}</td>
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
                  <div className="min-w-0">{eventCell(bet)}</div>
                  <div className="flex-none text-right">{profitCell(bet, 'md')}</div>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>{whenCell(bet)}</div>
                  <div className="text-right">{accountCell(bet)}</div>
                </div>
                {(bet.tag || bet.nota) && (
                  <div className="flex flex-col gap-1">
                    {bet.tag && muted(bet.tag)}
                    {bet.nota && muted(bet.nota)}
                  </div>
                )}
                <div className="flex justify-end border-t border-ds-line pt-3">{actions(bet)}</div>
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
              <label htmlFor="archiviate-righe" className="whitespace-nowrap">
                Righe per pagina
              </label>
              <GSelect
                id="archiviate-righe"
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

      <DsModal
        open={toDelete != null}
        onOpenChange={(next) => !next && !deleting && setToDelete(null)}
        title="Eliminare la giocata archiviata?"
        description={
          toDelete
            ? `${displayName(toDelete)} · ${accountInfo(toDelete.accountId).label} · ${money(toDelete.profitto)}`
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
          L&apos;eliminazione è definitiva: la giocata e le sue gambe spariscono dallo storico.
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
