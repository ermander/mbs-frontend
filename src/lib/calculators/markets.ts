// Configurazione centralizzata dei mercati per i calcolatori offline.
// Le voci della dropdown (MARKET_OPTIONS) sono generate da MARKET_CONFIGS:
// per aggiungere/estendere un mercato basta modificare la config.
//
// Formato delle etichette (e della stringa salvata in `mercato`):
//   '<simbolo sport> <GRUPPO IN MAIUSCOLO> <esito>'   es. '⚽ CORNER Under 3.5', '⚽ 1X2 1'
// Il gruppo è il nome del mercato; per i mercati "squadra" lo scope va tra gruppo ed esito:
//   '⚽ TIRI SQUADRA (Casa) Over 10.5'
// Gli id (`value`) restano stabili anche se cambia l'etichetta.

export type TeamScope = 'CASA' | 'OSPITE'

export const TEAM_SCOPE_LABELS: Record<TeamScope, string> = {
  CASA: 'Casa',
  OSPITE: 'Ospite',
}

/** Sport di riferimento di un mercato; `null` per le voci generiche (Altro, Punta-Banca) */
export type MarketSport = 'calcio' | 'tennis' | 'basket'

export const MARKET_SPORT_ICONS: Record<MarketSport, string> = {
  calcio: '⚽',
  tennis: '🎾',
  basket: '🏀',
}

export type MarketType =
  | 'MATCH_1X2'
  | 'MATCH_OVER_UNDER'
  | 'FIRST_HALF_GOALS'
  | 'SECOND_HALF_GOALS'
  | 'TEAM_TOTAL_GOALS'
  | 'TEAM_FIRST_HALF_GOALS'
  | 'TEAM_SECOND_HALF_GOALS'
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
  | 'SHOTS_ON_TARGET_1X2'
  | 'SHOTS_1X2'
  | 'TOTAL_FOULS'
  | 'TEAM_FOULS'
  | 'TOTAL_CARDS'
  | 'FIRST_HALF_CARDS'
  | 'SECOND_HALF_CARDS'
  | 'TEAM_CARDS'
  | 'CARDS_1X2'
  | 'RED_CARD'
  | 'TOTAL_CORNERS'
  | 'FIRST_HALF_CORNERS'
  | 'SECOND_HALF_CORNERS'
  | 'TEAM_CORNERS'
  | 'TEAM_FIRST_HALF_CORNERS'
  | 'TEAM_SECOND_HALF_CORNERS'
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

interface BaseMarketConfig {
  marketType: MarketType
  /** Nome del gruppo, in maiuscolo: 'CORNER', 'TIRI IN PORTA 1X2' */
  baseLabel: string
  sport: MarketSport | null
}

interface OverUnderMarketConfig extends BaseMarketConfig {
  kind: 'over_under'
  minLine: number
  maxLine: number
  /** Passo tra le linee (default 1: 8.5, 9.5, 10.5, ...) */
  step?: number
  teamScoped?: boolean
}

interface OutcomesMarketConfig extends BaseMarketConfig {
  kind: 'outcomes'
  outcomes: { code: MarketOutcome; label: string }[]
  teamScoped?: boolean
}

interface PlainMarketConfig extends BaseMarketConfig {
  kind: 'plain'
}

export type MarketConfig = OverUnderMarketConfig | OutcomesMarketConfig | PlainMarketConfig

export interface MarketOption {
  /** Id stabile, es. 'TOTAL_CORNERS:OVER:8.5' | 'CARDS_1X2:HOME' | 'HANDICAP' */
  value: string
  /** Etichetta visualizzata e salvata, es. '⚽ CORNER Over 8.5' */
  label: string
  marketType: MarketType
  outcome?: MarketOutcome
  line?: number
  teamScoped: boolean
  sport: MarketSport | null
  /** Prefisso con il simbolo dello sport, es. '⚽ ' ('' per le voci generiche) */
  iconPrefix: string
  /** Gruppo senza simbolo, es. 'CORNER' */
  baseLabel: string
  /** Parte dopo il baseLabel, es. ' Over 8.5' | ' 1' | '' — usata per inserire '(Casa)' */
  suffix: string
}

const OUTCOMES_1X2: { code: MarketOutcome; label: string }[] = [
  { code: 'HOME', label: '1' },
  { code: 'DRAW', label: 'X' },
  { code: 'AWAY', label: '2' },
]

const MARKET_CONFIGS: MarketConfig[] = [
  // ── Esiti principali ──
  {
    kind: 'outcomes',
    marketType: 'MATCH_1X2',
    baseLabel: '1X2',
    sport: 'calcio',
    outcomes: OUTCOMES_1X2,
  },
  {
    kind: 'over_under',
    marketType: 'MATCH_OVER_UNDER',
    baseLabel: 'GOL',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 3.5,
  },
  {
    kind: 'over_under',
    marketType: 'FIRST_HALF_GOALS',
    baseLabel: 'GOL 1° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 3.5,
  },
  {
    kind: 'over_under',
    marketType: 'SECOND_HALF_GOALS',
    baseLabel: 'GOL 2° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 3.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_TOTAL_GOALS',
    baseLabel: 'GOL SQUADRA',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 4.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_FIRST_HALF_GOALS',
    baseLabel: 'GOL SQUADRA 1° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 2.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_SECOND_HALF_GOALS',
    baseLabel: 'GOL SQUADRA 2° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 2.5,
    teamScoped: true,
  },
  {
    kind: 'outcomes',
    marketType: 'GG_NG',
    baseLabel: 'GG/NG',
    sport: 'calcio',
    outcomes: [
      { code: 'GG', label: 'GG' },
      { code: 'NG', label: 'NG' },
    ],
  },
  {
    kind: 'outcomes',
    marketType: 'DOPPIA_CHANCE',
    baseLabel: 'DOPPIA CHANCE',
    sport: 'calcio',
    outcomes: [
      { code: '1X', label: '1X' },
      { code: 'X2', label: 'X2' },
      { code: '12', label: '12' },
    ],
  },
  { kind: 'plain', marketType: 'HANDICAP', baseLabel: 'HANDICAP', sport: 'calcio' },
  { kind: 'plain', marketType: 'PARZIALE_FINALE', baseLabel: 'PARZIALE/FINALE', sport: 'calcio' },
  { kind: 'plain', marketType: 'ALTRO', baseLabel: 'ALTRO', sport: null },
  // ── Tiri ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_SHOTS',
    baseLabel: 'TIRI',
    sport: 'calcio',
    minLine: 15.5,
    maxLine: 39.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_TOTAL_SHOTS',
    baseLabel: 'TIRI SQUADRA',
    sport: 'calcio',
    minLine: 5.5,
    maxLine: 24.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TOTAL_SHOTS_ON_TARGET',
    baseLabel: 'TIRI IN PORTA',
    sport: 'calcio',
    minLine: 3.5,
    maxLine: 15.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_TOTAL_SHOTS_ON_TARGET',
    baseLabel: 'TIRI IN PORTA SQUADRA',
    sport: 'calcio',
    minLine: 1.5,
    maxLine: 9.5,
    teamScoped: true,
  },
  {
    kind: 'outcomes',
    marketType: 'SHOTS_ON_TARGET_1X2',
    baseLabel: 'TIRI IN PORTA 1X2',
    sport: 'calcio',
    outcomes: OUTCOMES_1X2,
  },
  {
    kind: 'outcomes',
    marketType: 'SHOTS_1X2',
    baseLabel: 'TIRI 1X2',
    sport: 'calcio',
    outcomes: OUTCOMES_1X2,
  },
  // ── Falli ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_FOULS',
    baseLabel: 'FALLI',
    sport: 'calcio',
    minLine: 15.5,
    maxLine: 35.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_FOULS',
    baseLabel: 'FALLI SQUADRA',
    sport: 'calcio',
    minLine: 7.5,
    maxLine: 20.5,
    teamScoped: true,
  },
  // ── Cartellini ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_CARDS',
    baseLabel: 'CARTELLINI',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 8.5,
  },
  {
    kind: 'over_under',
    marketType: 'FIRST_HALF_CARDS',
    baseLabel: 'CARTELLINI 1° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 4.5,
  },
  {
    kind: 'over_under',
    marketType: 'SECOND_HALF_CARDS',
    baseLabel: 'CARTELLINI 2° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 4.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_CARDS',
    baseLabel: 'CARTELLINI SQUADRA',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 5.5,
    teamScoped: true,
  },
  {
    kind: 'outcomes',
    marketType: 'CARDS_1X2',
    baseLabel: 'CARTELLINI 1X2',
    sport: 'calcio',
    outcomes: OUTCOMES_1X2,
  },
  {
    kind: 'outcomes',
    marketType: 'RED_CARD',
    baseLabel: 'ESPULSIONE',
    sport: 'calcio',
    outcomes: [
      { code: 'YES', label: 'Sì' },
      { code: 'NO', label: 'No' },
    ],
  },
  // ── Corner ──
  {
    kind: 'over_under',
    marketType: 'TOTAL_CORNERS',
    baseLabel: 'CORNER',
    sport: 'calcio',
    minLine: 3.5,
    maxLine: 16.5,
  },
  {
    kind: 'over_under',
    marketType: 'FIRST_HALF_CORNERS',
    baseLabel: 'CORNER 1° TEMPO',
    sport: 'calcio',
    minLine: 1.5,
    maxLine: 8.5,
  },
  {
    kind: 'over_under',
    marketType: 'SECOND_HALF_CORNERS',
    baseLabel: 'CORNER 2° TEMPO',
    sport: 'calcio',
    minLine: 1.5,
    maxLine: 8.5,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_CORNERS',
    baseLabel: 'CORNER SQUADRA',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 10.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_FIRST_HALF_CORNERS',
    baseLabel: 'CORNER SQUADRA 1° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 5.5,
    teamScoped: true,
  },
  {
    kind: 'over_under',
    marketType: 'TEAM_SECOND_HALF_CORNERS',
    baseLabel: 'CORNER SQUADRA 2° TEMPO',
    sport: 'calcio',
    minLine: 0.5,
    maxLine: 5.5,
    teamScoped: true,
  },
  {
    kind: 'outcomes',
    marketType: 'CORNERS_1X2',
    baseLabel: 'CORNER 1X2',
    sport: 'calcio',
    outcomes: OUTCOMES_1X2,
  },
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

function iconPrefixFor(sport: MarketSport | null): string {
  return sport ? `${MARKET_SPORT_ICONS[sport]} ` : ''
}

function buildOptions(config: MarketConfig): MarketOption[] {
  const iconPrefix = iconPrefixFor(config.sport)
  const common = {
    marketType: config.marketType,
    sport: config.sport,
    iconPrefix,
    baseLabel: config.baseLabel,
  }
  switch (config.kind) {
    case 'plain':
      return [
        {
          ...common,
          value: config.marketType,
          label: `${iconPrefix}${config.baseLabel}`,
          teamScoped: false,
          suffix: '',
        },
      ]
    case 'outcomes':
      return config.outcomes.map((o) => ({
        ...common,
        value: `${config.marketType}:${o.code}`,
        label: `${iconPrefix}${config.baseLabel} ${o.label}`,
        outcome: o.code,
        teamScoped: config.teamScoped ?? false,
        suffix: ` ${o.label}`,
      }))
    case 'over_under':
      return buildLines(config.minLine, config.maxLine, config.step).flatMap((line) =>
        (['OVER', 'UNDER'] as const).map((code) => {
          const suffix = ` ${code === 'OVER' ? 'Over' : 'Under'} ${line}`
          return {
            ...common,
            value: `${config.marketType}:${code}:${line}`,
            label: `${iconPrefix}${config.baseLabel}${suffix}`,
            outcome: code,
            line,
            teamScoped: config.teamScoped ?? false,
            suffix,
          }
        }),
      )
  }
}

export const MARKET_OPTIONS: MarketOption[] = MARKET_CONFIGS.flatMap(buildOptions)

/** Voce dedicata al modale Punta-Banca (non mostrata negli altri calcolatori) */
export const PUNTA_BANCA_OPTION: MarketOption = buildOptions({
  kind: 'plain',
  marketType: 'PUNTA_BANCA',
  baseLabel: 'Punta-Banca',
  sport: null,
})[0]

export const PUNTA_BANCA_MARKET_OPTIONS: MarketOption[] = [PUNTA_BANCA_OPTION, ...MARKET_OPTIONS]

const OPTION_BY_VALUE = new Map(PUNTA_BANCA_MARKET_OPTIONS.map((o) => [o.value, o]))

export function getMarketOption(value: string): MarketOption | undefined {
  return OPTION_BY_VALUE.get(value)
}

export function isTeamScopedMarket(value: string): boolean {
  return getMarketOption(value)?.teamScoped ?? false
}

/** Stringa finale salvata in `mercato`, es. '⚽ TIRI SQUADRA (Casa) Over 12.5' */
export function formatMercatoString(value: string, scope?: TeamScope | ''): string {
  if (!value) return ''
  const opt = getMarketOption(value)
  if (!opt) return value
  if (opt.teamScoped && scope) {
    return `${opt.iconPrefix}${opt.baseLabel} (${TEAM_SCOPE_LABELS[scope]})${opt.suffix}`
  }
  return opt.label
}
