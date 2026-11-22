'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import {
  DsModal,
  GIconButton,
  GiocateDsShell,
  dsDangerButtonClass,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  DS_CARD,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAlert,
  DsEmptyState,
  DsPageHeader,
  DsSegmented,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { ReminderModal } from '@/components/profit-tracker/reminder-modal'
import { eventDateLabel } from '@/lib/profit-tracker/archived-bets'
import {
  REMINDER_FILTERS,
  REMINDER_PERIOD_LABEL,
  REMINDER_STATUS,
  emptyRemindersTitle,
  reminderAccountLabel,
  type ReminderFilter,
} from '@/lib/profit-tracker/reminders'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Reminder } from '@/types/profit-tracker'

const inlineLink = cn(
  'rounded-sm font-semibold underline underline-offset-2 transition-colors hover:text-ds-ink',
  dsFocusRing,
)

/**
 * La voce «Promemoria» del Tracker sul design OddWise (§14.361): filtro per stato, tabella (schede
 * sul telefono) con scadenza, conto, descrizione, stato e notifica, e le azioni Completa, Clona,
 * Modifica ed Elimina. Elimina ora chiede conferma; il conto si legge per nome, non per id.
 */
export default function PromemoriaPage() {
  const reminders = useProfitTrackerStore((s) => s.reminders)
  const isLoading = useProfitTrackerStore((s) => s.isLoadingReminders)
  const remindersError = useProfitTrackerStore((s) => s.remindersError)
  const fetchReminders = useProfitTrackerStore((s) => s.fetchReminders)
  const completeReminder = useProfitTrackerStore((s) => s.completeReminder)
  const deleteReminder = useProfitTrackerStore((s) => s.deleteReminder)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)

  const [filterStatus, setFilterStatus] = useState<ReminderFilter>('attivo')
  const [modal, setModal] = useState<{ mode: 'new' | 'edit' | 'clone'; id?: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)

  useEffect(() => {
    void fetchReminders({ stato: filterStatus === 'tutti' ? undefined : filterStatus })
  }, [fetchReminders, filterStatus])

  // I nomi dei conti della colonna Conto (la modale usa lo stesso elenco).
  useEffect(() => {
    void fetchAllAccounts().finally(() => setAccountsLoaded(true))
  }, [fetchAllAccounts])

  const byId = useMemo(() => new Map(reminders.map((r) => [r.id, r])), [reminders])
  const modalReminder = modal?.id ? (byId.get(modal.id) ?? null) : null
  const toDelete = deleteId ? (byId.get(deleteId) ?? null) : null
  const accounts = accountsLoaded ? allAccounts : null

  const isEmpty = !isLoading && !remindersError && reminders.length === 0

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await deleteReminder(deleteId)
    setDeleting(false)
    setDeleteId(null)
  }

  const newButton = (
    <button
      type="button"
      onClick={() => setModal({ mode: 'new' })}
      className={dsButtonClass('primary', 'md')}
    >
      <Plus className="h-5 w-5" aria-hidden />
      Nuovo promemoria
    </button>
  )

  /* ---------- Pezzi delle righe ---------- */

  const statusBadge = (r: Reminder) => (
    <DsBadge tone={REMINDER_STATUS[r.stato].tone}>{REMINDER_STATUS[r.stato].label}</DsBadge>
  )

  const accountCell = (r: Reminder) => {
    const label = reminderAccountLabel(r, accounts)
    return label ? (
      <span className="text-ds-ink">{label}</span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )
  }

  const notifyCell = (r: Reminder) => (
    <span className="flex flex-col">
      <span className="text-ds-ink">{REMINDER_PERIOD_LABEL[r.periodoNotifica]}</span>
      {r.notificaInviata && <span className="ds-caption text-ds-ink-muted">Notifica inviata</span>}
    </span>
  )

  const actions = (r: Reminder) => (
    <div className="flex flex-wrap items-center justify-end gap-0.5">
      {r.stato === 'attivo' && (
        <button
          type="button"
          onClick={() => void completeReminder(r.id)}
          className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
        >
          <Check className="h-4 w-4" aria-hidden />
          Completa
          <span className="sr-only"> il promemoria «{r.descrizione}»</span>
        </button>
      )}
      <GIconButton
        label={`Clona il promemoria «${r.descrizione}»`}
        onClick={() => setModal({ mode: 'clone', id: r.id })}
      >
        <Copy className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton
        label={`Modifica il promemoria «${r.descrizione}»`}
        onClick={() => setModal({ mode: 'edit', id: r.id })}
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton
        label={`Elimina il promemoria «${r.descrizione}»`}
        danger
        onClick={() => setDeleteId(r.id)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  return (
    <GiocateDsShell>
      <DsPageHeader
        title="Promemoria"
        description="Le scadenze da ricordare sui tuoi conti, con la notifica su Telegram."
        actions={newButton}
      />

      <DsAlert tone="info">
        I promemoria arrivano su Telegram: il collegamento si gestisce dal{' '}
        <Link href="/account/profilo" className={inlineLink}>
          Profilo
        </Link>
        .
      </DsAlert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DsSegmented
          label="Stato dei promemoria"
          items={REMINDER_FILTERS}
          value={filterStatus}
          onChange={setFilterStatus}
        />
        <span className="ds-body-sm text-ds-ink-muted">
          {!isLoading || reminders.length > 0
            ? countLabel(reminders.length, 'promemoria', 'promemoria')
            : ''}
        </span>
      </div>

      {remindersError && <DsAlert>{remindersError}</DsAlert>}

      {isLoading && reminders.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei promemoria…</p>
      )}
      {isEmpty && (
        <DsEmptyState
          icon={<Bell className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title={emptyRemindersTitle(filterStatus)}
          description={
            filterStatus === 'attivo' || filterStatus === 'tutti'
              ? 'Crea un promemoria per ricordarti una scadenza: la notifica ti arriva su Telegram.'
              : 'Scegli un altro stato qui sopra per vedere gli altri promemoria.'
          }
          action={filterStatus === 'attivo' || filterStatus === 'tutti' ? newButton : undefined}
        />
      )}

      {reminders.length > 0 && (
        <div className={cn('flex flex-col gap-3', isLoading && 'opacity-60')}>
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Promemoria</caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="w-[140px] py-3 pr-2.5 pl-4">
                    Scadenza
                  </th>
                  <th scope="col" className="w-[200px] px-2.5 py-3">
                    Conto
                  </th>
                  <th scope="col" className="min-w-[220px] px-2.5 py-3">
                    Descrizione
                  </th>
                  <th scope="col" className="w-[120px] px-2.5 py-3">
                    Stato
                  </th>
                  <th scope="col" className="w-[150px] px-2.5 py-3">
                    Notifica
                  </th>
                  <th scope="col" className="w-[230px] py-3 pr-4 pl-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4 font-semibold whitespace-nowrap text-ds-ink tabular-nums">
                      {eventDateLabel(r.dataScadenza)}
                    </td>
                    <td className="px-2.5 py-3">{accountCell(r)}</td>
                    <td className="px-2.5 py-3 text-ds-ink">{r.descrizione}</td>
                    <td className="px-2.5 py-3">{statusBadge(r)}</td>
                    <td className="px-2.5 py-3">{notifyCell(r)}</td>
                    <td className="py-2 pr-4 pl-2">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {reminders.map((r) => (
              <li key={r.id} className={DS_CARD}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-ds-ink tabular-nums">
                    {eventDateLabel(r.dataScadenza)}
                  </span>
                  {statusBadge(r)}
                </div>
                <p className="m-0 text-ds-ink">{r.descrizione}</p>
                <dl className="ds-body-sm m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <dt className="text-ds-ink-muted">Conto</dt>
                  <dd className="m-0 text-right">{accountCell(r)}</dd>
                  <dt className="text-ds-ink-muted">Notifica</dt>
                  <dd className="m-0 text-right text-ds-ink">
                    {REMINDER_PERIOD_LABEL[r.periodoNotifica]}
                    {r.notificaInviata && <span className="text-ds-ink-muted"> · inviata</span>}
                  </dd>
                </dl>
                <div className="flex justify-end border-t border-ds-line pt-3">{actions(r)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReminderModal
        key={modal ? `${modal.mode}-${modal.id ?? 'nuovo'}` : 'chiusa'}
        open={modal != null}
        onOpenChange={(open) => {
          if (!open) setModal(null)
        }}
        editingReminder={modal?.mode === 'edit' ? modalReminder : null}
        cloneFrom={modal?.mode === 'clone' ? modalReminder : null}
      />

      <DsModal
        open={toDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null)
        }}
        title="Eliminare il promemoria?"
        description={
          toDelete ? (
            <>
              <b className="font-semibold text-ds-ink">«{toDelete.descrizione}»</b> non ti verrà più
              ricordato.
            </>
          ) : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
              className={dsButtonClass('ghost', 'md')}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
            >
              {deleting ? 'Eliminazione…' : 'Elimina il promemoria'}
            </button>
          </>
        }
      />
    </GiocateDsShell>
  )
}
