/**
 * Backoffice pages of the mock that server.js did not serve yet (§14.365): sport mappings,
 * matchings, review queue, Palinsesto API-Football, «Competizioni da leggere» and the scraper
 * drill-down, with the shapes of the backend DTOs (services/api/backoffice-*-client.ts). Data
 * lives in memory and is made up: enough rows to see every state of the pages, not a copy of prod.
 */
const DAY = 86_400_000

const iso = (ms) => new Date(ms).toISOString()

/** A kickoff `d` days from now at hh:mm local time. */
function kickoff(now, d, hour, minute = 0) {
  const t = new Date(now + d * DAY)
  t.setHours(hour, minute, 0, 0)
  return t.toISOString()
}

const SPORTS = [
  { id: 's-football', name: 'Calcio', slug: 'football', sportKey: 'football', status: 'active' },
  { id: 's-basket', name: 'Basket', slug: 'basketball', sportKey: 'basketball', status: 'active' },
  { id: 's-tennis', name: 'Tennis', slug: 'tennis', sportKey: null, status: 'active' },
  {
    id: 's-volley',
    name: 'Pallavolo',
    slug: 'volleyball',
    sportKey: 'volleyball',
    status: 'inactive',
  },
]

const CATEGORIES = [
  { id: 'cat-it', sportId: 's-football', name: 'Italia', countryCode: 'IT' },
  { id: 'cat-en', sportId: 's-football', name: 'Inghilterra', countryCode: 'GB' },
  { id: 'cat-es', sportId: 's-football', name: 'Spagna', countryCode: 'ES' },
  { id: 'cat-de', sportId: 's-football', name: 'Germania', countryCode: 'DE' },
  { id: 'cat-world', sportId: 's-football', name: 'Mondo', countryCode: null },
  { id: 'cat-it-b', sportId: 's-basket', name: 'Italia', countryCode: 'IT' },
  { id: 'cat-eu-b', sportId: 's-basket', name: 'Europa', countryCode: null },
]

const COMPETITIONS = [
  { id: 'c-seriea', categoryId: 'cat-it', name: 'Serie A', league: 135, scrape: true },
  { id: 'c-serieb', categoryId: 'cat-it', name: 'Serie B', league: 136, scrape: true },
  { id: 'c-coppait', categoryId: 'cat-it', name: 'Coppa Italia', league: 137, scrape: false },
  { id: 'c-pl', categoryId: 'cat-en', name: 'Premier League', league: 39, scrape: true },
  { id: 'c-champ', categoryId: 'cat-en', name: 'Championship', league: 40, scrape: false },
  { id: 'c-liga', categoryId: 'cat-es', name: 'LaLiga', league: 140, scrape: true },
  { id: 'c-bund', categoryId: 'cat-de', name: 'Bundesliga', league: 78, scrape: true },
  { id: 'c-ucl', categoryId: 'cat-world', name: 'UEFA Champions League', league: 2, scrape: true },
  { id: 'c-lba', categoryId: 'cat-it-b', name: 'Serie A basket', league: 52, scrape: true },
  { id: 'c-euro', categoryId: 'cat-eu-b', name: 'Eurolega', league: 120, scrape: false },
]

const PAIRS = {
  'c-seriea': [
    ['Milan', 'Inter'],
    ['Juventus', 'Napoli'],
    ['Roma', 'Lazio'],
    ['Atalanta', 'Fiorentina'],
    ['Bologna', 'Torino'],
    ['Genoa', 'Como'],
  ],
  'c-serieb': [
    ['Palermo', 'Sampdoria'],
    ['Bari', 'Spezia'],
    ['Modena', 'Cesena'],
  ],
  'c-coppait': [['Udinese', 'Verona']],
  'c-pl': [
    ['Arsenal', 'Chelsea'],
    ['Liverpool', 'Manchester City'],
    ['Tottenham', 'Newcastle'],
    ['Aston Villa', 'Brighton'],
  ],
  'c-champ': [
    ['Leeds', 'Sunderland'],
    ['Norwich', 'Hull City'],
  ],
  'c-liga': [
    ['Real Madrid', 'Barcellona'],
    ['Atletico Madrid', 'Siviglia'],
    ['Valencia', 'Betis'],
  ],
  'c-bund': [
    ['Bayern Monaco', 'Dortmund'],
    ['Leverkusen', 'Lipsia'],
  ],
  'c-ucl': [
    ['PSG', 'Benfica'],
    ['Porto', 'Ajax'],
  ],
  'c-lba': [
    ['Olimpia Milano', 'Virtus Bologna'],
    ['Venezia', 'Tortona'],
  ],
  'c-euro': [['Fenerbahce', 'Real Madrid']],
}

const STATUS_CYCLE = [
  'scheduled',
  'scheduled',
  'scheduled',
  'scheduled',
  'live',
  'postponed',
  'scheduled',
  'rescheduled',
]
const PROVIDER_STATUS = {
  scheduled: 'NS',
  live: '1H',
  postponed: 'PST',
  rescheduled: 'TBD',
  closed: 'FT',
  cancelled: 'CANC',
}

const BOOKMAKERS = [
  { id: 'b-sisal', slug: 'sisal', name: 'Sisal (PokerStars · Snai)' },
  { id: 'b-bwin', slug: 'bwin', name: 'Bwin (Gioco Digitale)' },
  { id: 'b-betsson', slug: 'betsson', name: 'Betsson (StarCasinò)' },
  { id: 'b-bet365', slug: 'bet365', name: 'Bet365' },
  { id: 'b-goldbet', slug: 'goldbet', name: 'GoldBet (Lottomatica · PlanetWin365 · BetFlag)' },
]

const MATCH_STATUSES = [
  'auto_confirmed',
  'auto_confirmed',
  'high_confidence',
  'review_needed',
  'manual_confirmed',
  'rejected',
]
const MATCH_METHODS = [
  'exact_name_time',
  'fuzzy',
  'alias',
  'exact_name_day',
  'manual',
  'fuzzy_inverted',
]

/** The fixtures of the catalog, rebuilt once at start: a couple a day for every competition. */
function buildFixtures(now) {
  const rows = []
  let n = 0
  for (const comp of COMPETITIONS) {
    const cat = CATEGORIES.find((c) => c.id === comp.categoryId)
    const sport = SPORTS.find((s) => s.id === cat.sportId)
    PAIRS[comp.id].forEach(([home, away], i) => {
      const d = ((i * 2 + n) % 9) - 1 // from yesterday to 7 days ahead
      const status = d < 0 ? 'closed' : STATUS_CYCLE[n % STATUS_CYCLE.length]
      const mapped = comp.scrape ? (n % 4) + 1 : 0
      rows.push({
        eventId: `ev-pal-${n + 1}`,
        apisportsFixtureId: 1_380_000 + n * 37,
        startTime: kickoff(now, d, [15, 18, 20, 21][n % 4], [0, 30, 45][n % 3]),
        status,
        providerStatus: PROVIDER_STATUS[status],
        sportName: sport.name,
        sportSlug: sport.slug,
        categoryId: cat.id,
        categoryName: cat.name,
        countryCode: cat.countryCode,
        competitionId: comp.id,
        competitionName: comp.name,
        apisportsLeagueId: comp.league,
        seasonYear: 2026,
        round: sport.slug === 'football' ? `Regular Season - ${12 + (n % 5)}` : null,
        venue: n % 3 === 0 ? null : `Stadio ${home}`,
        homeName: home,
        awayName: away,
        homeApisportsTeamId: 400 + n * 2,
        awayApisportsTeamId: 401 + n * 2,
        firstSeenAt: iso(now - 40 * DAY),
        lastSeenAt: iso(now - ((n % 6) + 1) * 3_600_000),
        bookmakersMapped: mapped,
        bookmakersWithOdds: Math.max(0, mapped - (n % 2)),
      })
      n += 1
    })
  }
  return rows.sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function createBackofficeMock(now) {
  const fixtures = buildFixtures(now)
  const fixtureById = new Map(fixtures.map((f) => [f.eventId, f]))

  const mappings = []
  for (const b of BOOKMAKERS) {
    mappings.push({
      sport: SPORTS[0],
      b,
      code: b.slug === 'bwin' ? '4' : b.slug === 'bet365' ? '1' : 'CALCIO',
      name: b.slug === 'bwin' ? 'Football' : 'Calcio',
    })
    if (b.slug !== 'bet365' && b.slug !== 'goldbet')
      mappings.push({
        sport: SPORTS[1],
        b,
        code: b.slug === 'bwin' ? '7' : 'BASKET',
        name: 'Basket',
      })
    if (b.slug === 'sisal' || b.slug === 'betsson')
      mappings.push({
        sport: SPORTS[2],
        b,
        code: b.slug === 'sisal' ? 'TENNIS' : 'tennis',
        name: null,
      })
  }
  const SPORT_MAPPINGS = mappings.map((m, i) => ({
    id: `sm-${i + 1}`,
    sport_id: m.sport.id,
    bookmaker_id: m.b.id,
    bookmaker_sport_code: m.code,
    bookmaker_sport_name: m.name,
    sport_name: m.sport.name,
    bookmaker_name: m.b.name,
    bookmaker_slug: m.b.slug,
    created_at: iso(now - 90 * DAY),
    updated_at: iso(now - 10 * DAY),
  }))

  /** One matching per bookmaker on the first fixtures with a mapping. */
  const MATCHINGS = []
  fixtures
    .filter((f) => f.bookmakersMapped > 0)
    .forEach((f, i) => {
      BOOKMAKERS.slice(0, f.bookmakersMapped).forEach((b, j) => {
        const k = i + j
        MATCHINGS.push({
          id: `m-${MATCHINGS.length + 1}`,
          eventId: f.eventId,
          matchStatus: MATCH_STATUSES[k % MATCH_STATUSES.length],
          matchMethod: MATCH_METHODS[k % MATCH_METHODS.length],
          matchConfidence: [1, 0.97, 0.91, 0.78, 1, 0.62][k % 6],
          matchedAt: iso(now - (k + 1) * 1_800_000),
          reviewedBy: k % 6 === 4 ? 'admin' : null,
          reviewedAt: k % 6 === 4 ? iso(now - k * 600_000) : null,
          bookmakerSlug: b.slug,
          bookmakerName: b.name,
          bookmakerHomeName: j % 2 ? f.homeName.toUpperCase() : f.homeName,
          bookmakerAwayName: j % 2 ? f.awayName.toUpperCase() : f.awayName,
          bookmakerCompetitionName:
            j % 2 ? `${f.categoryName} - ${f.competitionName}` : f.competitionName,
          canonicalHome: f.homeName,
          canonicalAway: f.awayName,
          competitionName: f.competitionName,
          sportName: f.sportName,
          startTime: f.startTime,
          eventConfirmationStatus: 'confirmed',
        })
      })
    })

  const REVIEW_QUEUE = [
    ['bwin', 'Pisa', 'Cremonese', 'Serie B', 'Italia', 'Calcio', 1],
    ['sisal', 'AZ Alkmaar', 'Twente', 'Eredivisie', 'Olanda', 'Calcio', 2],
    ['betsson', 'Hapoel Tel Aviv', 'Maccabi Haifa', "Ligat ha'Al", 'Israele', 'Calcio', 2],
    ['goldbet', 'Partizan', 'Stella Rossa', 'ABA League', 'Serbia', 'Basket', 3],
    ['bwin', 'Al Hilal', 'Al Nassr', 'Saudi Pro League', 'Arabia Saudita', 'Calcio', 4],
  ].map(([slug, home, away, comp, country, sport, d], i) => ({
    id: `rq-${i + 1}`,
    bookmakerId: `b-${slug}`,
    bookmakerSlug: slug,
    scraperRunId: null,
    bookmakerExternalId: `${slug.toUpperCase()}-${88_000 + i * 13}`,
    bookmakerHomeName: home,
    bookmakerAwayName: away,
    bookmakerCompetitionName: comp,
    bookmakerCountryName: country,
    bookmakerSportName: sport,
    startTime: kickoff(now, d, 19, 30),
    rawEventPayload: {},
    status: i === 4 ? 'rejected' : 'pending',
    resolvedEventId: null,
    resolvedBy: i === 4 ? 'admin' : null,
    resolvedAt: i === 4 ? iso(now - 7_200_000) : null,
    createdAt: iso(now - (i + 1) * 3_600_000),
  }))

  const budget = {
    date: iso(now).slice(0, 10),
    callsUsed: 1240,
    planDailyLimit: 7500,
    lastCallAt: iso(now - 600_000),
  }
  const lastRuns = [
    ['football', 'catalog', 'success', 2 * DAY, { leaguesSynced: 42 }],
    ['football', 'fixtures', 'success', 6 * 3_600_000, { fixturesUpserted: 1830 }],
    ['football', 'fixtures_near', 'success', 3_600_000, { fixturesUpserted: 312 }],
    ['football', 'status', 'success', 900_000, { fixturesUpdated: 28 }],
    [
      'basketball',
      'fixtures',
      'failed',
      5 * 3_600_000,
      { error: 'api-sports: 429 Too Many Requests' },
    ],
  ].map(([sportKey, runType, status, agoMs, extra]) => ({
    sportKey,
    runType,
    status,
    startedAt: iso(now - agoMs - 40_000),
    completedAt: iso(now - agoMs),
    leaguesSynced: 0,
    fixturesUpserted: 0,
    fixturesUpdated: 0,
    apiCallsUsed: runType === 'catalog' ? 6 : 24,
    error: null,
    ...extra,
  }))

  const compOf = (id) => COMPETITIONS.find((c) => c.id === id)
  const catOf = (id) => CATEGORIES.find((c) => c.id === id)

  /** The filters the tree and the fixture list share (window, sport, status, search). */
  function filterFixtures(params) {
    const from = params.get('from')
    const to = params.get('to')
    const sport = params.get('sport')
    const status = params.get('status')
    const q = (params.get('q') ?? '').toLowerCase()
    const includePast = params.get('includePast') === 'true'
    const lower = from ? Date.parse(from) : includePast ? -Infinity : now - (now % DAY)
    return fixtures.filter((f) => {
      const t = Date.parse(f.startTime)
      if (t < lower) return false
      if (to && t >= Date.parse(to)) return false
      if (sport && f.sportSlug !== sport) return false
      if (status && f.status !== status) return false
      if (
        q &&
        !`${f.homeName} ${f.awayName} ${f.competitionName} ${f.apisportsFixtureId}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }

  function filtersDto(params) {
    const get = (k) => params.get(k) || null
    return {
      from: get('from'),
      to: get('to'),
      sportSlug: get('sport'),
      categoryId: get('categoryId'),
      competitionId: get('competitionId'),
      status: get('status'),
      q: get('q'),
    }
  }

  function summary() {
    const future = fixtures.filter((f) => Date.parse(f.startTime) >= now)
    const sports = SPORTS.filter((s) => s.sportKey).map((s) => {
      const all = fixtures.filter((f) => f.sportSlug === s.slug)
      const fut = all.filter((f) => Date.parse(f.startTime) >= now)
      const comps = COMPETITIONS.filter((c) => catOf(c.categoryId).sportId === s.id)
      return {
        sportId: s.id,
        sportName: s.name,
        sportSlug: s.slug,
        sportKey: s.sportKey,
        competitions: comps.length,
        competitionsScrapeEnabled: comps.filter((c) => c.scrape).length,
        competitionsWithFutureFixtures: new Set(fut.map((f) => f.competitionId)).size,
        fixturesTotal: all.length * 40,
        fixturesFuture: fut.length,
        fixturesNext7Days: fut.filter((f) => Date.parse(f.startTime) < now + 7 * DAY).length,
        firstStartTime: all[0]?.startTime ?? null,
        lastStartTime: all[all.length - 1]?.startTime ?? null,
        lastSeenAt: iso(now - 1_800_000),
      }
    })
    const byStatus = new Map()
    for (const f of future) {
      const key = `${f.status}|${f.providerStatus}`
      byStatus.set(key, {
        status: f.status,
        providerStatus: f.providerStatus,
        count: (byStatus.get(key)?.count ?? 0) + 1,
      })
    }
    return {
      now: iso(Date.now()),
      sports,
      totals: {
        fixturesTotal: fixtures.length * 40,
        fixturesFuture: future.length,
        fixturesNext7Days: future.length,
        futureWithBookmaker: future.filter((f) => f.bookmakersMapped > 0).length,
        nonProviderEvents: 14,
        nonProviderFutureEvents: 3,
        whitelistedLeagues: 64,
        whitelistedLeaguesEnabled: 51,
      },
      futureByStatus: [...byStatus.values()],
      budget,
      lastRuns,
    }
  }

  function tree(params) {
    const rows = filterFixtures(params)
    const sports = []
    for (const s of SPORTS) {
      const sRows = rows.filter((f) => f.sportSlug === s.slug)
      if (sRows.length === 0) continue
      const categories = CATEGORIES.filter((c) => c.sportId === s.id)
        .map((c) => {
          const cRows = sRows.filter((f) => f.categoryId === c.id)
          const competitions = COMPETITIONS.filter((comp) => comp.categoryId === c.id)
            .map((comp) => ({
              competitionId: comp.id,
              name: comp.name,
              apisportsLeagueId: comp.league,
              fixtureCount: cRows.filter((f) => f.competitionId === comp.id).length,
              scrapeEnabled: comp.scrape,
            }))
            .filter((comp) => comp.fixtureCount > 0)
          return {
            categoryId: c.id,
            name: c.name,
            countryCode: c.countryCode,
            fixtureCount: cRows.length,
            scrapeEnabledCount: competitions.filter((comp) => comp.scrapeEnabled).length,
            competitions,
          }
        })
        .filter((c) => c.fixtureCount > 0)
      const comps = categories.flatMap((c) => c.competitions)
      sports.push({
        sportId: s.id,
        name: s.name,
        slug: s.slug,
        sportKey: s.sportKey,
        fixtureCount: sRows.length,
        scrapeEnabledCount: comps.filter((c) => c.scrapeEnabled).length,
        competitionCount: comps.length,
        categories,
      })
    }
    const comps = sports.flatMap((s) => s.categories.flatMap((c) => c.competitions))
    return {
      filters: filtersDto(params),
      totalFixtures: rows.length,
      totalCompetitions: comps.length,
      scrapeEnabledCompetitions: comps.filter((c) => c.scrapeEnabled).length,
      sports,
    }
  }

  function fixtureList(params) {
    const categoryId = params.get('categoryId')
    const competitionId = params.get('competitionId')
    const rows = filterFixtures(params).filter(
      (f) =>
        (!categoryId || f.categoryId === categoryId) &&
        (!competitionId || f.competitionId === competitionId),
    )
    const limit = Number(params.get('limit') ?? 100)
    const offset = Number(params.get('offset') ?? 0)
    return {
      filters: filtersDto(params),
      fixtures: rows.slice(offset, offset + limit),
      total: rows.length,
      limit,
      offset,
    }
  }

  function catalog() {
    const future = fixtures.filter((f) => Date.parse(f.startTime) >= now)
    const sports = SPORTS.map((s) => {
      const categories = CATEGORIES.filter((c) => c.sportId === s.id).map((c) => {
        const competitions = COMPETITIONS.filter((comp) => comp.categoryId === c.id).map((comp) => {
          const fut = future.filter((f) => f.competitionId === comp.id)
          return {
            competitionId: comp.id,
            name: comp.name,
            apisportsLeagueId: comp.league,
            scrapeEnabled: comp.scrape,
            futureFixtures: fut.length,
            nextKickoff: fut[0]?.startTime ?? null,
            bookmakersMapped: comp.scrape ? Math.max(...fut.map((f) => f.bookmakersMapped), 0) : 0,
          }
        })
        return {
          categoryId: c.id,
          name: c.name,
          countryCode: c.countryCode,
          competitionCount: competitions.length,
          scrapeEnabledCount: competitions.filter((comp) => comp.scrapeEnabled).length,
          futureFixtures: competitions.reduce((t, comp) => t + comp.futureFixtures, 0),
          competitions,
        }
      })
      return {
        sportId: s.id,
        name: s.name,
        slug: s.slug,
        sportKey: s.sportKey,
        competitionCount: categories.reduce((t, c) => t + c.competitionCount, 0),
        scrapeEnabledCount: categories.reduce((t, c) => t + c.scrapeEnabledCount, 0),
        futureFixtures: categories.reduce((t, c) => t + c.futureFixtures, 0),
        categories,
      }
    }).filter((s) => s.competitionCount > 0)
    return {
      now: iso(Date.now()),
      totalCompetitions: COMPETITIONS.length,
      scrapeEnabledCompetitions: COMPETITIONS.filter((c) => c.scrape).length,
      competitionsWithFutureFixtures: new Set(future.map((f) => f.competitionId)).size,
      sports,
    }
  }

  function setScrape(body) {
    let updated = 0
    for (const comp of COMPETITIONS) {
      const cat = catOf(comp.categoryId)
      const hit =
        (body.competitionIds ?? []).includes(comp.id) ||
        (body.categoryIds ?? []).includes(cat.id) ||
        (body.sportIds ?? []).includes(cat.sportId)
      if (hit && comp.scrape !== !!body.enabled) {
        comp.scrape = !!body.enabled
        updated += 1
      }
    }
    return {
      enabled: !!body.enabled,
      updated,
      scrapeEnabledTotal: COMPETITIONS.filter((c) => c.scrape).length,
      competitionsTotal: COMPETITIONS.length,
    }
  }

  /* ---------- Scraper drill-down ---------- */

  const bookmakerRef = (scraper) => ({ id: scraper.id, slug: scraper.slug, name: scraper.name })

  function drillEvent(f, scraper, i) {
    return {
      eventId: f.eventId,
      startTime: f.startTime,
      status: f.status,
      venue: f.venue,
      round: f.round,
      homeName: f.homeName,
      awayName: f.awayName,
      rawHomeName: scraper.slug === 'bwin' ? f.homeName.toUpperCase() : f.homeName,
      rawAwayName: scraper.slug === 'bwin' ? f.awayName.toUpperCase() : f.awayName,
      bookmakerEventExternalId: `${scraper.slug}-${f.apisportsFixtureId}`,
      bookmakerEventUrl: null,
      matchStatus: MATCH_STATUSES[i % MATCH_STATUSES.length],
      matchConfidence: [1, 0.97, 0.91, 0.78, 1, 0.62][i % 6],
      matchMethod: MATCH_METHODS[i % MATCH_METHODS.length],
      matchedAt: iso(now - (i + 1) * 1_800_000),
      confirmationStatus: 'confirmed',
      confirmedBookmakerCount: (i % 4) + 1,
    }
  }

  const scrapedFixtures = (includePast) =>
    fixtures.filter(
      (f) =>
        f.bookmakersMapped > 0 && (includePast || Date.parse(f.startTime) >= now - 3 * 3_600_000),
    )

  function drillCompetitions(scraper, params) {
    const includePast = params.get('includePast') === 'true'
    const q = (params.get('q') ?? '').toLowerCase()
    const rows = scrapedFixtures(includePast)
    const ids = [...new Set(rows.map((f) => f.competitionId))]
    const all = ids.map((id) => {
      const comp = compOf(id)
      const cat = catOf(comp.categoryId)
      const sport = SPORTS.find((s) => s.id === cat.sportId)
      const events = rows.filter((f) => f.competitionId === id)
      const matched = q
        ? events.filter((f) => `${f.homeName} ${f.awayName}`.toLowerCase().includes(q))
        : []
      return {
        competitionId: id,
        competitionName: comp.name,
        competitionSlug: id,
        categoryName: cat.name,
        countryCode: cat.countryCode,
        sportName: sport.name,
        sportSlug: sport.slug,
        eventCount: events.length,
        rawCompetitionName: scraper.slug === 'bwin' ? `${cat.name} - ${comp.name}` : null,
        matchedEvents: matched.map((f, i) => drillEvent(f, scraper, i)),
      }
    })
    const shown = q
      ? all.filter((c) => c.competitionName.toLowerCase().includes(q) || c.matchedEvents.length > 0)
      : all
    return {
      bookmaker: bookmakerRef(scraper),
      competitions: shown,
      includePast,
      query: q || null,
      totals: {
        totalCompetitions: all.length,
        totalEvents: all.reduce((t, c) => t + c.eventCount, 0),
        filteredCompetitions: shown.length,
        filteredEvents: shown.reduce((t, c) => t + c.eventCount, 0),
      },
    }
  }

  const MARKETS = [
    ['1x2', 'Esito finale 1X2', null, null, 3],
    ['over_under', 'Under/Over', 2.5, null, 2],
    ['btts', 'Goal/No Goal', null, null, 2],
    ['handicap_european', 'Handicap europeo', null, -1, 3],
  ]
  const OUTCOMES = {
    '1x2': [
      ['1', 'Casa', 2.1],
      ['X', 'Pareggio', 3.25],
      ['2', 'Ospite', 3.6],
    ],
    over_under: [
      ['under', 'Under 2.5', 1.85],
      ['over', 'Over 2.5', 1.95],
    ],
    btts: [
      ['yes', 'Goal', 1.72],
      ['no', 'No Goal', 2.05],
    ],
    handicap_european: [
      ['1', 'Casa (-1)', 4.1],
      ['X', 'Pareggio (-1)', 3.8],
      ['2', 'Ospite (+1)', 1.62],
    ],
  }

  function drillMarkets(scraper, eventId) {
    const f = fixtureById.get(eventId)
    if (!f) return null
    return {
      bookmaker: bookmakerRef(scraper),
      event: {
        id: f.eventId,
        competitionId: f.competitionId,
        competitionName: f.competitionName,
        startTime: f.startTime,
        status: f.status,
        homeName: f.homeName,
        awayName: f.awayName,
        rawHomeName: f.homeName,
        rawAwayName: f.awayName,
        rawCompetitionName: f.competitionName,
        matchStatus: 'auto_confirmed',
        matchConfidence: 1,
      },
      markets: MARKETS.map(([key, name, line, handicap, count], i) => ({
        canonicalMarketId: `${eventId}~${key}`,
        marketTypeKey: key,
        marketTypeName: name,
        line,
        handicap,
        teamScope: null,
        periodScope: i === 3 ? 'full_time' : null,
        marketStatus: i === 3 ? 'suspended' : 'active',
        outcomeCount: count,
        activeOutcomeCount: i === 3 ? 0 : count,
        lastSeenAt: iso(now - (i + 1) * 120_000),
      })),
    }
  }

  function drillOutcomes(scraper, marketId) {
    const [eventId, key] = marketId.split('~')
    const m = MARKETS.find((x) => x[0] === key)
    if (!m || !fixtureById.has(eventId)) return null
    const suspended = key === 'handicap_european'
    return {
      bookmaker: bookmakerRef(scraper),
      market: {
        id: marketId,
        eventId,
        marketTypeKey: key,
        marketTypeName: m[1],
        line: m[2],
        handicap: m[3],
        teamScope: null,
        periodScope: null,
        marketStatus: suspended ? 'suspended' : 'active',
        rawMarketLabel: m[1].toUpperCase(),
      },
      outcomes: OUTCOMES[key].map(([k, label, odds], i) => ({
        canonicalOutcomeId: `${marketId}~${k}`,
        canonicalKey: k,
        canonicalLabel: label,
        outcomeStatus: suspended ? 'suspended' : 'active',
        decimalValue: suspended && i === 0 ? null : odds,
        oddsStatus: suspended ? 'suspended' : 'active',
        lastSeenAt: iso(now - (i + 2) * 60_000),
        scrapedAt: iso(now - (i + 2) * 60_000),
        rawOutcomeLabel: label.toUpperCase(),
        rawMarketLabel: m[1].toUpperCase(),
      })),
    }
  }

  /**
   * Serves the request if it is one of these routes; returns false otherwise so server.js goes on.
   * `scrapers` is the live list of server.js (its toggles show up in the drill-down summary).
   */
  return async function handle({ path, method, url, send, readBody, scrapers }) {
    const params = url.searchParams

    if (path === '/api/backoffice/sport-mappings' && method === 'GET') {
      send(200, { mappings: SPORT_MAPPINGS })
      return true
    }
    if (path === '/api/backoffice/sport-mappings/sports' && method === 'GET') {
      send(200, {
        sports: SPORTS.map(({ id, name, slug, status }) => ({ id, name, slug, status })),
      })
      return true
    }
    if (path === '/api/backoffice/sport-mappings' && method === 'POST') {
      const body = await readBody()
      const sport = SPORTS.find((s) => s.id === body.sport_id)
      const b = scrapers.find((s) => s.id === body.bookmaker_id)
      if (!sport || !b) {
        send(400, { message: 'Sport o bookmaker non validi' })
        return true
      }
      const row = {
        id: `sm-${SPORT_MAPPINGS.length + 1}`,
        sport_id: sport.id,
        bookmaker_id: b.id,
        bookmaker_sport_code: body.bookmaker_sport_code,
        bookmaker_sport_name: body.bookmaker_sport_name ?? null,
        sport_name: sport.name,
        bookmaker_name: b.name,
        bookmaker_slug: b.slug,
        created_at: iso(Date.now()),
        updated_at: iso(Date.now()),
      }
      SPORT_MAPPINGS.push(row)
      send(201, { mapping: row })
      return true
    }
    const smMatch = path.match(/^\/api\/backoffice\/sport-mappings\/([^/]+)$/)
    if (smMatch && (method === 'PUT' || method === 'DELETE')) {
      const i = SPORT_MAPPINGS.findIndex((m) => m.id === smMatch[1])
      if (i < 0) {
        send(404, { message: 'Mappatura non trovata' })
        return true
      }
      if (method === 'DELETE') {
        SPORT_MAPPINGS.splice(i, 1)
        send(204)
        return true
      }
      const body = await readBody()
      Object.assign(SPORT_MAPPINGS[i], {
        bookmaker_sport_code: body.bookmaker_sport_code,
        bookmaker_sport_name: body.bookmaker_sport_name ?? null,
        updated_at: iso(Date.now()),
      })
      send(200, { mapping: SPORT_MAPPINGS[i] })
      return true
    }

    if (path === '/api/odds-collection/admin/matchings' && method === 'GET') {
      const rows = MATCHINGS.filter(
        (m) =>
          (!params.get('bookmaker') || m.bookmakerSlug === params.get('bookmaker')) &&
          (!params.get('match_status') || m.matchStatus === params.get('match_status')) &&
          (!params.get('match_method') || m.matchMethod === params.get('match_method')) &&
          (!params.get('sport') || m.sportName === params.get('sport')),
      )
      const limit = Number(params.get('limit') ?? 50)
      const offset = Number(params.get('offset') ?? 0)
      send(200, {
        matchings: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
      })
      return true
    }
    const evBkMatch = path.match(/^\/api\/odds-collection\/admin\/events\/([^/]+)\/bookmakers$/)
    if (evBkMatch && method === 'GET') {
      const rows = MATCHINGS.filter((m) => m.eventId === evBkMatch[1]).map((m) => ({
        id: m.id,
        bookmakerSlug: m.bookmakerSlug,
        bookmakerName: m.bookmakerName,
        bookmakerHomeName: m.bookmakerHomeName,
        bookmakerAwayName: m.bookmakerAwayName,
        bookmakerCompetitionName: m.bookmakerCompetitionName,
        matchStatus: m.matchStatus,
        matchMethod: m.matchMethod,
        matchConfidence: m.matchConfidence,
        matchedAt: m.matchedAt,
      }))
      send(200, { bookmakers: rows })
      return true
    }

    if (path === '/api/odds-collection/review-queue' && method === 'GET') {
      const status = params.get('status') ?? 'pending'
      send(200, { items: REVIEW_QUEUE.filter((r) => r.status === status) })
      return true
    }
    if (path === '/api/odds-collection/review-queue/stats') {
      const count = (s) => REVIEW_QUEUE.filter((r) => r.status === s).length
      send(200, {
        pending: count('pending'),
        attached: 300 + count('attached'),
        rejected: count('rejected'),
        createdCanonical: 0,
      })
      return true
    }
    if (path === '/api/odds-collection/review-queue/provider/budget') {
      send(200, budget)
      return true
    }
    const rqMatch = path.match(/^\/api\/odds-collection\/review-queue\/([^/]+)\/(attach|reject)$/)
    if (rqMatch && method === 'POST') {
      const item = REVIEW_QUEUE.find((r) => r.id === rqMatch[1])
      if (!item) {
        send(404, { message: 'Elemento non trovato' })
        return true
      }
      const body = rqMatch[2] === 'attach' ? await readBody() : {}
      Object.assign(item, {
        status: rqMatch[2] === 'attach' ? 'attached' : 'rejected',
        resolvedEventId: body.eventId ?? null,
        resolvedBy: 'admin',
        resolvedAt: iso(Date.now()),
      })
      send(200, { ok: true })
      return true
    }
    const syncMatch = path.match(/^\/api\/odds-collection\/review-queue\/provider\/sync\/([^/]+)$/)
    if (syncMatch && method === 'POST') {
      budget.callsUsed += 3
      send(200, { type: params.get('type') ?? 'fixtures', upserted: 12, apiCalls: 3 })
      return true
    }

    if (path === '/api/backoffice/provider-schedule/summary') {
      send(200, summary())
      return true
    }
    if (path === '/api/backoffice/provider-schedule/tree') {
      send(200, tree(params))
      return true
    }
    if (path === '/api/backoffice/provider-schedule/fixtures') {
      send(200, fixtureList(params))
      return true
    }
    if (path === '/api/backoffice/provider-schedule/competitions' && method === 'GET') {
      send(200, catalog())
      return true
    }
    if (path === '/api/backoffice/provider-schedule/competitions/scrape' && method === 'PATCH') {
      send(200, setScrape(await readBody()))
      return true
    }

    const drill = path.match(
      /^\/api\/backoffice\/scrapers\/([^/]+)\/(summary|competitions|competitions\/([^/]+)\/events|events\/([^/]+)\/markets|markets\/([^/]+)\/outcomes)$/,
    )
    if (drill && method === 'GET') {
      const scraper = scrapers.find((s) => s.slug === drill[1])
      if (!scraper) {
        send(404, { message: `Bookmaker ${drill[1]} non trovato` })
        return true
      }
      const kind = drill[2].split('/')
      if (kind[0] === 'summary') {
        const rows = scrapedFixtures(false)
        send(200, {
          id: scraper.id,
          slug: scraper.slug,
          name: scraper.name,
          adapterType: scraper.adapter_type,
          isActive: scraper.is_active,
          scrapeEnabled: scraper.scrape_enabled,
          scrapeIntervalSeconds: scraper.scrape_interval_seconds,
          enabledSports: scraper.enabled_sports,
          mappedSports: scraper.mapped_sports,
          createdAt: scraper.created_at,
          updatedAt: scraper.updated_at,
          lastRunAt: scraper.scrape_enabled ? iso(now - 95_000) : null,
          lastRunStatus: scraper.scrape_enabled ? 'completed' : null,
          futureCompetitionCount: new Set(rows.map((f) => f.competitionId)).size,
          futureEventCount: rows.length,
        })
      } else if (kind.length === 1) {
        send(200, drillCompetitions(scraper, params))
      } else if (kind[2] === 'events') {
        const comp = compOf(drill[3])
        const cat = comp && catOf(comp.categoryId)
        const includePast = params.get('includePast') === 'true'
        const events = scrapedFixtures(includePast).filter((f) => f.competitionId === drill[3])
        send(200, {
          bookmaker: bookmakerRef(scraper),
          competition: {
            id: drill[3],
            name: comp?.name ?? drill[3],
            categoryName: cat?.name ?? null,
            sportName: events[0]?.sportName ?? 'Calcio',
          },
          events: events.map((f, i) => drillEvent(f, scraper, i)),
          includePast,
        })
      } else if (kind[2] === 'markets') {
        const body = drillMarkets(scraper, drill[4])
        send(body ? 200 : 404, body ?? { message: 'Evento non trovato' })
      } else {
        const body = drillOutcomes(scraper, drill[5])
        send(body ? 200 : 404, body ?? { message: 'Mercato non trovato' })
      }
      return true
    }

    return false
  }
}

module.exports = { createBackofficeMock }
