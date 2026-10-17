import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The two knobs of the stake advice of «Risultato + Goal» (§14.244), kept
 * in the browser like the session: the cushion every account should keep
 * after its stakes and the cap on the stake typed. Defaults chosen by the
 * user on 2026-10-17: 100 € and 150 €.
 */
export const DEFAULT_RESULT_BTTS_CUSHION = 100
export const DEFAULT_RESULT_BTTS_MAX_STAKE = 150

interface ResultBttsSettingsState {
  cushion: number
  maxStake: number
  setCushion: (value: number) => void
  setMaxStake: (value: number) => void
}

export const useResultBttsSettingsStore = create<ResultBttsSettingsState>()(
  persist(
    (set) => ({
      cushion: DEFAULT_RESULT_BTTS_CUSHION,
      maxStake: DEFAULT_RESULT_BTTS_MAX_STAKE,
      setCushion: (value) => set({ cushion: Number.isFinite(value) && value >= 0 ? value : 0 }),
      setMaxStake: (value) => set({ maxStake: Number.isFinite(value) && value >= 0 ? value : 0 }),
    }),
    {
      name: 'mbs-result-btts-stake',
      partialize: (state) => ({ cushion: state.cushion, maxStake: state.maxStake }),
    },
  ),
)
