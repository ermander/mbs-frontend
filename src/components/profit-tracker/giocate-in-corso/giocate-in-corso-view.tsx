'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Copy, Filter, ListChecks, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { OmBookLogo, OmDropdown, OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import { SingolaBetModal } from '@/components/profit-tracker/singola-bet-modal'
import {
  DsModal,
  GIconButton,
  GNotice,
  GSelect,
  GTextField,
  dsDangerButtonClass,
  type GNoticeData,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { getErrorMessage } from '@/lib/error-utils'
import {
  EMPTY_ONGOING_FILTERS,
  NO_TAG,
  SPORT_LABEL,
  betCaption,
  bookLogoSlug,
  createdLabel,
  displayName,
  eventWhen,
  filterOngoingBets,
  isMultipla,
  multiplaEvents,
  type OngoingFilters,
  type OngoingSort,
} from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { OngoingBet } from '@/types/profit-tracker'

/**
 * Giocate in corso dal design «OddWise Giocate in corso» di Claude Design (§14.281): testata con
 * il riepilogo e «Nuova giocata singola», ricerca, Filtri, Ordina per, filtri attivi, tabella
 * (schede sul telefono), avvisi con «Annulla» e conferma dell'eliminazione.
 */

const NOTICE_MS = 7000
const FLASH_MS = 1500

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

const SPORT_OPTIONS = [
  { value: '', label: 'Tutti gli sport' },
  ...(['calcio', 'tennis', 'basket', 'altro'] as const).map((v) => ({
    value: v,
    label: SPORT_LABEL[v],
  })),
]
const MODE_OPTIONS = [
  { value: '', label: 'Tutti i saldi' },
  { value: 'reale', label: 'Saldo reale' },
  { value: 'bonus', label: 'Saldo bonus' },
  { value: 'rimborso', label: 'Saldo rimborso' },
]
const TIPO_OPTIONS = [
  { value: '', label: 'Singole e multiple' },
  { value: 'singola', label: 'Singola' },
  { value: 'multipla', label: 'Multipla' },
]
const SORT_OPTIONS = [
  { value: 'evento', label: 'Data evento' },
  { value: 'creazione', label: 'Data creazione' },
]
const MODE_LABEL: Record<string, string> = { reale: 'Reale', bonus: 'Bonus', rimborso: 'Rimborso' }

const ymdToDmy = (v: string) => v.split('-').reverse().join('/')

export function GiocateInCorsoView() {
  const router = useRouter()
  const now = useNow(60_000)

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const isLoading = useProfitTrackerStore((s) => s.isLoadingOngoingBets)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchOngoingBets = useProfitTrackerStore((s) => s.fetchOngoingBets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)
  const saveBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const removeBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  const [q, setQ] = useState('')
  const [sort, setSort] = useState<OngoingSort>('evento')
  const [filters, setFilters] = useState<OngoingFilters>(EMPTY_ONGOING_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [toDelete, setToDelete] = useState<OngoingBet | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<GNoticeData | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [editingNota, setEditingNota] = useState<{ betId: string; value: string } | null>(null)

  useEffect(() => {
    void fetchOngoingBets()
    void fetchAllAccounts()
    void fetchAllBooks()
    void fetchAllHolders()
    void fetchTags()
  }, [fetchOngoingBets, fetchAllAccounts, fetchAllBooks, fetchAllHolders, fetchTags])

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

  const accountInfo = useCallback(
    (accountId: string) => {
      const account = allAccounts.find((a) => a.id === accountId)
      const book = account ? books.find((b) => b.id === account.bookId) : undefined
      const holder = account ? holders.find((h) => h.id === account.holderId) : undefined
      const label = book && holder ? `${book.nome} · ${holder.nome}` : (account?.nome ?? '—')
      return { book, holderName: holder?.nome ?? account?.nome ?? '', label }
    },
    [allAccounts, books, holders],
  )

  const open = useMemo(() => ongoingBets.filter((b) => !b.archiviata), [ongoingBets])
  const rows = useMemo(
    () => filterOngoingBets(ongoingBets, q, filters, sort, (id) => accountInfo(id).label),
    [ongoingBets, q, filters, sort, accountInfo],
  )
  const started = open.filter((b) => eventWhen(b.eventoData, now).started).length
  const summary =
    (open.length === 1 ? '1 giocata in corso' : `${open.length} giocate in corso`) +
    (started ? ` · ${started} ${started === 1 ? 'iniziata' : 'iniziate'}` : '')

  const tagOptions = [
    { value: '', label: 'Nessun tag' },
    ...tags.map((t) => ({ value: t.nome, label: t.nome })),
  ]

  const setFilter = <K extends keyof OngoingFilters>(k: K, v: OngoingFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }))
  const resetAll = () => {
    setQ('')
    setFilters(EMPTY_ONGOING_FILTERS)
  }

  const active: { key: keyof OngoingFilters; label: string; value: string }[] = []
  if (filters.sport)
    active.push({ key: 'sport', label: 'Sport', value: SPORT_LABEL[filters.sport] })
  if (filters.accountId)
    active.push({ key: 'accountId', label: 'Conto', value: accountInfo(filters.accountId).label })
  if (filters.modalitaSaldo)
    active.push({ key: 'modalitaSaldo', label: 'Saldo', value: MODE_LABEL[filters.modalitaSaldo] })
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

  const accountOptions = useMemo(
    () =>
      allAccounts
        .map((a) => {
          const info = accountInfo(a.id)
          return {
            value: a.id,
            label: info.label,
            render: (
              <span className="flex min-w-0 items-center gap-2.5">
                {info.book && (
                  <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />
                )}
                <span className="truncate">{info.holderName}</span>
              </span>
            ),
          }
        })
        .sort((x, y) => x.label.localeCompare(y.label, 'it')),
    [allAccounts, accountInfo],
  )

  /* ---------- Azioni ---------- */

  const handleArchive = async (bet: OngoingBet) => {
    try {
      await updateBet(bet.id, { archiviata: true })
      setNotice({
        title: 'Giocata archiviata',
        text: `${displayName(bet)} è in Giocate archiviate.`,
        actions: [
          {
            label: 'Annulla',
            onClick: () => {
              setNotice(null)
              void updateBet(bet.id, { archiviata: false }).catch((err) =>
                toast.error(getErrorMessage(err) ?? 'Impossibile riportare la giocata in corso.'),
              )
            },
          },
        ],
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile archiviare la giocata.')
    }
  }

  const handleClone = async (original: OngoingBet) => {
    setCloningId(original.id)
    try {
      const { legs } = await fetchBetWithLegs(original.id)
      const betPayload = {
        eventoData: original.eventoData,
        sport: original.sport,
        eventoNome: original.eventoNome,
        modalitaSaldo: original.modalitaSaldo,
        accountId: original.accountId,
        // La categoria (matched betting, surebet, valuebet) segue l'originale:
        // senza, il backend la rimetteva a matched_betting e il Report
        // rendicontava il clone nella categoria sbagliata.
        categoria: original.categoria,
        tag: null,
        nota: original.nota ?? null,
      }
      const legsPayload = legs.map((leg) => ({
        eventoData: leg.eventoData,
        sport: leg.sport,
        eventoNome: leg.eventoNome,
        competizione: leg.competizione,
        mercato: leg.mercato,
        selezione: leg.selezione,
        metodo: leg.metodo,
        tipoBonus: leg.tipoBonus,
        accountId: leg.accountId,
        stake: leg.stake,
        quota: leg.quota,
        quotaRiferimento: leg.quotaRiferimento,
        rischio: leg.rischio,
        bonusValore: leg.bonusValore,
        rimborsoValore: leg.rimborsoValore,
        commissionePercentuale: leg.commissionePercentuale,
        movimento: leg.movimento,
        statoEvento: 'bozza' as const,
        tag: leg.tag ?? null,
        posizione: leg.posizione,
      }))
      const cloned = await saveBetFromCalculator(betPayload, legsPayload)
      await updateBet(cloned.id, { statoEvento: 'bozza' })
      setFlashId(cloned.id)
      // §14.107: la conferma, con il collegamento al dettaglio della copia.
      setNotice({
        title: 'Giocata clonata',
        text: `${displayName(original)}: la copia #${cloned.id} è in bozza.`,
        actions: [
          {
            label: 'Apri',
            onClick: () => router.push(`/profit-tracker/giocate-in-corso/${cloned.id}`),
          },
          {
            label: 'Annulla',
            onClick: () => {
              setNotice(null)
              void removeBet(cloned.id).catch((err) =>
                toast.error(getErrorMessage(err) ?? 'Impossibile togliere la copia.'),
              )
            },
          },
        ],
      })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile clonare la giocata.')
    } finally {
      setCloningId(null)
    }
  }

  const confirmDelete = async () => {
    const bet = toDelete
    if (!bet) return
    setDeleting(true)
    try {
      await removeBet(bet.id)
      setToDelete(null)
      setNotice({ title: 'Giocata eliminata', text: `${displayName(bet)} non è più nel tracker.` })
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Impossibile eliminare la giocata.')
    } finally {
      setDeleting(false)
    }
  }

  const saveNota = (bet: OngoingBet) => {
    if (!editingNota || editingNota.betId !== bet.id) return
    const value = editingNota.value.trim()
    if (value !== (bet.nota ?? '')) void updateBet(bet.id, { nota: value || null })
    setEditingNota(null)
  }

  const onSaved = (bet: OngoingBet) => {
    setFlashId(bet.id)
    setNotice({ title: 'Giocata salvata', text: `${displayName(bet)} è in lista.` })
  }

  /* ---------- Pezzi delle righe ---------- */

  const whenCell = (bet: OngoingBet) => {
    const w = eventWhen(bet.eventoData, now)
    return (
      <>
        <span
          className={cn(
            'ds-num-sm block whitespace-nowrap',
            w.started ? 'text-ds-warning' : 'text-ds-ink',
          )}
        >
          {w.text}
        </span>
        <span className="ds-caption mt-0.5 block whitespace-nowrap tabular-nums text-ds-ink-muted">
          {createdLabel(bet.createdAt)}
        </span>
      </>
    )
  }

  const eventCell = (bet: OngoingBet) => {
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
          <span className="ds-caption text-ds-ink-muted">{betCaption(bet)}</span>
        </div>
      </div>
    )
  }

  const accountCell = (bet: OngoingBet) => {
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

  const tagSelect = (bet: OngoingBet, where: 'riga' | 'scheda') => (
    <GSelect
      id={`tag-${where}-${bet.id}`}
      ariaLabel={`Tag di ${displayName(bet)}`}
      size="sm"
      options={
        bet.tag && !tags.some((t) => t.nome === bet.tag)
          ? [...tagOptions, { value: bet.tag, label: bet.tag }]
          : tagOptions
      }
      value={bet.tag ?? ''}
      onChange={(v) => void updateBet(bet.id, { tag: v || undefined })}
    />
  )

  const notaCell = (bet: OngoingBet) =>
    editingNota?.betId === bet.id ? (
      <input
        type="text"
        aria-label={`Nota di ${displayName(bet)}`}
        className="ds-body-sm h-8 w-full rounded-ds-sm border border-ds-brand bg-ds-surface-raised px-2.5 text-ds-ink shadow-ds-focus outline-none"
        value={editingNota.value}
        onChange={(e) => setEditingNota((c) => (c ? { ...c, value: e.target.value } : null))}
        onBlur={() => saveNota(bet)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditingNota(null)
        }}
        autoFocus
        placeholder="Nota"
      />
    ) : (
      <button
        type="button"
        title={bet.nota ? `${bet.nota} — clic per modificare` : 'Aggiungi una nota'}
        onClick={() => setEditingNota({ betId: bet.id, value: bet.nota ?? '' })}
        className="ds-body-sm block w-full truncate rounded-ds-sm px-1.5 py-1 text-left text-ds-ink-muted hover:bg-ds-surface-sunken"
      >
        {bet.nota || <span className="text-ds-ink-faint">—</span>}
      </button>
    )

  const actions = (bet: OngoingBet) => (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={`/profit-tracker/giocate-in-corso/${bet.id}`}
        title={`Apri il dettaglio di ${displayName(bet)}`}
        className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
      >
        Dettaglio
      </Link>
      <GIconButton label="Archivia" onClick={() => void handleArchive(bet)}>
        <Archive className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton
        label={cloningId === bet.id ? 'Clonazione in corso' : 'Clona'}
        onClick={() => void handleClone(bet)}
        disabled={cloningId === bet.id}
      >
        <Copy className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label="Elimina" danger onClick={() => setToDelete(bet)}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  const rowTone = (bet: OngoingBet) =>
    flashId === bet.id
      ? 'bg-ds-brand-soft'
      : bet.eventoNotificato && bet.hasOpenLegs
        ? 'bg-ds-warning-soft'
        : ''

  const newButton = (
    <button
      type="button"
      onClick={() => setNewOpen(true)}
      className={dsButtonClass('primary', 'md')}
    >
      <Plus className="h-5 w-5" aria-hidden />
      Nuova giocata singola
    </button>
  )

  const isEmptyAll = !isLoading && open.length === 0
  const isEmptyFiltered = !isEmptyAll && open.length > 0 && rows.length === 0

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="ds-title m-0">Giocate in corso</h1>
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            {isLoading && open.length === 0 ? 'Caricamento giocate…' : summary}
          </p>
        </div>
        {newButton}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <GTextField
            id="giocate-cerca"
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
            aria-controls="giocate-filtri"
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
          <label htmlFor="giocate-ordina" className="ds-body-sm text-ds-ink-muted">
            Ordina per
          </label>
          <GSelect
            id="giocate-ordina"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => setSort(v as OngoingSort)}
            className="w-[180px]"
          />
        </div>
      </div>

      {showFilters && (
        <div
          id="giocate-filtri"
          className="grid grid-cols-1 gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-6 py-5 shadow-ds-sm sm:grid-cols-2 lg:grid-cols-4"
        >
          <GSelect
            id="filtro-sport"
            label="Sport"
            size="sm"
            options={SPORT_OPTIONS}
            value={filters.sport}
            onChange={(v) => setFilter('sport', v as OngoingFilters['sport'])}
          />
          <OmDropdown
            id="filtro-conto"
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
            id="filtro-saldo"
            label="Modalità saldo"
            size="sm"
            options={MODE_OPTIONS}
            value={filters.modalitaSaldo}
            onChange={(v) => setFilter('modalitaSaldo', v as OngoingFilters['modalitaSaldo'])}
          />
          <GSelect
            id="filtro-tag"
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
            id="filtro-tipo"
            label="Tipo giocata"
            size="sm"
            options={TIPO_OPTIONS}
            value={filters.tipo}
            onChange={(v) => setFilter('tipo', v as OngoingFilters['tipo'])}
          />
          <GTextField
            id="filtro-dal"
            label="Evento dal"
            size="sm"
            type="date"
            value={filters.dal}
            onChange={(v) => setFilter('dal', v)}
          />
          <GTextField
            id="filtro-al"
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
              onClick={() => setFilter(a.key, EMPTY_ONGOING_FILTERS[a.key])}
              className={dsButtonClass('ghost', 'sm')}
            >
              {a.label}: {a.value}
              <X className="h-4 w-4" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {isEmptyAll && (
        <EmptyCard
          icon={<ListChecks className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessuna giocata in corso"
          description="Salva la prima dall'oddsmatcher o registra una giocata singola."
          action={newButton}
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

      {rows.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                Giocate in corso, ordinate per data{' '}
                {sort === 'evento' ? "dell'evento" : 'di creazione'}
              </caption>
              <thead>
                <tr className="ds-label bg-ds-surface-sunken text-left uppercase text-ds-ink-muted">
                  <th scope="col" className="w-32 whitespace-nowrap py-3 pl-4 pr-2.5">
                    Data evento
                  </th>
                  <th scope="col" className="min-w-[220px] px-2.5 py-3">
                    Evento
                  </th>
                  <th scope="col" className="w-32 px-2.5 py-3">
                    Conto
                  </th>
                  <th scope="col" className="w-36 px-2.5 py-3">
                    Tag
                  </th>
                  <th scope="col" className="w-44 px-2.5 py-3">
                    Nota
                  </th>
                  <th scope="col" className="w-44 py-3 pl-2 pr-4">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((bet) => (
                  <tr
                    key={bet.id}
                    className={cn(
                      'border-t border-ds-line align-top transition-colors',
                      rowTone(bet),
                    )}
                  >
                    <td className="py-3 pl-4 pr-2.5">{whenCell(bet)}</td>
                    <td className="px-2.5 py-3">{eventCell(bet)}</td>
                    <td className="px-2.5 py-3">{accountCell(bet)}</td>
                    <td className="px-2.5 py-3">{tagSelect(bet, 'riga')}</td>
                    <td className="max-w-[180px] px-2.5 py-3">{notaCell(bet)}</td>
                    <td className="py-3 pl-2 pr-4">{actions(bet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {rows.map((bet) => (
              <li
                key={bet.id}
                className={cn(
                  'flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm transition-colors',
                  rowTone(bet),
                )}
              >
                {eventCell(bet)}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>{whenCell(bet)}</div>
                  <div className="text-right">{accountCell(bet)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {tagSelect(bet, 'scheda')}
                  {notaCell(bet)}
                </div>
                <div className="border-t border-ds-line pt-2">{actions(bet)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <SingolaBetModal open={newOpen} onOpenChange={setNewOpen} onSaved={onSaved} />

      <DsModal
        open={toDelete != null}
        onOpenChange={(next) => !next && !deleting && setToDelete(null)}
        title="Eliminare la giocata?"
        description={
          toDelete
            ? `${displayName(toDelete)} · ${accountInfo(toDelete.accountId).label}`
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
          L&apos;eliminazione è definitiva. Se vuoi solo toglierla da questa lista, usa Archivia: la
          ritrovi in Giocate archiviate.
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
