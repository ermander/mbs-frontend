'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { ReminderModal } from '@/components/profit-tracker/reminder-modal'
import { TelegramLinkWidget } from '@/components/profit-tracker/telegram-link-widget'
import type { ReminderStatus } from '@/types/profit-tracker'

const BOT_USERNAME = 'MBS_Matchet_Betting_Sistem_bot' // opzionale: imposta qui lo username del bot es. 'MBSProfitTrackerBot'

export default function PromemoriaPage() {
  const reminders = useProfitTrackerStore((s) => s.reminders)
  const isLoadingReminders = useProfitTrackerStore((s) => s.isLoadingReminders)
  const remindersError = useProfitTrackerStore((s) => s.remindersError)
  const fetchReminders = useProfitTrackerStore((s) => s.fetchReminders)
  const completeReminder = useProfitTrackerStore((s) => s.completeReminder)
  const deleteReminder = useProfitTrackerStore((s) => s.deleteReminder)

  const [filterStatus, setFilterStatus] = useState<ReminderStatus | 'tutti'>('attivo')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)

  useEffect(() => {
    void fetchReminders({
      stato: filterStatus === 'tutti' ? undefined : filterStatus,
    })
  }, [fetchReminders, filterStatus])

  const editingReminder = useMemo(
    () => reminders.find((r) => r.id === editingReminderId),
    [reminders, editingReminderId],
  )

  const handleNew = () => {
    setEditingReminderId(null)
    setModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingReminderId(id)
    setModalOpen(true)
  }

  const handleClone = (id: string) => {
    const original = reminders.find((r) => r.id === id)
    if (!original) return
    setEditingReminderId(null)
    setModalOpen(true)
  }

  const filteredReminders = reminders

  const renderStatusBadge = (stato: ReminderStatus) => {
    if (stato === 'attivo') {
      return <Badge className="bg-emerald-600 text-xs text-emerald-50">Attivo</Badge>
    }
    if (stato === 'completato') {
      return (
        <Badge variant="outline" className="border-emerald-500 text-xs text-emerald-700">
          Completato
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-destructive text-xs text-destructive">
        Scaduto
      </Badge>
    )
  }

  return (
    <ProfitTrackerPageShell
      sectionTitle="Promemoria"
      sectionDescription="Gestisci i promemoria collegati ai conti e alle notifiche Telegram."
      actions={
        <Button size="sm" type="button" onClick={handleNew}>
          Nuovo promemoria
        </Button>
      }
    >
      <TelegramLinkWidget botUsername={BOT_USERNAME} />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Stato:</span>
        <Button
          type="button"
          variant={filterStatus === 'attivo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('attivo')}
        >
          Attivi
        </Button>
        <Button
          type="button"
          variant={filterStatus === 'completato' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('completato')}
        >
          Completati
        </Button>
        <Button
          type="button"
          variant={filterStatus === 'scaduto' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('scaduto')}
        >
          Scaduti
        </Button>
        <Button
          type="button"
          variant={filterStatus === 'tutti' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('tutti')}
        >
          Tutti
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Scadenza</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-left">Notifica</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingReminders && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Caricamento promemoria in corso...
                </td>
              </tr>
            )}
            {!isLoadingReminders && filteredReminders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nessun promemoria {filterStatus !== 'tutti' ? `con stato ${filterStatus}` : ''}.
                </td>
              </tr>
            )}
            {!isLoadingReminders &&
              filteredReminders.map((rem) => {
                const data = new Date(rem.dataScadenza)
                const dataLabel = data.toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
                let notificaLabel = 'Alla scadenza'
                if (rem.periodoNotifica === '24h') notificaLabel = '24h prima'
                if (rem.periodoNotifica === '12h') notificaLabel = '12h prima'

                return (
                  <tr key={rem.id} className="border-t border-border/80">
                    <td className="px-3 py-2 align-top text-xs">{dataLabel}</td>
                    <td className="px-3 py-2 align-top text-xs">
                      {rem.accountId ? (
                        rem.accountId
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">{rem.descrizione}</td>
                    <td className="px-3 py-2 align-top text-xs">{renderStatusBadge(rem.stato)}</td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {notificaLabel}
                      {rem.notificaInviata && <span className="ml-1 text-[10px]">· Inviata</span>}
                    </td>
                    <td className="px-3 py-2 text-right align-top text-xs">
                      <div className="inline-flex gap-1">
                        {rem.stato === 'attivo' && (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => void completeReminder(rem.id)}
                          >
                            Completa
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => handleClone(rem.id)}
                        >
                          Clona
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => handleEdit(rem.id)}
                        >
                          Modifica
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={() => void deleteReminder(rem.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {remindersError && <p className="text-xs text-destructive">{remindersError}</p>}

      <ReminderModal
        key={modalOpen ? (editingReminder?.id ?? 'new') : 'closed'}
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingReminder={editingReminder ?? undefined}
      />
    </ProfitTrackerPageShell>
  )
}
