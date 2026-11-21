import type { CreateBetLegPayload, CreateBetPayload } from '@/services/api/profit-tracker-client'
import type { BetCategory, SportType } from '@/types/profit-tracker'
import type { CoverLegResult } from '@/lib/calculators/engines/condizionato-engine'
import type { BetPayloads } from '@/lib/calculators/bet-payloads'
import { formatMoney } from '@/lib/landing-format'

/**
 * La giocata del calcolatore Condizionato (§14.352) per il Profit Tracker, come la salvano gli
 * altri calcolatori sport: una giocata sul conto della qualificante, una gamba per puntata, tutte
 * in bozza. La qualificante porta il rimborso in `rimborsoValore` (tipo «rimborso», §14.115); le
 * coperture della qualificante e della condizione seguono, ognuna col suo mercato e il suo conto.
 * Il tracker non conosce la condizione: la dice la nota della giocata.
 */

export interface CondizionatoBetCover {
  /** Mercato già formattato (`formatMercatoString`). */
  mercato: string
  accountId: string
  leg: CoverLegResult
}

export interface CondizionatoBetArgs {
  eventoDataIso: string
  eventoNome: string
  competizione: string
  sport: SportType
  categoria: BetCategory
  qualifier: {
    mercato: string
    accountId: string
    stake: number
    odds: number
    refund: number
  }
  qualifierCovers: CondizionatoBetCover[]
  conditionCovers: CondizionatoBetCover[]
  /** La condizione dell'offerta, scritta dall'utente (per esempio «tempi supplementari»). */
  condizione?: string
}

/** Il nome di una gamba nel tracker: il ruolo, col numero quando le gambe sono due. */
function coverName(base: string, index: number, count: number): string {
  return count > 1 ? `${base} ${index + 1}` : base
}

/** La nota della giocata: l'importo del rimborso e, se c'è, la condizione. */
export function condizionatoNota(refund: number, condizione?: string): string {
  const head = `Rimborso condizionato di ${formatMoney(refund, { sign: false })}`
  const text = condizione?.trim()
  return text ? `${head}: ${text}` : head
}

export function buildCondizionatoBet(args: CondizionatoBetArgs): BetPayloads {
  const { qualifier } = args
  const common = {
    eventoData: args.eventoDataIso,
    sport: args.sport,
    eventoNome: args.eventoNome,
    competizione: args.competizione,
    movimento: 0,
    statoEvento: 'bozza',
    tag: undefined,
  }

  const betPayload: CreateBetPayload = {
    eventoData: args.eventoDataIso,
    categoria: args.categoria,
    sport: args.sport,
    eventoNome: args.eventoNome,
    modalitaSaldo: 'reale',
    accountId: qualifier.accountId,
    tag: undefined,
    nota: condizionatoNota(qualifier.refund, args.condizione),
  }

  const qualifierLeg: CreateBetLegPayload = {
    ...common,
    mercato: qualifier.mercato,
    selezione: 'Qualificante',
    metodo: 'punta',
    tipoBonus: 'rimborso',
    accountId: qualifier.accountId,
    stake: qualifier.stake,
    quota: qualifier.odds,
    rischio: 0,
    bonusValore: undefined,
    rimborsoValore: qualifier.refund,
    commissionePercentuale: 0,
    posizione: 0,
  }

  const coverLeg = (
    cover: CondizionatoBetCover,
    selezione: string,
    quotaRiferimento: number | undefined,
    posizione: number,
  ): CreateBetLegPayload => {
    const { leg } = cover
    const banca = leg.mode === 'banca'
    return {
      ...common,
      mercato: cover.mercato,
      selezione,
      metodo: banca ? 'banca' : 'punta',
      tipoBonus: 'none',
      accountId: cover.accountId,
      stake: leg.stake,
      quota: leg.odds,
      quotaRiferimento: banca ? quotaRiferimento : undefined,
      rischio: banca ? leg.liability : 0,
      bonusValore: undefined,
      rimborsoValore: undefined,
      commissionePercentuale: leg.commissionPercent,
      posizione,
    }
  }

  const legsPayload: CreateBetLegPayload[] = [qualifierLeg]
  args.qualifierCovers.forEach((cover, i, all) => {
    legsPayload.push(
      coverLeg(
        cover,
        coverName('Copertura qualificante', i, all.length),
        qualifier.odds,
        legsPayload.length,
      ),
    )
  })
  args.conditionCovers.forEach((cover, i, all) => {
    legsPayload.push(
      coverLeg(
        cover,
        coverName('Copertura condizione', i, all.length),
        undefined,
        legsPayload.length,
      ),
    )
  })

  return { betPayload, legsPayload }
}
