// Configurazione centralizzata dei mercati per i calcolatori offline.
// Le voci della dropdown (MARKET_OPTIONS) sono generate da MARKET_CONFIGS:
// per aggiungere/estendere un mercato basta modificare la config.

export type TeamScope = 'CASA' | 'OSPITE'

export const TEAM_SCOPE_LABELS: Record<TeamScope, string> = {
  CASA: 'Casa',
  OSPITE: 'Ospite',
}

export type MarketType =
  | 'MATCH_1X2'
  | 'MATCH_OVER_UNDER'
  | 'GG_NG'
  | 'DOPPIA_CHANCE'
  | 'HANDICAP'
  | 'PARZIALE_FINALE'
  | 'ALTRO'
  | 'PUNTA_BANCA'
  | 'TOTAL_SHOTS'
  | 'TEAM_TOTAL_SHOTS'
  | 'TOTAL_SHOTS_ON_TARGET'
  | 'TEAM_TOTAL_SHOTS_ON_TARGET'
  | 'TOTAL_FOULS'
  | 'TEAM_FOULS'
  | 'TOTAL_CARDS'
  | 'TEAM_CARDS'
  | 'CARDS_1X2'
  | 'RED_CARD'
  | 'TOTAL_CORNERS'
  | 'TEAM_CORNERS'
  | 'CORNERS_1X2'

export type MarketOutcome =
  | 'OVER'
  | 'UNDER'
  | 'HOME'
  | 'DRAW'
  | 'AWAY'
  | 'YES'
  | 'NO'
  | 'GG'
  | 'NG'
  | '1X'
  | 'X2'
  | '12'

interface OverUnderMarketConfig {
  kind: 'over_under'
  marketType: MarketType
  baseLabel: string
  minLine: number
  maxLine: number
  /** Passo tra le linee (default 1: 8.5, 9.5, 10.5, ...) */
  step?: number
  teamScoped?: boolean
  /** Formato storico 'Under/Over 0.5 - Under' (voci pre-esistenti) invece di 'Corner totali Over 8.5' */
  legacyLabel?: boolean
}

interface OutcomesMarketConfig {
  kind: 'outcomes'
  marketType: MarketType
  baseLabel: string
  outcomes: { code: MarketOutcome; label: string }[]
  teamScoped?: boolean
}

interface PlainMarketConfig {
  kind: 'plain'
  marketType: MarketType
  baseLabel: string
}

export type MarketConfig = OverUnderMarketConfig | OutcomesMarketConfig | PlainMarketConfig

export interface MarketOption {
  /** Id stabile, es. 'TOTAL_CORNERS:OVER:8.5' | 'CARDS_1X2:HOME' | 'HANDICAP' */
  value: string
  /** Etichetta visualizzata, es. 'Corner totali Over 8.5' */
  label: string
  marketType: MarketType
  outcome?: MarketOutcome
  line?: number
  teamScoped: boolean
  baseLabel: string
  /** Parte dopo il baseLabel, es. ' Over 8.5' | ' - 1' | '' — usata per inserire '(Casa)' */
  suffix: string
}

const OUTCOMES_1X2: { code: MarketOutcome; label: string }[] = [
  { code: 'HOME', label: '1' },
  { code: 'DRAW', label: 'X' },
  { code: 'AWAY', label: '2' },
]

const MARKET_CONFIGS: MarketConfig[] = [
  // ── Voci pre-esistenti: etichette e ordine identici a prima ──
  { kind: 'outcomes', marketType: 'MATCH_1X2', baseLabel: '1X2', outcomes: OUTCOMES_1X2 },
  {
    kind: 'over_under',
    marketType: 'MATCH_OVER_UNDER',
    baseLabel: 'Under/Over',
    minLine: 0.5,
    maxLine: 3.5,
    legacyLabel: true,
  },
  {
    kind: 'outcomes',
    marketType: 'GG_NG',
    baseLabel: 'GG/NG',
    outcomes: [
      { code: 'GG', label: 'GG' },
      { code: 'NG', label: 'NG' },
    ],
  },
  {
    kind: 'outcomes',
    marketType: 'DOPPIA_CHANCE',
    baseLabel: 'Doppia Chance',
    outcomes: [
      { code: '1X', label: '1X' },
      { code: 'X2', label: 'X2' },
      { code: '12', label: '12' },
    ],
  },
  { kind: 'plain', marketType: 'HANDICAP', baseLabel: 'Handicap' },
  { kind: 'plain', marketType: 'PARZIALE_FINALE', baseLabel: 'Parziale/Finale' },
  { kind: 'plain', marketType: 'ALTRO', baseLabel: 'Altro' },
  // ── Tiri ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_SHOTS',
    baseLabel: 'Tiri totali',
    minLine: 15.5,
    maxLine: 39.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_TOTAL_SHOTS',
    baseLabel: 'Tiri totali squadra',
    minLine: 5.5,
    maxLine: 24.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TOTAL_SHOTS_ON_TARGET',
    baseLabel: 'Tiri totali in porta',
    minLine: 3.5,
    maxLine: 15.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_TOTAL_SHOTS_ON_TARGET',
    baseLabel: 'Tiri totali in porta squadra',
    minLine: 1.5,
    maxLine: 9.5,
    teamScoped: true,
  },
  // ── Falli ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_FOULS',
    baseLabel: 'Falli totali',
    minLine: 15.5,
    maxLine: 35.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_FOULS',
    baseLabel: 'Falli squadra',
    minLine: 7.5,
    maxLine: 20.5,
    teamScoped: true,
  },
  // ── Cartellini ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_CARDS',
    baseLabel: 'Cartellini totali',
    minLine: 0.5,
    maxLine: 8.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_CARDS',
    baseLabel: 'Cartellini squadra',
    minLine: 0.5,
    maxLine: 5.5,
    teamScoped: true,
  },
  {
    kind: 'outcomes',
    marketType: 'CARDS_1X2',
    baseLabel: 'Cartellini 1X2',
    outcomes: OUTCOMES_1X2,
  },
  {
    kind: 'outcomes',
    marketType: 'RED_CARD',
    baseLabel: 'Espulsione',
    outcomes: [
      { code: 'YES', label: 'Sì' },
      { code: 'NO', label: 'No' },
    ],
  },
  // ── Corner ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_CORNERS',
    baseLabel: 'Corner totali',
    minLine: 3.5,
    maxLine: 16.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_CORNERS',
    baseLabel: 'Corner squadra',
    minLine: 0.5,
    maxLine: 10.5,
    teamScoped: true,
  },
  { kind: 'outcomes', marketType: 'CORNERS_1X2', baseLabel: 'Corner 1X2', outcomes: OUTCOMES_1X2 },
]

// Aritmetica intera sui mezzi passi: i .5 sono esatti in IEEE 754, niente 16.499999
function buildLines(minLine: number, maxLine: number, step = 1): number[] {
  const lines: number[] = []
  const stepHalf = Math.round(step * 2)
  for (let h = Math.round(minLine * 2); h <= Math.round(maxLine * 2); h += stepHalf) {
    lines.push(h / 2)
  }
  return lines
}

function buildOptions(config: MarketConfig): MarketOption[] {
  switch (config.kind) {
    case 'plain':
      return [
        {
          value: config.marketType,
          label: config.baseLabel,
          marketType: config.marketType,
          teamScoped: false,
          baseLabel: config.baseLabel,
          suffix: '',
        },
      ]
    case 'outcomes':
      return config.outcomes.map((o) => ({
        value: `${config.marketType}:${o.code}`,
        label: `${config.baseLabel} - ${o.label}`,
        marketType: config.marketType,
        outcome: o.code,
        teamScoped: config.teamScoped ?? false,
        baseLabel: config.baseLabel,
        suffix: ` - ${o.label}`,
      }))
    case 'over_under': {
      const order: ('UNDER' | 'OVER')[] = config.legacyLabel ? ['UNDER', 'OVER'] : ['OVER', 'UNDER']
      return buildLines(config.minLine, config.maxLine, config.step).flatMap((line) =>
        order.map((code) => {
          const outcomeLabel = code === 'OVER' ? 'Over' : 'Under'
          const suffix = config.legacyLabel
            ? ` ${line} - ${outcomeLabel}`
            : ` ${outcomeLabel} ${line}`
          return {
            value: `${config.marketType}:${code}:${line}`,
            label: `${config.baseLabel}${suffix}`,
            marketType: config.marketType,
            outcome: code,
            line,
            teamScoped: config.teamScoped ?? false,
            baseLabel: config.baseLabel,
            suffix,
          }
        }),
      )
    }
  }
}

export const MARKET_OPTIONS: MarketOption[] = MARKET_CONFIGS.flatMap(buildOptions)

/** Voce dedicata al modale Punta-Banca (non mostrata negli altri calcolatori) */
export const PUNTA_BANCA_OPTION: MarketOption = buildOptions({
  kind: 'plain',
  marketType: 'PUNTA_BANCA',
  baseLabel: 'Punta-Banca',
})[0]

export const PUNTA_BANCA_MARKET_OPTIONS: MarketOption[] = [PUNTA_BANCA_OPTION, ...MARKET_OPTIONS]

const OPTION_BY_VALUE = new Map(PUNTA_BANCA_MARKET_OPTIONS.map((o) => [o.value, o]))

export function getMarketOption(value: string): MarketOption | undefined {
  return OPTION_BY_VALUE.get(value)
}

export function isTeamScopedMarket(value: string): boolean {
  return getMarketOption(value)?.teamScoped ?? false
}

/** Stringa finale salvata in `mercato`, es. 'Tiri totali squadra (Casa) Over 12.5' */
export function formatMercatoString(value: string, scope?: TeamScope | ''): string {
  if (!value) return ''
  const opt = getMarketOption(value)
  if (!opt) return value
  if (opt.teamScoped && scope) {
    return `${opt.baseLabel} (${TEAM_SCOPE_LABELS[scope]})${opt.suffix}`
  }
  return opt.label
}
