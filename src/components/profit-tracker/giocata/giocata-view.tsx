'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, ChevronLeft, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge, DsMoney } from '@/components/landing/ds-data'
import { OmBookLogo, OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import { holdCalcBridge } from '@/components/calculators/calculator-panel'
import { AccountMovementModal } from '@/components/profit-tracker/account-movement-modal'
import {
  DsModal,
  GIconButton,
  GNotice,
  GSelect,
  GTextField,
  dsDangerButtonClass,
  type GNoticeData,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { LegEditModal } from '@/components/profit-tracker/giocata/leg-edit-modal'
import { getErrorMessage } from '@/lib/error-utils'
import {
  FINAL_STATES,
  STATO_LABEL,
  STATO_TONE,
  TIPO_BONUS_LABEL,
  betSummary,
  isMultiplaLegs,
  legRisk,
  modalitaSaldoFor,
  multiplaRecalcPatches,
  sortLegs,
  type LegPatch,
} from '@/lib/profit-tracker/bet-detail'
import {
  SPORT_LABEL,
  bookLogoSlug,
  createdLabel,
  displayName,
  eventWhen,
} from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { BetLeg, BetStatus } from '@/types/profit-tracker'

/**
 * Dettaglio della giocata dal design «OddWise Giocata» di Claude Design (§14.283): briciola,
 * titolo con sport, competizione e data, Nuovo deposito / Archivia / Elimina, tabella delle
 * gambe (schede sul telefono) con lo stato modificabile e Modifica / Clona / Elimina,
 * riepilogo a destra con rischio, guadagno, tag e nota. Stessi salvataggi della pagina di
 * prima; il ricalcolo delle coperture della multipla sta in lib/profit-tracker/bet-detail.
 */

const NOTICE_MS = 7000
const FLASH_MS = 1500
const BACK_HREF = '/profit-tracker/giocate'

const STATO_OPTIONS = (Object.keys(STATO_LABEL) as BetStatus[]).map((v) => ({
  value: v,
  label: STATO_LABEL[v],
}))

const odds = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
const eur = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })
const p2 = (n: number) => String(n).padStart(2, '0')
const shortDate = (iso: string) => {
  const d = new Date(iso)
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function GiocataView({ betId }: { betId: string }) {
  const router = useRouter()
  const now = useNow(60_000)

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allLegs = useProfitTrackerStore((s) => s.betLegs)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const tags = useProfitTrackerStore((s) => s.tags)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)
  const updateBetLeg = useProfitTrackerStore((s) => s.updateBetLeg)
  const removeBetLeg = useProfitTrackerStore((s) => s.removeBetLeg)
  const addBetLegs = useProfitTrackerStore((s) => s.addBetLegs)
  const removeOngoingBet = useProfitTrackerStore((s) => s.removeOngoingBet)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [notaDraft, setNotaDraft] = useState<string | null>(null)
  const [editing, setEditing] = useState<BetLeg | null>(null)
  const [toDeleteLeg, setToDeleteLeg] = useState<BetLeg | null>(null)
  const [deleteBetOpen, setDeleteBetOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<GNoticeData | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const navigatingAway = useRef(false)

  useEffect(() => {
    let cancelled = false
    void fetchAllAccounts()
    void fetchAllBooks()
    void fetchAllHolders()
    void fetchTags()
    fetchBetWithLegs(betId)
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [betId, fetchBetWithLegs, fetchAllAccounts, fetchAllBooks, fetchAllHolders, fetchTags])

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
  // La modale del deposito è quella di prima (shadcn): chiara col ponte finché è aperta.
  useEffect(() => (depositOpen ? holdCalcBridge() : undefined), [depositOpen])

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])
  const legs = useMemo(() => sortLegs(allLegs.filter((l) => l.betId === betId)), [allLegs, betId])
  const multipla = isMultiplaLegs(legs)
  const summary = betSummary(legs)
  const mainPunta = legs.find((l) => l.metodo === 'punta')

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
  const accountOptions = useCallback(
    (metodo: BetLeg['metodo']) =>
      allAccounts
        .filter((a) => {
          const book = books.find((b) => b.id === a.bookId)
          return book != null && (metodo !== 'banca' || book.isExchange)
        })
        .map((a) => ({ value: a.id, label: accountInfo(a.id).label }))
        .sort((x, y) => x.label.localeCompare(y.label, 'it')),
    [allAccounts, books, accountInfo],
  )

  if (!navigatingAway.current && (loadError || (!loading && !bet))) notFound()
  if (loading || !bet) {
    return <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento della giocata…</p>
  }

  const fail = (err: unknown, fallback: string) => toast.error(getErrorMessage(err) ?? fallback)
  const name = displayName(bet)
  const competition = legs.find(
    (l) => l.competizione && !['n/d', 'multipla'].includes(l.competizione.trim().toLowerCase()),
  )?.competizione
  const when = eventWhen(bet.eventoData, now)
  const archived = Boolean(bet.archiviata)
  const lockedByOpenLegs = summary.hasLegsInCorso

  /* ---------- Giocata ---------- */

  const setArchived = async (value: boolean) => {
    setBusy(true)
    try {
      await updateBet(bet.id, { archiviata: value })
      setNotice(
        value
          ? {
              title: 'Giocata archiviata',
              text: 'La trovi in Giocate archiviate.',
              actions: [
                {
                  label: 'Annulla',
                  onClick: () => {
                    setNotice(null)
                    void updateBet(bet.id, { archiviata: false }).catch((err) =>
                      fail(err, 'Impossibile riportare la giocata in corso.'),
                    )
                  },
                },
              ],
            }
          : { title: 'Giocata ripristinata', text: 'È di nuovo tra le giocate in corso.' },
      )
    } catch (err) {
      fail(
        err,
        value ? 'Impossibile archiviare la giocata.' : 'Impossibile ripristinare la giocata.',
      )
    } finally {
      setBusy(false)
    }
  }

  const deleteBet = async () => {
    setBusy(true)
    try {
      navigatingAway.current = true
      await removeOngoingBet(bet.id)
      router.push(BACK_HREF)
    } catch (err) {
      navigatingAway.current = false
      setBusy(false)
      fail(err, 'Impossibile eliminare la giocata.')
    }
  }

  const changeTag = async (tag: string) => {
    try {
      await updateBet(bet.id, { tag: tag || undefined })
      setNotice({ title: 'Tag aggiornato', text: `${tag || 'Nessun tag'}.` })
    } catch (err) {
      fail(err, 'Impossibile aggiornare il tag.')
    }
  }

  const saveNota = () => {
    if (notaDraft == null) return
    const nota = notaDraft.trim()
    setNotaDraft(null)
    if (nota === (bet.nota ?? '')) return
    updateBet(bet.id, { nota: nota || null }).then(
      () =>
        setNotice({
          title: 'Nota salvata',
          text: nota ? 'La vedi anche nella lista delle giocate.' : 'La nota è stata tolta.',
        }),
      (err) => fail(err, 'Impossibile salvare la nota.'),
    )
  }

  /* ---------- Gambe ---------- */

  const legName = (l: BetLeg) => l.selezione || l.mercato

  const saveLeg = async (leg: BetLeg, patch: LegPatch) => {
    try {
      await updateBetLeg(betId, leg.id, patch)
      const recalc = multiplaRecalcPatches(legs, leg.id, patch)
      for (const r of recalc) {
        await updateBetLeg(betId, r.legId, r.patch)
      }
      // La punta porta conto e modalità saldo della giocata.
      if (mainPunta && leg.id === mainPunta.id) {
        if (patch.tipoBonus)
          await updateBet(betId, { modalitaSaldo: modalitaSaldoFor(patch.tipoBonus) })
        if (patch.accountId) await updateBet(betId, { accountId: patch.accountId })
      }
      await fetchBetWithLegs(betId)
      if (patch.accountId) void fetchAllAccounts()
      setEditing(null)
      setFlashId(leg.id)
      const book = accountInfo(patch.accountId ?? leg.accountId).book?.nome
      setNotice({
        title: 'Gamba aggiornata',
        text:
          `${patch.selezione || patch.mercato || legName(leg)}${book ? ` su ${book}` : ''}` +
          (recalc.length > 0 ? ', coperture ricalcolate.' : '.'),
      })
    } catch (err) {
      fail(err, 'Errore nel salvataggio della gamba.')
    }
  }

  const changeStato = async (leg: BetLeg, stato: BetStatus) => {
    try {
      await updateBetLeg(betId, leg.id, { statoEvento: stato })
      await fetchBetWithLegs(betId)
      void fetchAllAccounts()
      setNotice({ title: 'Stato aggiornato', text: `${legName(leg)}: ${STATO_LABEL[stato]}.` })
    } catch (err) {
      fail(err, "Errore nell'aggiornamento dello stato.")
    }
  }

  const cloneLeg = async (leg: BetLeg) => {
    try {
      const created = await addBetLegs(betId, [
        {
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
          commissionePercentuale: leg.commissionePercentuale ?? 0,
          movimento: leg.movimento,
          statoEvento: 'bozza',
          tag: null,
          // Stessa posizione dell'originale: il clone resta accanto alla gamba clonata.
          posizione: leg.posizione,
        },
      ])
      const copy = created[0]
      if (copy) setFlashId(copy.id)
      setNotice({
        title: 'Gamba clonata',
        text: `Copia di ${legName(leg)} su ${accountInfo(leg.accountId).book?.nome ?? 'stesso conto'}, in bozza.`,
        actions: copy
          ? [
              {
                label: 'Annulla',
                onClick: () => {
                  setNotice(null)
                  void removeBetLeg(betId, copy.id).catch((err) =>
                    fail(err, 'Impossibile togliere la copia.'),
                  )
                },
              },
            ]
          : undefined,
      })
    } catch (err) {
      fail(err, 'Impossibile clonare la gamba.')
    }
  }

  const deleteLeg = async () => {
    const leg = toDeleteLeg
    if (!leg) return
    setBusy(true)
    try {
      await removeBetLeg(betId, leg.id)
      setToDeleteLeg(null)
      setNotice({ title: 'Gamba eliminata', text: `${legName(leg)} non è più nella giocata.` })
    } catch (err) {
      fail(err, 'Impossibile eliminare la gamba.')
    } finally {
      setBusy(false)
    }
  }

  /* ---------- Celle ---------- */

  const highlighted = (l: BetLeg) =>
    Boolean(bet.eventoNotificato && bet.hasOpenLegs) ||
    (Boolean(l.eventoNotificato) && (l.statoEvento === 'bozza' || l.statoEvento === 'in_corso'))
  const rowTone = (l: BetLeg) =>
    flashId === l.id ? 'bg-ds-brand-soft' : highlighted(l) ? 'bg-ds-warning-soft' : ''

  const selCell = (l: BetLeg) => (
    <>
      <span className="block font-semibold text-ds-ink">{legName(l)}</span>
      <span className="ds-caption mt-0.5 block text-ds-ink-muted">
        {[l.selezione ? l.mercato : null, l.metodo === 'punta' ? 'Punta' : 'Banca']
          .filter(Boolean)
          .join(' · ')}
      </span>
      {(multipla || l.eventoNome !== bet.eventoNome) && (
        <span className="ds-caption mt-0.5 block text-ds-ink-muted">
          {l.eventoNome} · <span className="tabular-nums">{shortDate(l.eventoData)}</span>
        </span>
      )}
    </>
  )

  const accountCell = (l: BetLeg) => {
    const info = accountInfo(l.accountId)
    return (
      <>
        {info.book ? (
          <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />
        ) : (
          <span className="text-ds-ink-faint">—</span>
        )}
        <span className="ds-caption mt-1 block text-ds-ink-muted">
          {info.holderName}
          {l.tipoBonus !== 'none' ? ` · ${TIPO_BONUS_LABEL[l.tipoBonus].toLowerCase()}` : ''}
        </span>
      </>
    )
  }

  const quotaCell = (l: BetLeg) => (
    <>
      <span className="ds-num-sm block">{odds.format(l.quota)}</span>
      {l.metodo === 'banca' && (
        <span className="ds-caption block whitespace-nowrap text-ds-ink-muted">
          comm. {pct.format(l.commissionePercentuale ?? 0)} %
        </span>
      )}
      {multipla && l.metodo !== 'punta' && l.quotaRiferimento != null && (
        <span className="ds-caption block whitespace-nowrap text-ds-ink-muted">
          punta {odds.format(l.quotaRiferimento)}
        </span>
      )}
    </>
  )

  const importoCell = (l: BetLeg) => (
    <>
      <span className="ds-num-sm block whitespace-nowrap">{eur.format(l.stake)} €</span>
      <span className="ds-caption block whitespace-nowrap text-ds-ink-muted">
        {l.metodo === 'banca'
          ? `resp. ${eur.format(l.rischio ?? 0)} €`
          : (l.bonusValore ?? 0) > 0
            ? `bonus ${eur.format(l.bonusValore ?? 0)} €`
            : (l.rimborsoValore ?? 0) > 0
              ? `rimb. ${eur.format(l.rimborsoValore ?? 0)} €`
              : `rischio ${eur.format(legRisk(l))} €`}
      </span>
    </>
  )

  const statoCell = (l: BetLeg, where: 'riga' | 'scheda') => (
    <div className="flex flex-col gap-1">
      <GSelect
        id={`stato-${where}-${l.id}`}
        ariaLabel={`Stato evento di ${legName(l)}`}
        size="sm"
        options={STATO_OPTIONS}
        value={l.statoEvento}
        tone={STATO_TONE[l.statoEvento]}
        onChange={(v) => void changeStato(l, v as BetStatus)}
        className="w-[124px]"
      />
      {FINAL_STATES.has(l.statoEvento) && <DsMoney value={l.movimento} size="sm" />}
    </div>
  )

  const legActions = (l: BetLeg) => (
    <div className="flex items-center justify-end gap-0.5">
      <GIconButton
        label={l.statoEvento === 'bozza' ? 'Modifica' : 'Si modifica solo in bozza'}
        onClick={() => setEditing(l)}
        disabled={l.statoEvento !== 'bozza'}
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label="Clona" onClick={() => void cloneLeg(l)}>
        <Copy className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label="Elimina" danger onClick={() => setToDeleteLeg(l)}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  const statusBadge = archived ? (
    <DsBadge tone="neutral">Archiviata</DsBadge>
  ) : summary.allClosed ? (
    <DsBadge tone={summary.totalMovimento >= 0 ? 'profit' : 'loss'}>Chiusa</DsBadge>
  ) : (
    <DsBadge tone="info">In corso</DsBadge>
  )

  const lockTitle = lockedByOpenLegs ? 'Non si può con gambe ancora in corso' : undefined

  return (
    <>
      <div className="ds-body-sm flex flex-wrap items-center gap-3 text-ds-ink-muted">
        <Link href={BACK_HREF} className={cn(dsButtonClass('ghost', 'sm'), 'pl-1.5')}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Giocate in corso
        </Link>
        <span className="h-4 w-px bg-ds-line" aria-hidden />
        <span className="ds-label uppercase">Giocata</span>
        <span className="font-mono text-[13px] font-medium leading-4 text-ds-ink">{bet.id}</span>
        <DsBadge tone={multipla ? 'brand' : 'neutral'}>{multipla ? 'Multipla' : 'Singola'}</DsBadge>
        {archived && <DsBadge tone="neutral">Archiviata</DsBadge>}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="ds-title m-0 [text-wrap:balance]">{name}</h1>
          <div className="ds-body-sm flex flex-wrap items-center gap-2 text-ds-ink-muted">
            <span className="inline-flex">
              <OmSportIcon sport={bet.sport} size={18} />
            </span>
            <span>
              {[SPORT_LABEL[bet.sport] ?? bet.sport, competition].filter(Boolean).join(' · ')}
            </span>
            <span className="text-ds-line-strong">·</span>
            <span className={cn('tabular-nums', when.started ? 'text-ds-warning' : 'text-ds-ink')}>
              {when.text}
            </span>
            <span className="text-ds-line-strong">·</span>
            <span className="tabular-nums">{createdLabel(bet.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className={dsButtonClass('secondary', 'md')}
          >
            <Plus className="h-5 w-5" aria-hidden />
            Nuovo deposito
          </button>
          <button
            type="button"
            onClick={() => void setArchived(!archived)}
            disabled={busy || (!archived && lockedByOpenLegs)}
            title={!archived ? lockTitle : undefined}
            className={cn(
              dsButtonClass('secondary', 'md'),
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {archived ? (
              <ArchiveRestore className="h-5 w-5" aria-hidden />
            ) : (
              <Archive className="h-5 w-5" aria-hidden />
            )}
            {archived ? 'Ripristina' : 'Archivia'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteBetOpen(true)}
            disabled={busy || lockedByOpenLegs}
            title={lockTitle}
            className={cn(
              dsDangerButtonClass('md'),
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <Trash2 className="h-5 w-5" aria-hidden />
            Elimina
          </button>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {legs.length === 0 ? (
            <div className="ds-body rounded-ds-md border border-ds-line bg-ds-surface-raised px-6 py-10 text-center text-ds-ink-muted">
              Nessuna gamba registrata per questa giocata.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised md:block">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Gambe della giocata</caption>
                  <thead>
                    <tr className="ds-label bg-ds-surface-sunken text-left uppercase text-ds-ink-muted">
                      <th scope="col" className="min-w-[160px] py-3 pl-4 pr-2.5">
                        Selezione
                      </th>
                      <th scope="col" className="w-32 px-2.5 py-3">
                        Conto
                      </th>
                      <th scope="col" className="w-20 px-2.5 py-3 text-right">
                        Quota
                      </th>
                      <th scope="col" className="w-28 px-2.5 py-3 text-right">
                        Importo
                      </th>
                      <th scope="col" className="w-36 px-2.5 py-3">
                        Stato evento
                      </th>
                      <th scope="col" className="w-28 py-3 pl-2 pr-3">
                        <span className="sr-only">Azioni</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l) => (
                      <tr
                        key={l.id}
                        className={cn(
                          'border-t border-ds-line align-top transition-colors',
                          rowTone(l),
                        )}
                      >
                        <td className="py-3 pl-4 pr-2.5">{selCell(l)}</td>
                        <td className="px-2.5 py-3">{accountCell(l)}</td>
                        <td className="px-2.5 py-3 text-right">{quotaCell(l)}</td>
                        <td className="px-2.5 py-3 text-right">{importoCell(l)}</td>
                        <td className="px-2.5 py-3">{statoCell(l, 'riga')}</td>
                        <td className="py-3 pl-2 pr-3">{legActions(l)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
                {legs.map((l) => (
                  <li
                    key={l.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm transition-colors',
                      rowTone(l),
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">{selCell(l)}</div>
                      <div className="text-right">{accountCell(l)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="ds-caption block text-ds-ink-muted">Quota</span>
                        {quotaCell(l)}
                      </div>
                      <div>
                        <span className="ds-caption block text-ds-ink-muted">Importo</span>
                        {importoCell(l)}
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-ds-line pt-2">
                      {statoCell(l, 'scheda')}
                      {legActions(l)}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised p-5 shadow-ds-sm lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3">
            <span className="ds-label uppercase text-ds-ink-muted">Riepilogo</span>
            {statusBadge}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="ds-caption text-ds-ink-muted">Totale rischio</div>
              <div className="ds-num-xl whitespace-nowrap text-[26px] leading-8">
                {eur.format(summary.totalRischio)} €
              </div>
            </div>
            <div>
              <div className="ds-caption text-ds-ink-muted">Guadagno totale</div>
              <div aria-live="polite" className="mt-0.5">
                {summary.anyClosed ? (
                  <DsMoney
                    value={summary.totalMovimento}
                    size="xl"
                    className="text-[26px] leading-8"
                  />
                ) : (
                  <span className="ds-num-xl text-ds-ink-faint">—</span>
                )}
              </div>
            </div>
          </div>
          <div className="h-px bg-ds-line" />
          <GSelect
            id="giocata-tag"
            label="Tag"
            options={[
              { value: '', label: 'Nessun tag' },
              ...tags.map((t) => ({ value: t.nome, label: t.nome })),
              ...(bet.tag && !tags.some((t) => t.nome === bet.tag)
                ? [{ value: bet.tag, label: bet.tag }]
                : []),
            ]}
            value={bet.tag ?? ''}
            onChange={(v) => void changeTag(v)}
          />
          <GTextField
            id="giocata-nota"
            label="Nota"
            optional
            placeholder="Aggiungi una nota"
            value={notaDraft ?? bet.nota ?? ''}
            onChange={setNotaDraft}
            onBlur={saveNota}
            onEnter={saveNota}
          />
        </aside>
      </div>

      {editing && (
        <LegEditModal
          key={editing.id}
          leg={editing}
          multipla={multipla}
          accountOptions={accountOptions(editing.metodo)}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveLeg(editing, patch)}
        />
      )}

      <DsModal
        open={toDeleteLeg != null}
        onOpenChange={(next) => !next && !busy && setToDeleteLeg(null)}
        title="Eliminare la gamba?"
        description={
          toDeleteLeg
            ? `${legName(toDeleteLeg)} · ${accountInfo(toDeleteLeg.accountId).label}`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setToDeleteLeg(null)}
              disabled={busy}
              className={dsButtonClass('ghost', 'md')}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void deleteLeg()}
              disabled={busy}
              className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
            >
              Elimina la gamba
            </button>
          </>
        }
      >
        <p className="ds-body m-0 text-ds-ink [text-wrap:pretty]">
          La gamba sparisce dalla giocata e il riepilogo si ricalcola. L&apos;operazione è
          definitiva.
        </p>
      </DsModal>

      <DsModal
        open={deleteBetOpen}
        onOpenChange={(next) => !next && !busy && setDeleteBetOpen(false)}
        title="Eliminare la giocata?"
        description={`${name} · ${bet.id}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteBetOpen(false)}
              disabled={busy}
              className={dsButtonClass('ghost', 'md')}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void deleteBet()}
              disabled={busy}
              className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
            >
              Elimina la giocata
            </button>
          </>
        }
      >
        <p className="ds-body m-0 text-ds-ink [text-wrap:pretty]">
          L&apos;eliminazione è definitiva e cancella anche le gambe. Se vuoi solo toglierla dalla
          lista, usa Archivia.
        </p>
      </DsModal>

      <AccountMovementModal
        open={depositOpen}
        onOpenChange={setDepositOpen}
        defaultAccountId={bet.accountId}
      />

      {notice && <GNotice notice={notice} onDismiss={() => setNotice(null)} />}
    </>
  )
}
