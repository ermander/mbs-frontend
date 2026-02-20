import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TipologiaCalcolo = 'NORMALE' | 'RIMBORSO (CR%)' | 'BONUS'
/** Sbilanciamento della bancata: percentuale da -30 a +30 (solo in modalità avanzata). */
export type SbilanciamentoValue = number

export interface AgendaEntry {
  id: string
  createdAt: string
  tipologia: TipologiaCalcolo
  puntata: number
  quotaPunta: number
  rimborso?: number
  bonus?: number
  commissione: number
  quotaBanca: number
  quotaPuntaEquivalente: number | null
  layStake: number | null
  responsabilita: number | null
  sbilanciamento: SbilanciamentoValue // -30..30
  /** Optional partial lay section */
  abbinata?: number
  nuovaQuota?: number
  banca?: number
  responsabilitaAbbinata?: number
}

interface AgendaState {
  entries: AgendaEntry[]
  addEntry: (entry: Omit<AgendaEntry, 'id' | 'createdAt'>) => void
  removeEntry: (id: string) => void
}

function generateId(): string {
  return `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useAgendaStore = create<AgendaState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
    }),
    {
      name: 'mbs-agenda',
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
)
