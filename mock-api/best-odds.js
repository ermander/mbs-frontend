/**
 * «Best Odds» for the mock (§14.391): the catalog sport → nation → competition, the events of a
 * competition, of a sport or of a search, and one event with its markets and every site's prices,
 * with the shapes of the backend (types/best-odds.ts). Everything is made up and derived from the
 * event's number, so a reload shows the same prices: enough sports, nations and markets to see
 * every state of the page, not a copy of prod. The pages of the events are on example.com.
 * An event id that starts with «gone» answers the 404 of a match that has kicked off.
 */
const DAY = 86_400_000
/** Hour and minute of the kickoffs, in the time of the machine the mock runs on. */
const KICKOFFS = [
  [12, 30],
  [15, 0],
  [18, 0],
  [20, 45],
]
const COMMISSION = 0.045

/** [slug, name, margin]: what each site keeps on a market; the exchange has none (and a lay). */
const FEEDS = [
  ['888sport', '888sport', 0.06],
  ['admiralbet', 'AdmiralBet', 0.07],
  ['bet365', 'Bet365', 0.05],
  ['betfair', 'Betfair Exchange', 0.01],
  ['betsson', 'Betsson', 0.06],
  ['bwin', 'Bwin', 0.06],
  ['codere', 'Codere', 0.08],
  ['daznbet', 'DAZN Bet', 0.07],
  ['domusbet', 'DomusBet', 0.08],
  ['eurobet', 'Eurobet', 0.06],
  ['goldbet', 'GoldBet', 0.065],
  ['leovegas', 'LeoVegas', 0.06],
  ['marathonbet', 'Marathonbet', 0.035],
  ['netbet', 'NetBet', 0.07],
  ['sisal', 'Sisal', 0.06],
  ['williamhill', 'William Hill', 0.065],
  ['winamax', 'Winamax', 0.045],
  ['zonagioco', 'ZonaGioco', 0.08],
]
/** Brands with the prices of another site: listed as sites of their own, like the backend does. */
const TWINS = [
  ['betflag', 'BetFlag', 'goldbet'],
  ['giocodigitale', 'Gioco Digitale', 'bwin'],
  ['lottomatica', 'Lottomatica', 'goldbet'],
  ['planetwin365', 'PlanetWin365', 'goldbet'],
  ['pokerstars', 'PokerStars', 'sisal'],
  ['snai', 'Snai', 'sisal'],
  ['starcasino', 'StarCasinò', 'betsson'],
  ['starvegas', 'StarVegas', 'admiralbet'],
]
/** The sites that price the wide menu of an event (halves, handicaps, corners), like bet365 and 888sport in prod. */
const WIDE = ['bet365', '888sport']
/** No page of the event for these: the row has no «Apri». */
const NO_PAGE = new Set(['codere', 'zonagioco', 'starcasino'])

/** [sport, nation, code, competition, teams, events] */
const COMPETITIONS = [
  [
    'Football',
    'Italy',
    'IT',
    'Serie A',
    [
      'Inter',
      'Milan',
      'Juventus',
      'Napoli',
      'Roma',
      'Lazio',
      'Atalanta',
      'Bologna',
      'Fiorentina',
      'Torino',
      'Genoa',
      'Como',
    ],
    10,
  ],
  [
    'Football',
    'Italy',
    'IT',
    'Serie B',
    ['Palermo', 'Bari', 'Sampdoria', 'Venezia', 'Monza', 'Empoli', 'Modena', 'Cesena'],
    8,
  ],
  ['Football', 'Italy', 'IT', 'Coppa Italia', ['Udinese', 'Parma', 'Cagliari', 'Lecce'], 2],
  [
    'Football',
    'World',
    null,
    'UEFA Champions League',
    [
      'Real Madrid',
      'Arsenal',
      'Bayern München',
      'PSG',
      'Barcelona',
      'Manchester City',
      'Benfica',
      'PSV',
    ],
    8,
  ],
  [
    'Football',
    'World',
    null,
    'UEFA Europa League',
    ['Porto', 'Lyon', 'Aston Villa', 'Celtic', 'Fenerbahçe', 'Braga'],
    6,
  ],
  ['Football', 'World', null, 'CONMEBOL Libertadores', ['Flamengo', 'River Plate'], 1],
  [
    'Football',
    'England',
    'GB-ENG',
    'Premier League',
    [
      'Liverpool',
      'Chelsea',
      'Tottenham',
      'Newcastle',
      'Manchester United',
      'Brighton',
      'Everton',
      'Fulham',
    ],
    8,
  ],
  [
    'Football',
    'England',
    'GB-ENG',
    'Championship',
    ['Leeds', 'Sheffield United', 'Norwich', 'Middlesbrough', 'Coventry', 'Watford'],
    6,
  ],
  [
    'Football',
    'Spain',
    'ES',
    'La Liga',
    ['Atlético Madrid', 'Sevilla', 'Valencia', 'Villarreal', 'Real Sociedad', 'Betis'],
    6,
  ],
  [
    'Football',
    'Germany',
    'DE',
    'Bundesliga',
    ['Borussia Dortmund', 'Leipzig', 'Leverkusen', 'Stuttgart', 'Frankfurt', 'Freiburg'],
    6,
  ],
  ['Football', 'France', 'FR', 'Ligue 1', ['Marseille', 'Monaco', 'Lille', 'Nice'], 4],
  [
    'Football',
    'Scotland',
    'GB-SCT',
    'Premiership',
    ['Rangers', 'Hearts', 'Aberdeen', 'Hibernian'],
    2,
  ],
  ['Football', 'Netherlands', 'NL', 'Eredivisie', ['Ajax', 'Feyenoord', 'AZ', 'Twente'], 2],
  ['Football', 'South-Korea', 'KR', 'K League 1', ['Ulsan', 'Jeonbuk'], 1],
  [
    'Basketball',
    'USA',
    'US',
    'NBA',
    ['Boston Celtics', 'Denver Nuggets', 'Los Angeles Lakers', 'Miami Heat'],
    2,
  ],
  ['Basketball', 'Italy', 'IT', 'Lega A', ['Olimpia Milano', 'Virtus Bologna'], 1],
  ['Tennis', 'World', null, 'ATP Finals', ['Sinner J.', 'Alcaraz C.'], 1],
]

const iso = (ms) => new Date(ms).toISOString()
const pad = (n, width) => String(n).padStart(width, '0')
/** Ids shaped like the uuids of the backend, readable: …c0NN competitions, …e0NN events. */
const competitionId = (i) => `00000000-0000-4000-8000-00000000c${pad(i, 3)}`
const eventId = (i) => `00000000-0000-4000-8000-00000000e${pad(i, 3)}`

/** A small deterministic generator (mulberry32): the same event always gets the same prices. */
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round2 = (n) => Math.round(n * 100) / 100

const OUTCOMES = {
  '1x2': [
    ['home', '1'],
    ['draw', 'X'],
    ['away', '2'],
  ],
  double_chance: [
    ['home_draw', '1X'],
    ['home_away', '12'],
    ['draw_away', 'X2'],
  ],
  btts: [
    ['yes', 'GG'],
    ['no', 'NG'],
  ],
  over_under: [
    ['over', 'Over'],
    ['under', 'Under'],
  ],
  draw_no_bet: [
    ['home', '1'],
    ['away', '2'],
  ],
  handicap_european: [
    ['home', '1'],
    ['draw', 'X'],
    ['away', '2'],
  ],
  handicap_asian: [
    ['home', '1'],
    ['away', '2'],
  ],
  odd_even: [
    ['odd', 'Odd'],
    ['even', 'Even'],
  ],
  halftime_fulltime: ['1_1', '1_x', '1_2', 'x_1', 'x_x', 'x_2', '2_1', '2_x', '2_2'].map((k) => [
    k,
    k.toUpperCase().replace('_', '/'),
  ]),
  correct_score: [
    ...[
      '0_0',
      '1_0',
      '0_1',
      '2_0',
      '0_2',
      '1_1',
      '2_1',
      '1_2',
      '2_2',
      '3_0',
      '0_3',
      '3_1',
      '1_3',
      '3_2',
      '2_3',
      '3_3',
    ].map((k) => [k, k.replace('_', '-')]),
    ['other', 'Other'],
  ],
  corner_1x2: [
    ['home', '1'],
    ['draw', 'X'],
    ['away', '2'],
  ],
  corner_over_under: [
    ['over', 'Over'],
    ['under', 'Under'],
  ],
  result_btts: [
    ['home_yes', '1 & GG'],
    ['home_no', '1 & NG'],
    ['draw_yes', 'X & GG'],
    ['draw_no', 'X & NG'],
    ['away_yes', '2 & GG'],
    ['away_no', '2 & NG'],
  ],
}

function createBestOddsMock(now) {
  const events = []
  const competitions = COMPETITIONS.map(
    ([sportName, nationName, nationCode, name, teams, count], c) => {
      const id = competitionId(c + 1)
      for (let i = 0; i < count; i++) {
        const n = events.length + 1
        // Two matches a day for each competition, at the hours of a real schedule; a kickoff that
        // is already past (or about to be) moves to the day after.
        const start = new Date(now + (Math.floor(i / 2) + (c % 3)) * DAY)
        const [hour, minute] = KICKOFFS[(i + c) % KICKOFFS.length]
        start.setHours(hour, minute, 0, 0)
        if (start.getTime() < now + 3_600_000) start.setDate(start.getDate() + 1)
        events.push({
          n,
          id: eventId(n),
          startTime: iso(start.getTime()),
          homeName: teams[(i * 2) % teams.length],
          awayName: teams[(i * 2 + 1) % teams.length],
          sportName,
          competitionId: id,
          competitionName: name,
          nationName,
          nationCode,
          // The big leagues are on every site, the others on fewer and fewer.
          feeds: FEEDS.filter((_, f) => f % (1 + (c % 4)) === 0 || f < 6).map(([slug]) => slug),
        })
      }
      return { id, name, sportName, nationName, nationCode }
    },
  )
  events.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id))

  const shownCount = (feeds) =>
    feeds.length + TWINS.filter(([, , feed]) => feeds.includes(feed)).length
  const summary = (e) => ({
    id: e.id,
    startTime: e.startTime,
    homeName: e.homeName,
    awayName: e.awayName,
    sportName: e.sportName,
    competitionId: e.competitionId,
    competitionName: e.competitionName,
    nationName: e.nationName,
    nationCode: e.nationCode,
    bookmakers: shownCount(e.feeds),
  })

  function catalog() {
    const sports = new Map()
    for (const comp of competitions) {
      const list = events.filter((e) => e.competitionId === comp.id)
      if (list.length === 0) continue
      const sport = sports.get(comp.sportName) ?? {
        name: comp.sportName,
        events: 0,
        nations: new Map(),
      }
      sports.set(comp.sportName, sport)
      const key = `${comp.nationCode ?? ''}|${comp.nationName}`
      const nation = sport.nations.get(key) ?? {
        name: comp.nationName,
        code: comp.nationCode,
        events: 0,
        competitions: [],
      }
      sport.nations.set(key, nation)
      nation.competitions.push({
        id: comp.id,
        name: comp.name,
        events: list.length,
        nextStart: list[0].startTime,
      })
      nation.events += list.length
      sport.events += list.length
    }
    const list = [...sports.values()]
      .map((s) => ({
        ...s,
        nations: [...s.nations.values()]
          .map((n) => ({
            ...n,
            competitions: n.competitions.sort((a, b) => a.name.localeCompare(b.name, 'it')),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'it')),
      }))
      .sort((a, b) => b.events - a.events)
    return { sports: list, totalEvents: events.length, calculatedAt: iso(Date.now() - 20_000) }
  }

  /** ?sport= ?competition= ?search= ?limit= ?offset=, like the backend: every word of the search, any case. */
  function listEvents(params) {
    const sport = params.get('sport')
    const competition = params.get('competition')
    const search = (params.get('search') ?? '').trim().toLowerCase()
    const words = search.length >= 2 ? search.split(/\s+/) : []
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '50', 10) || 50))
    const offset = Math.max(0, parseInt(params.get('offset') ?? '0', 10) || 0)
    const rows = events.filter((e) => {
      if (sport && e.sportName !== sport) return false
      if (competition && e.competitionId !== competition) return false
      const text = `${e.homeName} ${e.awayName} ${e.competitionName}`.toLowerCase()
      return words.every((w) => text.includes(w))
    })
    return {
      events: rows.slice(offset, offset + limit).map(summary),
      total: rows.length,
      limit,
      offset,
    }
  }

  /** One event: null for an id that is not in the palinsesto (the route answers 404). */
  function event(id) {
    const e = events.find((x) => x.id === id)
    if (!e) return null
    const rnd = seeded(e.n * 7919)
    const football = e.sportName === 'Football'
    // The fair chances of the match, from which every site cuts its margin.
    const pHome = 0.25 + rnd() * 0.35
    const pDraw = football ? 0.22 + rnd() * 0.08 : 0
    const pAway = 1 - pHome - pDraw
    const pOver25 = 0.42 + rnd() * 0.2
    const pYes = 0.45 + rnd() * 0.15
    const seenAgo = Object.fromEntries(
      e.feeds.map((slug, i) => [slug, 60 + Math.floor(rnd() * 480) + (i === 3 ? 0 : 0)]),
    )
    // One site read long ago, to see the age in warning and in loss.
    if (e.feeds.includes('domusbet')) seenAgo.domusbet = 2 * 3600
    if (e.feeds.includes('codere')) seenAgo.codere = 5 * 3600

    const markets = []
    let m = 0
    /** A market priced by `slugs`: `chances` are the fair probabilities of its outcomes, in OUTCOMES order. */
    const add = (typeKey, chances, slugs, scope = {}) => {
      const outcomes = OUTCOMES[typeKey]
      const rows = []
      for (const [slug, , margin] of FEEDS) {
        if (!slugs.includes(slug)) continue
        const exchange = slug === 'betfair'
        const odds = {}
        const lay = {}
        outcomes.forEach(([key], i) => {
          const p = chances[i]
          if (!(p > 0.004)) return
          // A site now and then leaves an outcome out (an Under with no price).
          if (!exchange && typeKey === 'over_under' && key === 'under' && rnd() < 0.06) return
          const price = round2(Math.max(1.01, (1 / p) * (1 - margin) * (0.97 + rnd() * 0.06)))
          odds[key] = exchange ? round2(price * 1.02) : price
          if (exchange) lay[key] = round2(odds[key] * 1.02 + 0.01)
        })
        if (Object.keys(odds).length === 0) continue
        const row = { bookmaker: slug, odds, lastSeenAt: iso(Date.now() - seenAgo[slug] * 1000) }
        if (exchange) row.lay = lay
        rows.push(row)
        for (const [twin, , feed] of TWINS)
          if (feed === slug) rows.push({ ...row, bookmaker: twin })
      }
      if (rows.length === 0) return
      markets.push({
        id: `${e.id}-m${pad(++m, 2)}`,
        marketTypeKey: typeKey,
        line: scope.line ?? null,
        handicap: scope.handicap ?? null,
        periodScope: scope.period === undefined ? 'full_time' : scope.period,
        teamScope: null,
        outcomes: outcomes.map(([key, label]) => ({ key, label })),
        rows,
      })
    }

    const all = e.feeds
    const wide = e.feeds.filter((slug) => WIDE.includes(slug))
    if (!football) {
      // Two ways: the winner, on every site.
      add('draw_no_bet', [pHome / (pHome + pAway), pAway / (pHome + pAway)], all)
      for (const line of [165.5, 170.5, 175.5])
        add(
          'over_under',
          [0.5 + (170.5 - line) / 40, 0.5 - (170.5 - line) / 40],
          line === 170.5 ? all : wide,
          { line },
        )
    } else {
      add('1x2', [pHome, pDraw, pAway], all)
      add('1x2', [pHome * 0.75, pDraw + 0.2, pAway * 0.75], wide, { period: 'first_half' })
      add('1x2', [pHome * 0.85, pDraw + 0.12, pAway * 0.85], wide, { period: 'second_half' })
      add('double_chance', [pHome + pDraw, pHome + pAway, pDraw + pAway], all)
      add(
        'draw_no_bet',
        [pHome / (pHome + pAway), pAway / (pHome + pAway)],
        all.filter((_, i) => i % 2 === 0),
      )
      add('btts', [pYes, 1 - pYes], all)
      add('btts', [pYes * 0.45, 1 - pYes * 0.45], wide, { period: 'first_half' })
      const overAt = {
        0.5: 0.93,
        1.5: Math.min(0.9, pOver25 + 0.24),
        2.5: pOver25,
        3.5: pOver25 - 0.22,
        4.5: pOver25 - 0.33,
        5.5: 0.06,
      }
      for (const [line, p] of Object.entries(overAt)) {
        const lineValue = Number(line)
        add(
          'over_under',
          [p, 1 - p],
          lineValue >= 1.5 && lineValue <= 3.5 ? all : all.filter((_, i) => i % 3 === 0),
          { line: lineValue },
        )
      }
      for (const line of [0.5, 1.5, 2.5])
        add(
          'over_under',
          [
            line === 0.5 ? 0.7 : line === 1.5 ? 0.33 : 0.11,
            line === 0.5 ? 0.3 : line === 1.5 ? 0.67 : 0.89,
          ],
          wide,
          { line, period: 'first_half' },
        )
      add(
        'result_btts',
        [
          pHome * pYes,
          pHome * (1 - pYes),
          pDraw * 0.7,
          pDraw * 0.3,
          pAway * pYes,
          pAway * (1 - pYes),
        ],
        wide.slice(0, 1),
      )
      for (const handicap of [-2, -1, 1, 2]) {
        const shift = handicap * 0.17
        add(
          'handicap_european',
          [Math.max(0.03, pHome + shift), 0.2, Math.max(0.03, pAway - shift)],
          wide,
          { handicap },
        )
      }
      for (const handicap of [-0.5, 0.5, 1.5])
        add(
          'handicap_asian',
          [
            Math.min(0.92, Math.max(0.08, pHome + pDraw / 2 + handicap * 0.2)),
            Math.min(0.92, Math.max(0.08, pAway + pDraw / 2 - handicap * 0.2)),
          ],
          wide,
          { handicap },
        )
      add('odd_even', [0.49, 0.51], wide)
      add(
        'halftime_fulltime',
        [pHome * 0.6, 0.05, 0.02, pHome * 0.3, pDraw * 0.6, pAway * 0.3, 0.02, 0.05, pAway * 0.6],
        wide,
        { period: null },
      )
      add(
        'correct_score',
        [
          0.07, 0.1, 0.08, 0.08, 0.06, 0.12, 0.09, 0.07, 0.05, 0.04, 0.03, 0.04, 0.03, 0.02, 0.02,
          0.01, 0.09,
        ],
        wide.slice(0, 1),
      )
      add('corner_1x2', [0.45, 0.1, 0.45], wide.slice(0, 1))
      for (const line of [8.5, 9.5, 10.5])
        add(
          'corner_over_under',
          [0.5 + (9.5 - line) * 0.14, 0.5 - (9.5 - line) * 0.14],
          wide.slice(0, 1),
          { line },
        )
    }

    const page = (slug) => (NO_PAGE.has(slug) ? null : `https://example.com/${slug}/evento/${e.id}`)
    const bookmakers = [
      ...FEEDS.filter(([slug]) => e.feeds.includes(slug)).map(([slug, name]) => ({
        slug,
        name,
        isExchange: slug === 'betfair',
        eventUrl: page(slug),
      })),
      ...TWINS.filter(([, , feed]) => e.feeds.includes(feed)).map(([slug, name]) => ({
        slug,
        name,
        isExchange: false,
        eventUrl: page(slug),
      })),
    ].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }))
    const position = new Map(bookmakers.map((b, i) => [b.slug, i]))
    for (const market of markets)
      market.rows.sort((a, b) => position.get(a.bookmaker) - position.get(b.bookmaker))

    return {
      event: { ...summary(e), bookmakers: bookmakers.length, staleAfterSeconds: 21_600 },
      bookmakers,
      markets,
      exchangeCommission: COMMISSION,
      calculatedAt: iso(Date.now()),
    }
  }

  return { catalog, listEvents, event }
}

module.exports = { createBestOddsMock }
