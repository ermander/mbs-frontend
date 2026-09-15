import type { MovementCategoryDirezione, MovementCategoryNatura } from '@/types/profit-tracker'

/** §14.111: etichette e resa delle categorie dei movimenti di wallet. */
export const NATURA_LABELS: Record<MovementCategoryNatura, string> = {
  reddito: 'Altre entrate',
  costo_attivita: "Costi dell'attività",
  spesa_personale: 'Spese personali',
  capitale: 'Capitale proprio (fuori dal conto)',
}

export const NATURA_HINTS: Record<MovementCategoryNatura, string> = {
  reddito: 'Conta come entrata nel report.',
  costo_attivita: "Conta come costo dell'attività nel report.",
  spesa_personale: 'Conta come spesa personale nel report.',
  capitale: 'Capitale proprio: resta fuori dal conto economico.',
}

export const DIREZIONE_LABELS: Record<MovementCategoryDirezione, string> = {
  entrata: 'Entrata (ricariche)',
  uscita: 'Uscita (spese)',
}

export const NATURA_BADGE_CLASS: Record<MovementCategoryNatura, string> = {
  reddito: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  costo_attivita: 'border-destructive/30 bg-destructive/15 text-destructive',
  spesa_personale: 'border-orange-500/30 bg-orange-500/15 text-orange-400',
  capitale: 'border-white/10 bg-white/5 text-white/50',
}

/** La direzione che una categoria deve avere per un tipo di movimento. */
export function direzioneForTipo(tipo: 'ricarica' | 'spesa'): MovementCategoryDirezione {
  return tipo === 'ricarica' ? 'entrata' : 'uscita'
}
