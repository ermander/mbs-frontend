// =====================================================================
// Country flag resolution helper
//
// Maps the Italian country / category names returned by Sisal's
// classificationMap (after our titleCaseItalian normalization) to
// ISO 3166-1 alpha-2 codes used by https://flagcdn.com.
//
// The lookup is case- and accent-insensitive. Returns `null` for
// entries that don't have a flag (continents, regions, special
// categories, or unmapped names) — the caller is responsible for the
// visual fallback (empty slot, globe icon, etc.).
//
// Extend the map whenever a new nation appears in Sisal's data (or any
// future bookmaker with Italian labels).
// =====================================================================

/** Italian nation name → ISO alpha-2 (flagcdn) code. Keys are normalized. */
const COUNTRY_ISO_MAP: Record<string, string> = {
  // --- Europe ---
  albania: 'al',
  andorra: 'ad',
  armenia: 'am',
  austria: 'at',
  azerbaijan: 'az',
  belgio: 'be',
  bielorussia: 'by',
  'bosnia erzegovina': 'ba',
  bulgaria: 'bg',
  cipro: 'cy',
  croazia: 'hr',
  danimarca: 'dk',
  estonia: 'ee',
  europa: 'eu',
  finlandia: 'fi',
  francia: 'fr',
  galles: 'gb-wls',
  georgia: 'ge',
  germania: 'de',
  grecia: 'gr',
  inghilterra: 'gb-eng',
  'irlanda del nord': 'gb-nir',
  irlanda: 'ie',
  islanda: 'is',
  'isole faroe': 'fo',
  italia: 'it',
  kazakistan: 'kz',
  kosovo: 'xk',
  lettonia: 'lv',
  liechtenstein: 'li',
  lituania: 'lt',
  lussemburgo: 'lu',
  'macedonia del nord': 'mk',
  malta: 'mt',
  moldavia: 'md',
  montenegro: 'me',
  norvegia: 'no',
  olanda: 'nl',
  polonia: 'pl',
  portogallo: 'pt',
  'repubblica ceca': 'cz',
  romania: 'ro',
  russia: 'ru',
  'san marino': 'sm',
  scozia: 'gb-sct',
  serbia: 'rs',
  slovacchia: 'sk',
  slovenia: 'si',
  spagna: 'es',
  svezia: 'se',
  svizzera: 'ch',
  turchia: 'tr',
  ucraina: 'ua',
  ungheria: 'hu',

  // --- Americas ---
  argentina: 'ar',
  bolivia: 'bo',
  brasile: 'br',
  canada: 'ca',
  cile: 'cl',
  colombia: 'co',
  'costa rica': 'cr',
  ecuador: 'ec',
  'el salvador': 'sv',
  giamaica: 'jm',
  guatemala: 'gt',
  honduras: 'hn',
  messico: 'mx',
  panama: 'pa',
  paraguay: 'py',
  peru: 'pe',
  'porto rico': 'pr',
  uruguay: 'uy',
  usa: 'us',
  venezuela: 've',

  // --- Asia ---
  'arabia saudita': 'sa',
  cina: 'cn',
  'corea del sud': 'kr',
  'emirati arabi': 'ae',
  filippine: 'ph',
  giappone: 'jp',
  'hong kong': 'hk',
  india: 'in',
  indonesia: 'id',
  israele: 'il',
  malesia: 'my',
  oman: 'om',
  qatar: 'qa',
  singapore: 'sg',
  taiwan: 'tw',
  thailandia: 'th',
  uzbekistan: 'uz',
  vietnam: 'vn',

  // --- Africa ---
  egitto: 'eg',
  ghana: 'gh',
  kenya: 'ke',
  marocco: 'ma',
  nigeria: 'ng',
  sudafrica: 'za',
  tunisia: 'tn',
  zambia: 'zm',

  // --- Oceania ---
  australia: 'au',
  'nuova zelanda': 'nz',
}

/**
 * Normalize a free-text nation name to the map's key format:
 * lowercase, stripped of accents, apostrophes and extra whitespace.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns the ISO alpha-2 code (e.g. 'it', 'fr', 'gb-eng', 'eu') for
 * a Sisal-style Italian nation name, or `null` if the entry is a
 * continent / special group / unmapped value.
 */
export function getCountryIso(name: string | null | undefined): string | null {
  if (!name) return null
  const key = normalize(name)
  return COUNTRY_ISO_MAP[key] ?? null
}

/**
 * Returns the full flagcdn.com SVG URL for a given Italian nation name,
 * or `null` if no flag is available. The caller should render an empty
 * placeholder in the null case to keep horizontal alignment.
 */
export function getCountryFlagUrl(name: string | null | undefined): string | null {
  const iso = getCountryIso(name)
  if (!iso) return null
  return `https://flagcdn.com/${iso}.svg`
}
