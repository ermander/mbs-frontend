import type { CreateBetLegPayload, CreateBetPayload } from '@/services/api/profit-tracker-client'
import type { BetBonusType, BetCategory, SportType } from '@/types/profit-tracker'
import type { MultiplaEvent } from '@/types/multipla-event'
import { multiplaLayStakes } from '@/lib/calculators/multipla'

/**
 * Profit Tracker payloads of the scanner v2 calculators, built the way the
 * Oddsmatcher modal (punta-banca) and the offline Punta-Punta / Tri-Punta
 * calculators build theirs: one bet on the punta account, one leg per stake,
 * every leg saved as a draft ("bozza"). Pure, so the shapes are unit-tested.
 */

export interface BetEventInfo {
  eventoDataIso: string
  eventoNome: string
  competizione: string
  sport: SportType
  mercato: string
}

export interface BetPayloads {
  betPayload: CreateBetPayload
  legsPayload: CreateBetLegPayload[]
}

/** The stake nature of the punta leg: a rimborso wins over a bonus, as in every calculator. */
export function tipoBonusFor(bonus: number, rimborso: number): BetBonusType {
  if (rimborso > 0) return 'rimborso'
  if (bonus > 0) return 'bonus'
  return 'none'
}

export interface PuntaBancaBetArgs {
  event: BetEventInfo
  selezione: string
  categoria?: BetCategory
  accountIdPunta: string
  accountIdBanca: string
  /** Real stake on the book. */
  puntata: number
  bonus: number
  rimborso: number
  quotaPunta: number
  quotaBanca: number
  commissionePercent: number
  /** Single lay stake and its liability (used when there are no partial lays). */
  layStake: number
  responsabilita: number
  partialLays: Array<{ amount: number | null; newOdds: number | null }>
  partialLayResults: Array<{ newLayStake: number; newLiability: number } | null>
}

export function buildPuntaBancaBet(args: PuntaBancaBetArgs): BetPayloads {
  const { event } = args
  const puntataEffettiva = args.puntata + args.bonus
  const tipoBonus = tipoBonusFor(args.bonus, args.rimborso)

  const betPayload: CreateBetPayload = {
    eventoData: event.eventoDataIso,
    source: 'oddsmatcher',
    categoria: args.categoria,
    sport: event.sport,
    eventoNome: event.eventoNome,
    modalitaSaldo: 'reale',
    accountId: args.accountIdPunta,
    tag: undefined,
    nota: undefined,
  }

  const puntaLeg: CreateBetLegPayload = {
    eventoData: event.eventoDataIso,
    sport: event.sport,
    eventoNome: event.eventoNome,
    competizione: event.competizione,
    mercato: event.mercato,
    selezione: args.selezione,
    metodo: 'punta',
    tipoBonus,
    accountId: args.accountIdPunta,
    stake: puntataEffettiva,
    quota: args.quotaPunta,
    rischio: 0,
    bonusValore: args.bonus > 0 ? args.bonus : undefined,
    rimborsoValore: args.rimborso > 0 ? args.rimborso : undefined,
    commissionePercentuale: 0,
    movimento: 0,
    statoEvento: 'bozza',
    tag: undefined,
    posizione: 0,
  }

  const bancaBase = {
    eventoData: event.eventoDataIso,
    sport: event.sport,
    eventoNome: event.eventoNome,
    competizione: event.competizione,
    mercato: event.mercato,
    selezione: args.selezione,
    metodo: 'banca' as const,
    tipoBonus: 'none' as const,
    accountId: args.accountIdBanca,
    quotaRiferimento: args.quotaPunta,
    bonusValore: undefined,
    rimborsoValore: undefined,
    commissionePercentuale: args.commissionePercent,
    movimento: 0,
    statoEvento: 'bozza',
    tag: undefined,
  }

  const bancaLegs: CreateBetLegPayload[] = []
  const hasPartialLays =
    args.partialLays.length > 0 &&
    args.partialLayResults.length === args.partialLays.length &&
    args.partialLayResults.every((r) => r != null)
  if (hasPartialLays) {
    // Every "already laid" amount was placed at the price of the previous step.
    for (let i = 0; i < args.partialLays.length; i++) {
      const amount = args.partialLays[i].amount ?? 0
      const odds = i === 0 ? args.quotaBanca : (args.partialLays[i - 1].newOdds ?? args.quotaBanca)
      bancaLegs.push({
        ...bancaBase,
        stake: amount,
        quota: odds,
        rischio: amount * (odds - 1),
        posizione: i + 1,
      })
    }
    // Last step: the computed amount still to be laid.
    const last = args.partialLayResults[args.partialLayResults.length - 1] as {
      newLayStake: number
      newLiability: number
    }
    const lastOdds = args.partialLays[args.partialLays.length - 1].newOdds ?? args.quotaBanca
    bancaLegs.push({
      ...bancaBase,
      stake: last.newLayStake,
      quota: lastOdds,
      rischio: last.newLiability,
      posizione: args.partialLays.length + 1,
    })
  } else {
    bancaLegs.push({
      ...bancaBase,
      stake: args.layStake,
      quota: args.quotaBanca,
      rischio: args.responsabilita,
      posizione: 1,
    })
  }

  return { betPayload, legsPayload: [puntaLeg, ...bancaLegs] }
}

export interface DutchBetLegArgs {
  selezione: string
  /** The price the user sees; an exchange leg also carries its commission. */
  quotaGross: number
  commissionePercent: number
  accountId: string
  /** puntata + bonus on the punta leg, the rounded cover on the others. */
  stake: number
}

export interface DutchBetArgs {
  event: BetEventInfo
  categoria: BetCategory
  puntaIndex: number
  puntata: number
  bonus: number
  rimborso: number
  legs: DutchBetLegArgs[]
}

/** Two or three back legs: the punta leg first (posizione 0), the covers in leg order. */
export function buildDutchBet(args: DutchBetArgs): BetPayloads {
  const { event } = args
  const punta = args.legs[args.puntaIndex]
  const tipoBonus = tipoBonusFor(args.bonus, args.rimborso)

  const betPayload: CreateBetPayload = {
    eventoData: event.eventoDataIso,
    source: 'oddsmatcher',
    categoria: args.categoria,
    sport: event.sport,
    eventoNome: event.eventoNome,
    modalitaSaldo: 'reale',
    accountId: punta.accountId,
    tag: undefined,
    nota: undefined,
  }

  const legFor = (
    leg: DutchBetLegArgs,
    isPunta: boolean,
    posizione: number,
  ): CreateBetLegPayload => ({
    eventoData: event.eventoDataIso,
    sport: event.sport,
    eventoNome: event.eventoNome,
    competizione: event.competizione,
    mercato: event.mercato,
    selezione: leg.selezione,
    metodo: 'punta',
    tipoBonus: isPunta ? tipoBonus : 'none',
    accountId: leg.accountId,
    stake: leg.stake,
    quota: leg.quotaGross,
    rischio: 0,
    bonusValore: isPunta && args.bonus > 0 ? args.bonus : undefined,
    rimborsoValore: isPunta && args.rimborso > 0 ? args.rimborso : undefined,
    commissionePercentuale: leg.commissionePercent,
    movimento: 0,
    statoEvento: 'bozza',
    tag: undefined,
    posizione,
  })

  const legsPayload: CreateBetLegPayload[] = [legFor(punta, true, 0)]
  let posizione = 1
  args.legs.forEach((leg, index) => {
    if (index === args.puntaIndex) return
    legsPayload.push(legFor(leg, false, posizione))
    posizione += 1
  })

  return { betPayload, legsPayload }
}

// ---------------------------------------------------------------------
// Multipla (scanner v2, §14.99): the payload of the old
// OddsmatcherMultiplaSaveModal, with one cover account per bookmaker.
// ---------------------------------------------------------------------

export interface MultiplaBetArgs {
  /** The chosen events, any order: they are sorted by kickoff, the order the hedges are placed in. */
  events: MultiplaEvent[]
  accountIdPunta: string
  /** Account per cover bookmaker slug (`bookId2` of the events). */
  coverAccountIds: Record<string, string>
  stake: number
  bonus: number
  rimborso: number
  categoria?: BetCategory
}

/** The old scanner keyed sports by id ('0' calcio, '1' tennis, '2' basket); scanner v2 events carry the Profit Tracker name. */
export function multiplaSport(value: string): SportType {
  switch (value) {
    case 'calcio':
    case 'basket':
    case 'tennis':
    case 'altro':
      return value
    case '1':
      return 'tennis'
    case '2':
      return 'basket'
    default:
      return 'calcio'
  }
}

function multiplaKickoffIso(ev: MultiplaEvent): string {
  if (ev.startTimeIso) return ev.startTimeIso
  return new Date(`${ev.date}T${ev.hour.replace('.', ':')}:00`).toISOString()
}

export function buildMultiplaBet(args: MultiplaBetArgs): BetPayloads {
  const sorted = [...args.events].sort(
    (a, b) => Date.parse(multiplaKickoffIso(a)) - Date.parse(multiplaKickoffIso(b)),
  )
  const first = sorted[0]
  const eventoDataFirst = multiplaKickoffIso(first)
  const sport = multiplaSport(first.sport)
  const eventoNome = `MULTIPLA ${first.home} - ${first.away}`
  const backStakeTotale = args.stake + args.bonus
  const tipoBonus = tipoBonusFor(args.bonus, args.rimborso)

  const betPayload: CreateBetPayload = {
    eventoData: eventoDataFirst,
    source: 'oddsmatcher',
    categoria: args.categoria,
    sport,
    eventoNome,
    modalitaSaldo: 'reale',
    accountId: args.accountIdPunta,
    tag: undefined,
    nota: undefined,
  }

  const quotaPuntaPrecisa = sorted.reduce((acc, ev) => acc * Number.parseFloat(ev.mainOdd), 1)
  const quotaPuntaTotale = Math.round(quotaPuntaPrecisa * 100) / 100

  const legPunta: CreateBetLegPayload = {
    eventoData: eventoDataFirst,
    sport,
    eventoNome,
    competizione: 'Multipla',
    mercato: 'Multipla',
    selezione: undefined,
    metodo: 'punta',
    tipoBonus,
    accountId: args.accountIdPunta,
    stake: args.stake,
    quota: quotaPuntaTotale,
    rischio: args.stake,
    bonusValore: args.bonus > 0 ? args.bonus : undefined,
    rimborsoValore: args.rimborso > 0 ? args.rimborso : undefined,
    commissionePercentuale: 0,
    movimento: 0,
    statoEvento: 'bozza',
    tag: undefined,
    posizione: 0,
  }

  const hedges = multiplaLayStakes(
    backStakeTotale,
    quotaPuntaPrecisa,
    sorted.map((ev) => ({
      type: ev.type,
      coverOdds: Number.parseFloat(ev.coverOdd),
      commissionPercent: ev.commissionPercent,
    })),
    args.rimborso,
  )

  const legsHedge: CreateBetLegPayload[] = sorted.map((ev, i) => {
    const hedge = hedges[i] ?? { hedgeStake: 0, hedgeCost: 0 }
    const mainOdd = Number.parseFloat(ev.mainOdd)
    const isBanca = ev.type === 'punta-banca'
    const quota = isBanca
      ? Number.parseFloat(ev.coverOdd)
      : Number.parseFloat(ev.coverOddGross ?? ev.coverOdd)
    return {
      eventoData: multiplaKickoffIso(ev),
      sport: multiplaSport(ev.sport),
      eventoNome: `${ev.home} - ${ev.away}`,
      competizione: ev.competition,
      mercato: ev.market,
      selezione: isBanca ? ev.selection : (ev.coverSelection ?? ev.selection),
      metodo: isBanca ? 'banca' : 'punta',
      tipoBonus: 'none',
      accountId: args.coverAccountIds[ev.bookId2],
      stake: hedge.hedgeStake,
      quota,
      quotaRiferimento: Number.isFinite(mainOdd) ? mainOdd : undefined,
      rischio: hedge.hedgeCost,
      commissionePercentuale: ev.commissionPercent,
      movimento: 0,
      statoEvento: 'bozza',
      tag: undefined,
      posizione: i + 1,
    }
  })

  return { betPayload, legsPayload: [legPunta, ...legsHedge] }
}
