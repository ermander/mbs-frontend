import { SECTIONS } from '@/lib/tools'

/**
 * §14.366: in una riga le sezioni abilitate di un utente, per la tabella Utenti del Backoffice:
 * «Tutte», «Nessuna», «Tutte tranne Risultato + Goal», «Solo Offerte e Calcolatori», «4 su 7».
 */
export function sectionsSummary(enabled: readonly string[] | undefined): string {
  const list = enabled ?? []
  const on = SECTIONS.filter((s) => list.includes(s.key))
  const off = SECTIONS.filter((s) => !list.includes(s.key))
  if (off.length === 0) return 'Tutte'
  if (on.length === 0) return 'Nessuna'
  if (off.length <= 2) return `Tutte tranne ${off.map((s) => s.label).join(' e ')}`
  if (on.length <= 2) return `Solo ${on.map((s) => s.label).join(' e ')}`
  return `${on.length} su ${SECTIONS.length}`
}
