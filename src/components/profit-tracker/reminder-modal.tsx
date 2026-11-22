'use client'

import { useEffect, useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  FieldError,
  GSelect,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  REMINDER_PERIOD_OPTIONS,
  reminderInputValue,
  toDateTimeLocal,
} from '@/lib/profit-tracker/reminders'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Reminder, ReminderPeriod } from '@/types/profit-tracker'

interface ReminderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Il promemoria da modificare. */
  editingReminder?: Reminder | null
  /** «Clona»: un promemoria nuovo che parte dai campi di questo. */
  cloneFrom?: Reminder | null
}

/**
 * Nuovo, Modifica e Clona promemoria sul design OddWise (§14.361), su DsModal. Stessi campi e
 * salvataggi di prima, con tre correzioni: la data si legge e si scrive in ora locale (prima ogni
 * modifica la spostava indietro di un'ora), «Nessun conto specifico» si può scegliere davvero
 * (prima tornava al primo conto) e «Clona» riparte dai campi del promemoria (prima apriva un
 * promemoria vuoto). Se il backend rifiuta l'errore resta nella modale, che non si chiude.
 */
export function ReminderModal({
  open,
  onOpenChange,
  editingReminder,
  cloneFrom,
}: ReminderModalProps) {
  const title = editingReminder
    ? 'Modifica promemoria'
    : cloneFrom
      ? 'Clona promemoria'
      : 'Nuovo promemoria'
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title={title}>
      {open && (
        <ReminderForm
          editing={editingReminder ?? null}
          source={editingReminder ?? cloneFrom ?? null}
          onClose={() => onOpenChange(false)}
        />
      )}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono dal promemoria scelto (o vuoti) a ogni apertura. */
function ReminderForm({
  editing,
  source,
  onClose,
}: {
  editing: Reminder | null
  source: Reminder | null
  onClose: () => void
}) {
  const accounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const createReminder = useProfitTrackerStore((s) => s.createReminder)
  const updateReminder = useProfitTrackerStore((s) => s.updateReminder)

  const [accountId, setAccountId] = useState(source?.accountId ?? '')
  const [descrizione, setDescrizione] = useState(source?.descrizione ?? '')
  const [dataScadenza, setDataScadenza] = useState(() =>
    source ? reminderInputValue(source.dataScadenza) : toDateTimeLocal(new Date()),
  )
  const [periodoNotifica, setPeriodoNotifica] = useState<ReminderPeriod>(
    source?.periodoNotifica ?? '24h',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchAllAccounts()
  }, [fetchAllAccounts])

  const dateOk = dataScadenza !== '' && Number.isFinite(new Date(dataScadenza).getTime())
  const canSave = descrizione.trim().length > 0 && dateOk && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const payload = {
      descrizione,
      dataScadenza: new Date(dataScadenza).toISOString(),
      periodoNotifica,
    }
    // In modifica «Nessun conto specifico» toglie il conto (null); prima la scelta non si poteva fare.
    if (editing) await updateReminder(editing.id, { ...payload, accountId: accountId || null })
    else await createReminder({ ...payload, accountId: accountId || undefined })
    // Lo store non lancia: l'errore arriva in `remindersError`. Lo si porta nella modale e lo si
    // toglie dallo store, che lo mostrerebbe anche sopra l'elenco.
    const failed = useProfitTrackerStore.getState().remindersError
    setSaving(false)
    if (failed) {
      useProfitTrackerStore.setState({ remindersError: undefined })
      setError(failed)
      return
    }
    onClose()
  }

  // Il conto del promemoria resta fra le scelte anche se non è (più) nell'elenco dei conti.
  const accountOptions = [
    { value: '', label: 'Nessun conto specifico' },
    ...accounts.map((a) => ({ value: a.id, label: a.nome })),
    ...(accountId && accounts.length > 0 && !accounts.some((a) => a.id === accountId)
      ? [{ value: accountId, label: 'Conto non trovato' }]
      : []),
  ]

  return (
    <>
      <div className="flex flex-col gap-4">
        <GSelect
          id="rem-account"
          label="Conto (facoltativo)"
          options={accountOptions}
          value={accountId}
          onChange={setAccountId}
        />
        <GTextArea
          id="rem-desc"
          label="Descrizione"
          placeholder="Es. Prelevare la vincita del bonus"
          value={descrizione}
          onChange={setDescrizione}
        />
        <GTextField
          id="rem-data"
          label="Data e ora di scadenza"
          type="datetime-local"
          value={dataScadenza}
          onChange={setDataScadenza}
        />
        <GSelect
          id="rem-periodo"
          label="Quando vuoi ricevere la notifica?"
          options={REMINDER_PERIOD_OPTIONS}
          value={periodoNotifica}
          onChange={(v) => setPeriodoNotifica(v as ReminderPeriod)}
        />
        {error && <FieldError id="rem-error">{error}</FieldError>}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className={dsButtonClass('ghost', 'md')}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
        >
          {saving ? 'Salvataggio…' : editing ? 'Salva le modifiche' : 'Salva il promemoria'}
        </button>
      </div>
    </>
  )
}
