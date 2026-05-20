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
  azerbaigian: 'az',
  azerbajdzan: 'az',
  belgio: 'be',
  belgium: 'be',
  bielorussia: 'by',
  belarus: 'by',
  'bosnia erzegovina': 'ba',
  'bosnia ed erzegovina': 'ba',
  'bosnia and herzegovina': 'ba',
  bulgaria: 'bg',
  cipro: 'cy',
  cyprus: 'cy',
  croazia: 'hr',
  croatia: 'hr',
  danimarca: 'dk',
  denmark: 'dk',
  estonia: 'ee',
  europa: 'eu',
  europe: 'eu',
  finlandia: 'fi',
  finland: 'fi',
  francia: 'fr',
  france: 'fr',
  galles: 'gb-wls',
  wales: 'gb-wls',
  georgia: 'ge',
  germania: 'de',
  germany: 'de',
  grecia: 'gr',
  greece: 'gr',
  inghilterra: 'gb-eng',
  england: 'gb-eng',
  'irlanda del nord': 'gb-nir',
  'northern ireland': 'gb-nir',
  'irlanda del nord amatori': 'gb-nir',
  irlanda: 'ie',
  ireland: 'ie',
  islanda: 'is',
  iceland: 'is',
  'isole faroe': 'fo',
  'faroe islands': 'fo',
  italia: 'it',
  italy: 'it',
  kazakistan: 'kz',
  kazakhstan: 'kz',
  kosovo: 'xk',
  lettonia: 'lv',
  latvia: 'lv',
  liechtenstein: 'li',
  lituania: 'lt',
  lithuania: 'lt',
  lussemburgo: 'lu',
  luxembourg: 'lu',
  'macedonia del nord': 'mk',
  'north macedonia': 'mk',
  malta: 'mt',
  moldavia: 'md',
  moldova: 'md',
  montenegro: 'me',
  norvegia: 'no',
  norway: 'no',
  olanda: 'nl',
  'paesi bassi': 'nl',
  netherlands: 'nl',
  polonia: 'pl',
  poland: 'pl',
  portogallo: 'pt',
  portugal: 'pt',
  'repubblica ceca': 'cz',
  'rep. ceca': 'cz',
  'czech republic': 'cz',
  cechia: 'cz',
  romania: 'ro',
  russia: 'ru',
  'san marino': 'sm',
  scozia: 'gb-sct',
  scotland: 'gb-sct',
  serbia: 'rs',
  slovacchia: 'sk',
  slovakia: 'sk',
  slovenia: 'si',
  spagna: 'es',
  spain: 'es',
  svezia: 'se',
  sweden: 'se',
  svizzera: 'ch',
  switzerland: 'ch',
  turchia: 'tr',
  turkey: 'tr',
  ucraina: 'ua',
  ukraine: 'ua',
  ungheria: 'hu',
  hungary: 'hu',

  // --- Americas ---
  argentina: 'ar',
  bolivia: 'bo',
  brasile: 'br',
  brazil: 'br',
  canada: 'ca',
  cile: 'cl',
  chile: 'cl',
  colombia: 'co',
  'costa rica': 'cr',
  cuba: 'cu',
  ecuador: 'ec',
  'el salvador': 'sv',
  giamaica: 'jm',
  jamaica: 'jm',
  guatemala: 'gt',
  honduras: 'hn',
  messico: 'mx',
  mexico: 'mx',
  panama: 'pa',
  paraguay: 'py',
  peru: 'pe',
  'porto rico': 'pr',
  'puerto rico': 'pr',
  'stati uniti': 'us',
  'united states': 'us',
  america: 'us',
  uruguay: 'uy',
  usa: 'us',
  venezuela: 've',

  // --- Asia ---
  'arabia saudita': 'sa',
  'saudi arabia': 'sa',
  cina: 'cn',
  china: 'cn',
  'corea del sud': 'kr',
  'south korea': 'kr',
  'emirati arabi': 'ae',
  uae: 'ae',
  filippine: 'ph',
  philippines: 'ph',
  giappone: 'jp',
  japan: 'jp',
  'hong kong': 'hk',
  india: 'in',
  indonesia: 'id',
  israele: 'il',
  israel: 'il',
  malesia: 'my',
  malaysia: 'my',
  bahrain: 'bh',
  bahrein: 'bh',
  oman: 'om',
  qatar: 'qa',
  singapore: 'sg',
  taiwan: 'tw',
  thailandia: 'th',
  thailand: 'th',
  uzbekistan: 'uz',
  vietnam: 'vn',

  // --- Africa ---
  algeria: 'dz',
  algerie: 'dz',
  egitto: 'eg',
  egypt: 'eg',
  ghana: 'gh',
  kenya: 'ke',
  marocco: 'ma',
  morocco: 'ma',
  nigeria: 'ng',
  sudafrica: 'za',
  'south africa': 'za',
  tunisia: 'tn',
  zambia: 'zm',

  // --- Oceania ---
  australia: 'au',
  'nuova zelanda': 'nz',
  'new zealand': 'nz',
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

/**
 * Returns the flagcdn.com SVG URL directly from an ISO alpha-2 code,
 * bypassing the name map. Useful as a fallback when the category name
 * is an ISO code or an unmapped variant.
 */
export function getCountryFlagUrlFromIso(iso2: string | null | undefined): string | null {
  if (!iso2) return null
  const code = iso2.toLowerCase().trim()
  return code ? `https://flagcdn.com/${code}.svg` : null
}

const _italianDisplayNames = (() => {
  try {
    return new Intl.DisplayNames(['it'], { type: 'region' })
  } catch {
    return null
  }
})()

/**
 * Returns the Italian ICU display name for an ISO alpha-2 code (e.g. "IT" → "Italia").
 * Falls back to null for unknown or synthetic codes. Used to resolve category names
 * that are stored as bare ISO codes in the database.
 */
export function getItalianCountryName(iso2: string | null | undefined): string | null {
  if (!iso2 || !_italianDisplayNames) return null
  try {
    const name = _italianDisplayNames.of(iso2.toUpperCase())
    return name && name !== iso2.toUpperCase() ? name : null
  } catch {
    return null
  }
}
