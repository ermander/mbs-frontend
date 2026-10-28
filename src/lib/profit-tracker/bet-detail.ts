import { multiplaLayStakes } from '@/lib/calculators/multipla'
import type { BetLeg, BetStatus, ModalitaSaldo } from '@/types/profit-tracker'

/**
 * Dettaglio della giocata dal design «OddWise Giocata» (§14.283): ordine delle gambe, marcatore
 * della multipla, ricalcolo delle coperture quando cambia una gamba della multipla, riepilogo
 * e patch della modale «Modifica gamba». Le regole sono quelle della pagina di prima, raccolte
 * qui per poterle provare.
 */

export const FINAL_STATES = new Set<BetStatus>(['vinto', 'perso', 'annullato'])

export const STATO_LABEL: Record<BetStatus, string> = {
  bozza: 'Bozza',
  in_corso: 'In corso',
  vinto: 'Vinto',
  perso: 'Perso',
  annullato: 'Annullato',
}

export const TIPO_BONUS_LABEL: Record<BetLeg['tipoBonus'], string> = {
  none: 'Nessuno',
  bonus: 'Bonus',
  rimborso: 'Rimborso',
  freebet: 'Freebet',
}

/** Posizione, poi la punta prima della banca, poi data, quota e id: l'ordine di sempre. */
export function sortLegs(legs: BetLeg[]): BetLeg[] {
  return [...legs].sort((a, b) => {
    const posA = a.posizione ?? 999
    const posB = b.posizione ?? 999
    if (posA !== posB) return posA - posB
    if (a.metodo === 'punta' && b.metodo !== 'punta') return -1
    if (a.metodo !== 'punta' && b.metodo === 'punta') return 1
    const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
    if (byDate !== 0) return byDate
    if (a.quota !== b.quota) return a.quota - b.quota
    return String(a.id).localeCompare(String(b.id))
  })
}

const isMultiplaMarker = (s: string | null | undefined) =>
  (s ?? '').trim().toLowerCase() === 'multipla'

/**
 * Una giocata è una multipla solo se è stata salvata come tale: i modali delle multiple scrivono
 * «Multipla» in competizione e mercato della punta, lo stesso marcatore del backend. Niente
 * euristiche sulla forma delle gambe: una singola con gambe clonate non ricalcola mai le coperture.
 */
export function isMultiplaLegs(legs: BetLeg[]): boolean {
  const punta = legs.find((l) => l.metodo === 'punta')
  return punta != null && (isMultiplaMarker(punta.competizione) || isMultiplaMarker(punta.mercato))
}

/** La gamba punta della multipla, che porta il marcatore: il mercato non si cambia. */
export function isMultiplaMarkerLeg(leg: BetLeg): boolean {
  return (
    leg.metodo === 'punta' && (isMultiplaMarker(leg.competizione) || isMultiplaMarker(leg.mercato))
  )
}

/** Il rischio mostrato per gamba: la punta salvata senza rischio rischia la puntata. */
export function legRisk(leg: BetLeg): number {
  return leg.metodo === 'punta' && (leg.rischio ?? 0) === 0 ? leg.stake : (leg.rischio ?? 0)
}

export interface BetSummary {
  /** Somma dei rischi senza la punta principale, come il riepilogo di prima. */
  totalRischio: number
  totalMovimento: number
  /** Almeno una gamba liquidata: il guadagno ha senso. */
  anyClosed: boolean
  allClosed: boolean
  hasLegsInCorso: boolean
}

export function betSummary(legs: BetLeg[]): BetSummary {
  const main = legs.find((l) => l.metodo === 'punta')
  return {
    totalRischio: legs.filter((l) => l.id !== main?.id).reduce((s, l) => s + (l.rischio ?? 0), 0),
    totalMovimento: legs.reduce((s, l) => s + l.movimento, 0),
    anyClosed: legs.some((l) => FINAL_STATES.has(l.statoEvento)),
    allClosed: legs.length > 0 && legs.every((l) => FINAL_STATES.has(l.statoEvento)),
    hasLegsInCorso: legs.some((l) => l.statoEvento === 'in_corso'),
  }
}

export function modalitaSaldoFor(tipoBonus: BetLeg['tipoBonus']): ModalitaSaldo {
  if (tipoBonus === 'bonus' || tipoBonus === 'freebet') return 'bonus'
  if (tipoBonus === 'rimborso') return 'rimborso'
  return 'reale'
}

export type LegPatch = Partial<
  Pick<
    BetLeg,
    | 'eventoData'
    | 'eventoNome'
    | 'mercato'
    | 'selezione'
    | 'stake'
    | 'quota'
    | 'quotaRiferimento'
    | 'commissionePercentuale'
    | 'tipoBonus'
    | 'bonusValore'
    | 'rimborsoValore'
    | 'accountId'
    | 'rischio'
  >
>

/** Il modulo della modale «Modifica gamba»: testi come li scrive l'utente. */
export interface LegForm {
  eventoNome: string
  eventoDataLocal: string
  mercato: string
  selezione: string
  accountId: string
  tipoBonus: BetLeg['tipoBonus']
  quota: string
  quotaRiferimento: string
  stake: string
  bonusValore: string
  rimborsoValore: string
  commissione: string
}

export function parseDecimal(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Data ISO → valore di un campo datetime-local nell'ora del browser. */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const decimalText = (n: number | null | undefined) =>
  n == null ? '' : String(Math.round(n * 1000) / 1000).replace('.', ',')

export function legToForm(leg: BetLeg): LegForm {
  return {
    eventoNome: leg.eventoNome,
    eventoDataLocal: toDatetimeLocal(leg.eventoData),
    mercato: leg.mercato,
    selezione: leg.selezione ?? '',
    accountId: leg.accountId,
    tipoBonus: leg.tipoBonus,
    quota: decimalText(leg.quota),
    quotaRiferimento: decimalText(leg.quotaRiferimento),
    stake: decimalText(leg.stake),
    bonusValore: leg.bonusValore ? decimalText(leg.bonusValore) : '',
    rimborsoValore: leg.rimborsoValore ? decimalText(leg.rimborsoValore) : '',
    commissione: decimalText(leg.commissionePercentuale ?? 0),
  }
}

export type LegFormErrors = Partial<Record<keyof LegForm, string>>

export function legFormErrors(leg: BetLeg, f: LegForm, multipla: boolean): LegFormErrors {
  const e: LegFormErrors = {}
  if (!f.eventoNome.trim()) e.eventoNome = "Scrivi il nome dell'evento"
  if (!Number.isFinite(new Date(f.eventoDataLocal).getTime()))
    e.eventoDataLocal = 'Indica data e ora'
  if (!f.mercato.trim()) e.mercato = 'Indica il mercato'
  if (!f.accountId) e.accountId = 'Scegli il conto'
  const quota = parseDecimal(f.quota)
  if (quota == null || quota <= 1) e.quota = 'Serve una quota sopra 1'
  const stake = parseDecimal(f.stake)
  if (stake == null || stake < 0) e.stake = 'Serve un importo da 0 € in su'
  if (multipla && leg.metodo !== 'punta' && f.quotaRiferimento.trim() !== '') {
    const q = parseDecimal(f.quotaRiferimento)
    if (q == null || q <= 1) e.quotaRiferimento = 'Serve una quota sopra 1'
  }
  if (leg.metodo === 'banca') {
    const c = parseDecimal(f.commissione)
    if (c == null || c < 0 || c > 100) e.commissione = 'La commissione va da 0 a 100 %'
  }
  if (f.tipoBonus === 'bonus' && (parseDecimal(f.bonusValore) ?? 0) < 0)
    e.bonusValore = 'Importo non valido'
  if (f.tipoBonus === 'rimborso' && (parseDecimal(f.rimborsoValore) ?? 0) < 0)
    e.rimborsoValore = 'Importo non valido'
  return e
}

const changed = (a: number | null | undefined, b: number | null | undefined) =>
  Math.abs((a ?? 0) - (b ?? 0)) > 1e-9

/**
 * Solo i campi cambiati, con le regole della pagina di prima: la punta che cambia puntata
 * aggiorna anche il rischio; un tipo bonus diverso da «bonus»/«rimborso» azzera il valore
 * corrispondente; il metodo non si tocca.
 */
export function legFormPatch(leg: BetLeg, f: LegForm): LegPatch {
  const p: LegPatch = {}
  if (f.eventoNome.trim() !== leg.eventoNome) p.eventoNome = f.eventoNome.trim()
  const date = new Date(f.eventoDataLocal)
  if (f.eventoDataLocal !== toDatetimeLocal(leg.eventoData) && Number.isFinite(date.getTime()))
    p.eventoData = date.toISOString()
  if (f.mercato.trim() !== leg.mercato) p.mercato = f.mercato.trim()
  if (f.selezione.trim() !== (leg.selezione ?? '')) p.selezione = f.selezione.trim()
  if (f.accountId !== leg.accountId) p.accountId = f.accountId
  if (leg.metodo === 'punta' && f.tipoBonus !== leg.tipoBonus) p.tipoBonus = f.tipoBonus
  const tipo = p.tipoBonus ?? leg.tipoBonus

  const quota = parseDecimal(f.quota)
  if (quota != null && changed(quota, leg.quota)) p.quota = quota
  const qRif = parseDecimal(f.quotaRiferimento)
  if (leg.metodo !== 'punta' && qRif != null && changed(qRif, leg.quotaRiferimento))
    p.quotaRiferimento = qRif
  const stake = parseDecimal(f.stake)
  if (stake != null && changed(stake, leg.stake)) {
    p.stake = stake
    if (leg.metodo === 'punta') p.rischio = stake
  }
  if (leg.metodo === 'banca') {
    const c = parseDecimal(f.commissione)
    if (c != null && changed(c, leg.commissionePercentuale)) p.commissionePercentuale = c
  }
  const bonus = tipo === 'bonus' ? (parseDecimal(f.bonusValore) ?? 0) : 0
  if (changed(bonus, leg.bonusValore)) p.bonusValore = bonus
  const rimborso = tipo === 'rimborso' ? (parseDecimal(f.rimborsoValore) ?? 0) : 0
  if (changed(rimborso, leg.rimborsoValore)) p.rimborsoValore = rimborso
  return p
}

/**
 * Le coperture della multipla dopo la modifica di una gamba (stesse regole della pagina di
 * prima): quota punta di una copertura → la quota totale della punta diventa il prodotto
 * (2 decimali); quota punta della punta → quella è la quota totale; quote o commissioni delle
 * coperture, puntata, bonus, rimborso o tipo bonus della punta → coperture ricalcolate. Le
 * coperture già liquidate non si toccano. Vuoto se la giocata non è una multipla o se la
 * modifica non tocca i conti.
 */
export function multiplaRecalcPatches(
  legs: BetLeg[],
  legId: string,
  patch: LegPatch,
): { legId: string; patch: LegPatch }[] {
  if (!isMultiplaLegs(legs)) return []
  const punta = legs.find((l) => l.metodo === 'punta')
  if (!punta) return []
  const apply = (l: BetLeg): BetLeg => (l.id === legId ? { ...l, ...patch } : l)
  const hedges = legs
    .filter((l) => l.id !== punta.id)
    .sort((a, b) => {
      const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
      if (byDate !== 0) return byDate
      return String(a.id).localeCompare(String(b.id))
    })
    .map(apply)
  if (hedges.length === 0) return []
  const newPunta = apply(punta)
  const editedIsHedge = legId !== punta.id
  const has = (k: keyof LegPatch) => k in patch

  const hedgeTrigger =
    editedIsHedge && (has('quotaRiferimento') || has('quota') || has('commissionePercentuale'))
  const puntaQuota = !editedIsHedge && has('quota')
  const puntaMoney =
    !editedIsHedge &&
    (has('stake') || has('bonusValore') || has('rimborsoValore') || has('tipoBonus'))
  if (!hedgeTrigger && !puntaQuota && !puntaMoney) return []

  const out: { legId: string; patch: LegPatch }[] = []
  const product = hedges.reduce((acc, l) => acc * (l.quotaRiferimento ?? 1), 1)
  let totalBackOdds: number
  if (editedIsHedge && has('quotaRiferimento')) {
    out.push({ legId: punta.id, patch: { quota: Math.round(product * 100) / 100 } })
    totalBackOdds = product
  } else if (puntaQuota) {
    totalBackOdds = newPunta.quota
  } else {
    totalBackOdds = product || newPunta.quota
  }

  const results = multiplaLayStakes(
    newPunta.stake + (newPunta.bonusValore ?? 0),
    totalBackOdds,
    hedges.map((l) => ({
      type: l.metodo === 'banca' ? ('punta-banca' as const) : ('punta-punta' as const),
      coverOdds: l.quota,
      commissionPercent: l.commissionePercentuale ?? (l.metodo === 'banca' ? 3 : 0),
    })),
    newPunta.rimborsoValore ?? 0,
  )
  hedges.forEach((l, i) => {
    if (FINAL_STATES.has(l.statoEvento)) return
    const r = results[i]
    if (r) out.push({ legId: l.id, patch: { stake: r.hedgeStake, rischio: r.hedgeCost } })
  })
  return out
}
