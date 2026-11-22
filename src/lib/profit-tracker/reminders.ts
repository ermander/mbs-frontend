import type { DsBadgeTone } from '@/components/landing/ds-data'
import type { Reminder, ReminderPeriod, ReminderStatus } from '@/types/profit-tracker'

/**
 * Promemoria del tracker sul design OddWise (§14.361): etichette di stato e notifica, filtro per
 * stato e l'ora del campo «Data e ora di scadenza», che il browser legge e scrive in ora locale.
 */

const p2 = (n: number) => String(n).padStart(2, '0')

/**
 * Il valore di un `<input type="datetime-local">` («2026-11-23T11:00») in ora locale. Prima la
 * modale tagliava la stringa ISO del backend, che è in UTC: in Italia mostrava un'ora (o due
 * d'estate) in meno, e a ogni «Salva» di una modifica la scadenza scendeva di tanto.
 */
export function toDateTimeLocal(date: Date): string {
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}T${p2(date.getHours())}:${p2(date.getMinutes())}`
}

/** La scadenza di un promemoria (ISO del backend) come valore del campo, in ora locale. */
export function reminderInputValue(iso: string): string {
  return toDateTimeLocal(new Date(iso))
}

export type ReminderFilter = ReminderStatus | 'tutti'

/** Le voci del filtro per stato, nell'ordine di prima (Attivi è quella di partenza). */
export const REMINDER_FILTERS: { value: ReminderFilter; label: string }[] = [
  { value: 'attivo', label: 'Attivi' },
  { value: 'completato', label: 'Completati' },
  { value: 'scaduto', label: 'Scaduti' },
  { value: 'tutti', label: 'Tutti' },
]

export const REMINDER_STATUS: Record<ReminderStatus, { label: string; tone: DsBadgeTone }> = {
  attivo: { label: 'Attivo', tone: 'info' },
  completato: { label: 'Completato', tone: 'profit' },
  scaduto: { label: 'Scaduto', tone: 'loss' },
}

export const REMINDER_PERIOD_LABEL: Record<ReminderPeriod, string> = {
  '24h': '24 ore prima',
  '12h': '12 ore prima',
  scadenza: 'Alla scadenza',
}

/** Le scelte della modale per «Quando vuoi ricevere la notifica?», come prima. */
export const REMINDER_PERIOD_OPTIONS: { value: ReminderPeriod; label: string }[] = [
  { value: '24h', label: '24 ore prima della scadenza' },
  { value: '12h', label: '12 ore prima della scadenza' },
  { value: 'scadenza', label: 'Esattamente alla scadenza' },
]

/**
 * Il nome del conto del promemoria; prima la colonna mostrava l'id interno («a1», «b365-1»).
 * `null` fra i conti vuol dire elenco ancora in arrivo: un segnaposto al posto del nome.
 */
export function reminderAccountLabel(
  reminder: Pick<Reminder, 'accountId'>,
  accounts: { id: string; nome: string }[] | null,
): string | null {
  if (!reminder.accountId) return null
  if (!accounts) return '…'
  return accounts.find((a) => a.id === reminder.accountId)?.nome ?? 'Conto non trovato'
}

/** Il testo dello stato vuoto per il filtro scelto. */
export function emptyRemindersTitle(filter: ReminderFilter): string {
  switch (filter) {
    case 'attivo':
      return 'Nessun promemoria attivo'
    case 'completato':
      return 'Nessun promemoria completato'
    case 'scaduto':
      return 'Nessun promemoria scaduto'
    default:
      return 'Nessun promemoria'
  }
}
