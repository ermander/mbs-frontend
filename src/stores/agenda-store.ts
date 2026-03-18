import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TipologiaCalcolo = 'NORMALE' | 'RIMBORSO (CR%)' | 'BONUS'
/** Sbilanciamento della bancata: percentuale da -30 a +30 (solo in modalità avanzata). */
export type SbilanciamentoValue = number

/** Voce agenda da calcolatore Punta-Banca */
export interface PuntaBancaEntry {
  id: string
  createdAt: string
  calculatorType: 'punta-banca'
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
  sbilanciamento: SbilanciamentoValue
  abbinata?: number
  nuovaQuota?: number
  banca?: number
  responsabilitaAbbinata?: number
}

/** Voce agenda da calcolatore Punta-Punta */
export interface PuntaPuntaEntry {
  id: string
  createdAt: string
  calculatorType: 'punta-punta'
  puntataA: number
  quotaA: number
  puntataB: number
  quotaB: number
  guadagnoMinimo: number
  bonus?: number
}

/** Unione voci agenda (Punta-Banca o Punta-Punta) */
export type AgendaEntry = PuntaBancaEntry | PuntaPuntaEntry

/** Type guard per Punta-Banca (incl. voci salvate prima dell'estensione) */
export function isPuntaBancaEntry(e: AgendaEntry): e is PuntaBancaEntry {
  return (e as PuntaBancaEntry).calculatorType === 'punta-banca' || !('calculatorType' in e)
}

/** Type guard per Punta-Punta */
export function isPuntaPuntaEntry(e: AgendaEntry): e is PuntaPuntaEntry {
  return (e as PuntaPuntaEntry).calculatorType === 'punta-punta'
}

interface AgendaState {
  entries: AgendaEntry[]
  addEntry: (entry: Omit<PuntaBancaEntry, 'id' | 'createdAt' | 'calculatorType'>) => void
  addPuntaPuntaEntry: (entry: Omit<PuntaPuntaEntry, 'id' | 'createdAt' | 'calculatorType'>) => void
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
              calculatorType: 'punta-banca' as const,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      addPuntaPuntaEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              calculatorType: 'punta-punta' as const,
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
