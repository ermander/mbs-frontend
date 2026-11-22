/**
 * Mock of the MBS backend for checking the frontend in a browser on the Mac,
 * where there is no Postgres and no backend: `next dev` proxies /api/* to
 * localhost:4000 (next.config.ts rewrites). No credentials: /auth/me always
 * answers with an admin, the guard only needs `isLoggedIn` in localStorage.
 * Serves the matcher (§14.95 shape) and the Profit Tracker calls the scanner
 * v2 calculators use. Usage: node mock-api/server.js [port]
 * §14.249: the user carries hasPassword (true by default); MOCK_USER_HAS_PASSWORD=0 starts
 * it as a Google-only account without one, and PATCH /api/__mock/user {"hasPassword":false}
 * flips it while running (any field of the user can be set that way).
 */
const http = require('http');
const { URL } = require('url');
const { createBackofficeMock } = require('./backoffice');

const PORT = parseInt(process.argv[2] ?? '4000', 10);
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const ago = (seconds) => iso(now - seconds * 1000);
const inDays = (d, hour = 18, minute = 45) => {
    const t = new Date(now + d * 86_400_000);
    t.setHours(hour, minute, 0, 0);
    return t.toISOString();
};

// §14.365: sport mappings, matchings, review queue, Palinsesto, Competizioni and the scraper drill-down.
const backofficeMock = createBackofficeMock(now);
const user = { id: 'u1', email: 'admin@example.com', name: 'Admin', username: 'admin', role: 'ADMIN_ROLE', settings: {}, createdAt: '2026-03-01T10:00:00.000Z', tools: [], hasPassword: process.env.MOCK_USER_HAS_PASSWORD !== '0' };
// §14.122: utenti del backoffice con gli strumenti abilitati (PATCH /backoffice/users/:id/tools).
const USERS = [
    { id: 'u1', email: 'admin@example.com', name: 'Admin', username: 'admin', role: 'ADMIN_ROLE', is_email_verified: true, created_at: '2026-03-01T10:00:00.000Z', enabled_tools: [] },
    { id: '11111111-1111-4111-8111-111111111111', email: 'marco@example.com', name: 'Marco Rossi', username: 'marco', role: 'USER_ROLE', is_email_verified: true, created_at: '2026-05-10T09:00:00.000Z', enabled_tools: ['result_btts'] },
    { id: '22222222-2222-4222-8222-222222222222', email: 'giulia@example.com', name: 'Giulia Bianchi', username: 'giulia', role: 'USER_ROLE', is_email_verified: false, created_at: '2026-06-02T15:30:00.000Z', enabled_tools: [] },
];
// §14.124: pagina scraper del backoffice (toggle, sport, nota manuale), in memoria.
// §14.145: pagina «Salute». Report di salute con i campi che la pagina legge e storia delle
// metriche con le serie per bookmaker (quote scritte/attive, età p50/p90) e quelle globali.
const HEALTH_BOOKS = { bwin: 1, sisal: 0.6, betsson: 2.2, betfairsportsbook: 0.8 };
const healthCron = (name, minutesAgo, durationMs) => ({
    name, scheduledAt: iso(now + 60_000), lastStartAt: ago(minutesAgo * 60), lastSuccessAt: ago(minutesAgo * 60),
    lastFailureAt: null, lastError: null, runs: 120, failures: 0, lastDurationMs: durationMs,
});
const healthReport = () => ({
    now: iso(Date.now()), bootedAt: ago(5 * 3600), scrapingGloballyEnabled: true,
    thresholds: { adapterSilenceMinutes: 20, ingestionWindowMinutes: 60, matcherStaleMinutes: 10, matcherRebuildStaleMinutes: 30 },
    alerts: [],
    adapters: Object.keys(HEALTH_BOOKS).map((slug) => ({
        slug, name: slug, lastCompletedAt: ago(90), lastRunStatus: 'completed', lastRunAt: ago(90), lastError: null,
        recentRuns: 40, recentFailed: 0, windowRuns: 40, windowEvents: 800, windowOdds: 12000, windowMatched: 780, windowOrphaned: 20, windowOffCatalog: slug === 'sisal' ? 35 : 0,
        schedulable: true, skipReason: null, initialized: true, silentForMinutes: 1, circuitOpenUntil: null, circuitFailures: null, circuitPhase: null,
    })),
    browser: { configured: false, endpoint: null, connected: false, browserVersion: null, pages: [] },
    runs: Object.keys(HEALTH_BOOKS).map((slug) => ({ bookmakerSlug: slug, totalRuns: 40, successRuns: 40, failedRuns: 0, lastRunAt: ago(90), lastStatus: 'completed' })),
    hoursBack: 24,
    crons: [healthCron('OdEventDiscovery', 12, 240_000), healthCron('OdOddsRefresh', 1, 42_000), healthCron('OdMatcherRebuild', 7, 180_000), healthCron('OdOpsMetricsSample', 3, 900)],
    matcher: { rows: 12345, calculatedAt: ago(35), pendingMarkets: 3, pendingEvents: 3, rebuild: healthCron('OdMatcherRebuild', 7, 180_000), tick: healthCron('OdMatcherCalculation', 1, 800) },
    refresh: { trackedPairs: 640, heartbeat: healthCron('OdOddsRefresh', 1, 42_000) },
    provider: { budget: { date: '2026-09-19', callsUsed: 1200, planDailyLimit: 7500, lastCallAt: ago(600) }, lastRuns: [] },
    reviewQueue: { pending: 12, attached: 300, rejected: 4, created_canonical: 0 },
    coverage: { fixturesNext48h: 210, mappedNext48h: 190 },
    odds: Object.keys(HEALTH_BOOKS).map((slug) => ({ slug, status: 'active', rows: 3000, events: 120 })),
    storage: { databaseBytes: 2_500_000_000, tables: [{ name: 'od_latest_odds', bytes: 1_200_000_000, liveRows: 900_000 }] },
});
const metricsHistory = (hours) => {
    const stepMinutes = hours <= 24 ? 5 : hours <= 48 ? 10 : hours <= 168 ? 30 : 60;
    const points = Math.floor((hours * 60) / stepMinutes);
    const series = [];
    const add = (metric, bookmaker, f) => series.push({
        metric, bookmaker, points: Array.from({ length: points }, (_, i) => ({ t: iso(now - (points - i) * stepMinutes * 60_000), v: f(i) })),
    });
    for (const [slug, k] of Object.entries(HEALTH_BOOKS)) {
        add('odds_age_p50_s', slug, (i) => Math.round(120 * k + 40 * Math.sin(i / 7)));
        add('odds_age_p90_s', slug, (i) => Math.round(420 * k + 90 * Math.sin(i / 5)));
        add('odds_active', slug, (i) => Math.round(3000 * k + 200 * Math.cos(i / 9)));
        add('ingest_odds_written', slug, (i) => Math.round(400 * k + 100 * Math.sin(i / 3)));
    }
    add('review_queue_pending', '', (i) => 10 + (i % 5));
    add('matcher_rows', '', (i) => 12000 + 30 * i);
    add('rebuild_duration_ms', '', () => 180_000);
    add('refresh_duration_ms', '', (i) => Math.round(40_000 + 3000 * Math.sin(i / 4)));
    return { hours, stepMinutes, sampleMinutes: 5, retentionDays: 14, series };
};

const scraperRow = (id, slug, name, extra) => ({
    id, slug, name, adapter_type: 'api', is_active: true, scrape_enabled: true, scrape_interval_seconds: 180,
    enabled_sports: ['Football'], mapped_sports: ['Basketball', 'Football', 'Tennis'], note: null, scrape_all_competitions: false,
    created_at: '2026-08-20T10:00:00.000Z', updated_at: ago(3600), ...extra,
});
const SCRAPERS = [
    scraperRow('b-sisal', 'sisal', 'Sisal (PokerStars · Snai)', {}),
    scraperRow('b-bwin', 'bwin', 'Bwin (Gioco Digitale)', { note: 'Tetto 30 richieste/min: Cloudflare blocca il VPS sopra ~2.500 richieste/ora.' }),
    scraperRow('b-betsson', 'betsson', 'Betsson (StarCasinò)', {}),
    // §14.125/§14.228: Bet365 legge tutto il calcio per «Risultato + Goal».
    scraperRow('b-bet365', 'bet365', 'Bet365', { adapter_type: 'playwright', mapped_sports: ['Football'], scrape_all_competitions: true, note: 'bet365.it dai sidecar Chrome; tutto il calcio per Risultato + Goal.' }),
    scraperRow('b-goldbet', 'goldbet', 'GoldBet (Lottomatica · PlanetWin365 · BetFlag)', { adapter_type: 'playwright', mapped_sports: ['Football'] }),
    scraperRow('b-betpoint', 'betpoint', 'Betpoint', { mapped_sports: ['Basketball', 'Football', 'Tennis', 'Volleyball'], note: 'IP del VPS bloccato (403 su ElencoAvvenimenti) dal 16/9: serve un proxy.' }),
    scraperRow('b-eplay24', 'eplay24', 'Eplay24', { adapter_type: 'playwright', scrape_enabled: false, mapped_sports: ['Football'], note: 'Integrazione ferma dal 4/9: quote dietro Akamai Bot Manager, solo Chrome vero via CDP passa.' }),
    scraperRow('b-stake', 'stake', 'Stake', { is_active: false, scrape_enabled: false, enabled_sports: null, mapped_sports: [] }),
];
let globalScraping = { enabled: true, updated_at: ago(7200), updated_by: 'admin' };
// Profilo: stato del collegamento Telegram nel mock (in memoria).
let telegram = { linked: false, linkedAt: null };

const BOOKMAKERS = {
    sisal: { id: 'b-sisal', slug: 'sisal', name: 'Sisal (PokerStars · Snai)', isExchange: false },
    bwin: { id: 'b-bwin', slug: 'bwin', name: 'Bwin (Gioco Digitale)', isExchange: false },
    betsson: { id: 'b-betsson', slug: 'betsson', name: 'Betsson (StarCasinò)', isExchange: false },
    goldbet: { id: 'b-goldbet', slug: 'goldbet', name: 'GoldBet (Lottomatica · PlanetWin365 · BetFlag)', isExchange: false },
    betfair: { id: 'b-betfair', slug: 'betfair', name: 'Betfair Exchange', isExchange: true },
    xsport: { id: 'b-xsport', slug: 'xsport', name: 'XSport', isExchange: false },
};
const EVENT_URLS = {
    sisal: 'https://www.sisal.it/scommesse-matchpoint/palinsesto/calcio',
    bwin: 'https://www.bwin.it/it/sports/eventi/genoa-como-2:7857447',
    betsson: 'https://www.betsson.it/scommesse/evento/serie-a/genoa-vs-como',
    betfair: 'https://www.betfair.it/exchange/plus/it/calcio-scommesse-1',
};
const leg = (slug, outcomeKey, outcomeLabel, odds, seenAgo, isExchange) => ({
    bookmakerId: BOOKMAKERS[slug].id, bookmakerSlug: slug, bookmakerName: BOOKMAKERS[slug].name,
    outcomeKey, outcomeLabel, odds, lastSeenAt: ago(seenAgo), isExchange: isExchange ?? BOOKMAKERS[slug].isExchange,
    eventUrl: EVENT_URLS[slug] ?? null,
});
const C = 0.045;
const net = (q) => Math.round((1 + (q - 1) * (1 - C)) * 1000) / 1000;

const EVENTS = {
    genoa: { eventId: 'ev-1', homeName: 'Genoa', awayName: 'Como', startTime: inDays(2), sportName: 'Football', competitionId: 'c-seriea', competitionName: 'Serie A', nationName: 'Italy', nationCode: 'IT', staleAfterSeconds: 900 },
    lazio: { eventId: 'ev-2', homeName: 'Lazio', awayName: 'Roma', startTime: inDays(3, 20, 45), sportName: 'Football', competitionId: 'c-seriea', competitionName: 'Serie A', nationName: 'Italy', nationCode: 'IT', staleAfterSeconds: 900 },
    arsenal: { eventId: 'ev-3', homeName: 'Arsenal', awayName: 'Chelsea', startTime: inDays(5, 17, 30), sportName: 'Football', competitionId: 'c-pl', competitionName: 'Premier League', nationName: 'England', nationCode: 'GB', staleAfterSeconds: 3600 },
    celtic: { eventId: 'ev-5', homeName: 'Celtic', awayName: 'Ferencvaros', startTime: inDays(4, 21, 0), sportName: 'Football', competitionId: 'c-uel', competitionName: 'UEFA Europa League', nationName: 'World', nationCode: null, staleAfterSeconds: 900 },
    flamengo: { eventId: 'ev-6', homeName: 'Flamengo', awayName: 'River Plate', startTime: inDays(6, 2, 30), sportName: 'Football', competitionId: 'c-lib', competitionName: 'CONMEBOL Libertadores', nationName: 'World', nationCode: null, staleAfterSeconds: 3600 },
    lakers: { eventId: 'ev-4', homeName: 'LA Lakers', awayName: 'Boston Celtics', startTime: inDays(1, 2, 0), sportName: 'Basketball', competitionId: 'c-nba', competitionName: 'NBA', nationName: 'USA', nationCode: 'US', staleAfterSeconds: 900 },
};
const market = (key, line, extra = {}) => ({ marketTypeKey: key, line, canonicalMarketId: `mk-${key}-${line ?? 'x'}-${extra.periodScope ?? 'ft'}`, handicap: null, periodScope: 'full_time', teamScope: null, ...extra });
const backLayRating = (b, l) => (b * (1 - C)) / (l - C) * 100;
const dutchRating = (nets) => 100 / nets.reduce((s, q) => s + 1 / q, 0);

const ROWS = [
    { ...EVENTS.genoa, ...market('over_under', 2.5), matchType: 'back_lay', legs: [leg('sisal', 'over', 'BACK Over', 2.05, 40), leg('betfair', 'over', 'LAY Over', 2.02, 20)], rating: backLayRating(2.05, 2.02) },
    { ...EVENTS.genoa, ...market('over_under', 2.5), matchType: 'back_lay', legs: [leg('bwin', 'under', 'BACK Under', 1.85, 120), leg('betfair', 'under', 'LAY Under', 1.9, 20)], rating: backLayRating(1.85, 1.9) },
    { ...EVENTS.genoa, ...market('over_under', 2.5), matchType: 'dutch_2way', legs: [leg('sisal', 'over', 'Over', 2.05, 40), leg('betfair', 'under', 'Under', net(2.1), 20)], rating: dutchRating([2.05, net(2.1)]) },
    { ...EVENTS.genoa, ...market('over_under', 2.5), matchType: 'dutch_2way', legs: [leg('sisal', 'over', 'Over', 2.05, 40), leg('bwin', 'under', 'Under', 1.85, 120)], rating: dutchRating([2.05, 1.85]) },
    { ...EVENTS.genoa, ...market('1x2', null), matchType: 'dutch_3way', legs: [leg('bwin', 'home', '1', 2.1, 120), leg('sisal', 'draw', 'X', 3.6, 40), leg('betsson', 'away', '2', 3.9, 700)], rating: dutchRating([2.1, 3.6, 3.9]) },
    { ...EVENTS.genoa, ...market('1x2', null), matchType: 'dutch_3way', legs: [leg('goldbet', 'home', '1', 2.15, 200), leg('sisal', 'draw', 'X', 3.6, 40), leg('betfair', 'away', '2', net(4.1), 20)], rating: dutchRating([2.15, 3.6, net(4.1)]) },
    { ...EVENTS.lazio, ...market('btts', null), matchType: 'back_lay', legs: [leg('goldbet', 'yes', 'BACK GG', 1.95, 200), leg('betfair', 'yes', 'LAY GG', 1.98, 25)], rating: backLayRating(1.95, 1.98) },
    { ...EVENTS.lazio, ...market('over_under', 3.5, { periodScope: 'first_half' }), matchType: 'dutch_2way', legs: [leg('xsport', 'over', 'Over', 12.0, 400), leg('bwin', 'under', 'Under', 1.06, 120)], rating: dutchRating([12.0, 1.06]) },
    { ...EVENTS.arsenal, ...market('double_chance', null), matchType: 'dutch_2way', legs: [leg('betsson', '1x', '1X', 1.45, 2500), leg('sisal', '2', '2', 3.7, 2400)], rating: dutchRating([1.45, 3.7]) },
    { ...EVENTS.arsenal, ...market('handicap_asian', null, { handicap: -0.5, canonicalMarketId: 'mk-ah' }), matchType: 'back_lay', legs: [leg('bwin', 'home', 'BACK Arsenal -0.5', 1.9, 2600), leg('betfair', 'home', 'LAY Arsenal -0.5', 1.88, 2400)], rating: backLayRating(1.9, 1.88) },
    { ...EVENTS.celtic, ...market('over_under', 0.5), matchType: 'back_lay', legs: [leg('goldbet', 'over', 'BACK Over', 1.03, 60), leg('betfair', 'over', 'LAY Over', 1.05, 20)], rating: backLayRating(1.03, 1.05) },
    { ...EVENTS.flamengo, ...market('1x2', null), matchType: 'dutch_3way', legs: [leg('goldbet', 'home', '1', 2.4, 60), leg('sisal', 'draw', 'X', 3.2, 40), leg('betfair', 'away', '2', net(3.4), 20)], rating: dutchRating([2.4, 3.2, net(3.4)]) },
    { ...EVENTS.lakers, ...market('over_under', 220.5), matchType: 'dutch_2way', legs: [leg('sisal', 'over', 'Over', 1.95, 30), leg('betsson', 'under', 'Under', 2.0, 45)], rating: dutchRating([1.95, 2.0]) },
    { ...EVENTS.lakers, ...market('draw_no_bet', null), matchType: 'back_lay', legs: [leg('betsson', 'home', 'BACK LA Lakers', 1.7, 45), leg('betfair', 'home', 'LAY LA Lakers', 1.66, 15)], rating: backLayRating(1.7, 1.66) },
    // §14.339: more back on Sisal / lay on Betfair, the rows of the free Oddsmatcher.
    { ...EVENTS.lazio, ...market('1x2', null), matchType: 'back_lay', legs: [leg('sisal', 'home', 'BACK 1', 2.6, 50), leg('betfair', 'home', 'LAY 1', 2.64, 20)], rating: backLayRating(2.6, 2.64) },
    { ...EVENTS.arsenal, ...market('over_under', 2.5), matchType: 'back_lay', legs: [leg('sisal', 'over', 'BACK Over', 1.72, 2500), leg('betfair', 'over', 'LAY Over', 1.75, 2400)], rating: backLayRating(1.72, 1.75) },
    { ...EVENTS.celtic, ...market('1x2', null), matchType: 'back_lay', legs: [leg('sisal', 'away', 'BACK 2', 5.5, 60), leg('betfair', 'away', 'LAY 2', 5.9, 20)], rating: backLayRating(5.5, 5.9) },
].map((r) => ({ ...r, rating: Math.round(r.rating * 100) / 100 }));

const META = {
    totalResults: ROWS.length,
    calculatedAt: ago(35),
    exchangeCommission: C,
    sports: ['Basketball', 'Football'],
    bookmakers: Object.values(BOOKMAKERS).map(({ slug, name, isExchange }) => ({ slug, name, isExchange })),
    marketTypes: ['1x2', 'btts', 'double_chance', 'draw_no_bet', 'handicap_asian', 'over_under'],
    nations: ['England', 'Italy', 'USA', 'World'],
    competitions: [
        { id: 'c-seriea', name: 'Serie A', nationName: 'Italy', nationCode: 'IT', sportName: 'Football', results: 7 },
        { id: 'c-pl', name: 'Premier League', nationName: 'England', nationCode: 'GB', sportName: 'Football', results: 3 },
        { id: 'c-nba', name: 'NBA', nationName: 'USA', nationCode: 'US', sportName: 'Basketball', results: 2 },
        { id: 'c-uel', name: 'UEFA Europa League', nationName: 'World', nationCode: null, sportName: 'Football', results: 2 },
        { id: 'c-lib', name: 'CONMEBOL Libertadores', nationName: 'World', nationCode: null, sportName: 'Football', results: 1 },
    ],
};

// §14.122: «Risultato + Goal», il mercato 1X2 + GG/NG confrontato dentro il book (senza X & NG).
const RB_PRICE = (odds, label) => ({ odds, label, lastSeenAt: ago(40) });
// §14.177: the dutch over the five outcomes of 1X2 + GG/NG but «X & NG» (the 0-0, refunded by the bookmaker).
// A row carries its five legs (labelled as the backend labels them) and the 0-0 price for information; rating = 100 / Σ 1/q.
// marketTypeKey / marketKey / line / meta.market: fields of the §14.174 shape, kept so a checkout of that page still renders.
const RB_LEG = (outcomeKey, label, odds) => ({ marketTypeKey: 'result_btts', outcomeKey, label, odds, lastSeenAt: ago(40) });
/** q: the six prices in canonical order (1&GG, 1&NG, X&GG, X&NG, 2&GG, 2&NG); a null X&NG leaves the 0-0 unpriced. */
const rbRow = (ev, slug, q, url) => {
    const legs = [RB_LEG('home_yes', '1 & GG', q[0]), RB_LEG('home_no', '1 & NG', q[1]), RB_LEG('draw_yes', 'X & GG', q[2]), RB_LEG('away_yes', '2 & GG', q[4]), RB_LEG('away_no', '2 & NG', q[5])];
    const zeroZero = q[3] ? RB_PRICE(q[3], 'X & NG') : null;
    const rating = Math.round(dutchRating(legs.map((l) => l.odds)) * 100) / 100;
    const bookSum = zeroZero ? Math.round((legs.reduce((s, l) => s + 1 / l.odds, 0) + 1 / zeroZero.odds) * 10000) / 10000 : null;
    return { ...ev, bookmakerId: BOOKMAKERS[slug].id, bookmakerSlug: slug, bookmakerName: BOOKMAKERS[slug].name, eventUrl: url ?? EVENT_URLS[slug] ?? null, canonicalMarketId: `mk-rb-${ev.eventId}`, marketKey: 'result_btts', line: null, legs, zeroZero, rating, bookSum, lastSeenAt: ago(40) };
};
BOOKMAKERS.bet365 = { id: 'b-bet365', slug: 'bet365', name: 'Bet365', isExchange: false };
const RB_ROWS = [
    rbRow(EVENTS.genoa, 'bet365', [5.5, 6.0, 4.33, 11.0, 4.33, 4.33], 'https://www.bet365.it/#/AX/K%5EGenoa/'),
    rbRow(EVENTS.lazio, 'bet365', [4.33, 5.5, 4.33, 15.0, 4.33, 5.0], 'https://www.bet365.it/#/AX/K%5ELazio/'),
    rbRow(EVENTS.arsenal, 'bet365', [2.87, 2.2, 6.0, 15.0, 17.0, 19.0], 'https://www.bet365.it/#/AX/K%5EArsenal/'),
    rbRow(EVENTS.arsenal, 'bwin', [3.0, 2.3, 6.2, null, 18.0, 20.0]),
    rbRow(EVENTS.celtic, 'bet365', [1.9, 4.5, 7.0, 21.0, 15.0, 26.0], 'https://www.bet365.it/#/AX/K%5ECeltic/'),
    rbRow(EVENTS.flamengo, 'bet365', [3.6, 4.0, 3.75, null, 6.0, 8.5]),
];
// §14.288: «Rimborso 0-0» on the Correct Score — bet365 back, Sportmarket lays, the formula of the backend service.
function rzLine(stake, c, label, back, lay, layZero, lastSeenAt) {
    const l = (stake * back) / (lay - c); const ql = stake - l * (1 - c); const m = stake / (layZero - c); const profit = m * (1 - c) - ql;
    const r2 = (v) => Math.round(v * 100) / 100;
    return { outcomeKey: label.replace("-", "_"), label, back: { odds: back, label, lastSeenAt }, lay: { odds: lay, label, lastSeenAt },
        layStake: r2(l), layLiability: r2(l * (lay - 1)), zeroLayStake: r2(m), zeroLiability: r2(m * (layZero - 1)), qualifyingLoss: r2(ql),
        profit: r2(profit), profitPct: Math.round((profit / stake) * 10000) / 100,
        cases: { scoreWins: r2(stake * (back - 1) - l * (lay - 1) + m * (1 - c)), otherResult: r2(-stake + l * (1 - c) + m * (1 - c)), zeroZero: r2(l * (1 - c) - m * (layZero - 1)) } };
}
const RZ_EVENTS = [
    { eventId: "rz-1", homeName: "Parma", awayName: "Udinese", startTime: new Date(Date.now() + 5 * 3600e3).toISOString(), competitionId: "c-seriea", competitionName: "Serie A", nationName: "Italy", nationCode: "IT", zeroLay: 11, zeroBack: 10.5, lines: [["1-0", 10.5, 10.5], ["1-1", 7.2, 7.4], ["2-1", 9.5, 10], ["0-1", 10, 10.5]] },
    { eventId: "rz-2", homeName: "Milan", awayName: "Bologna", startTime: new Date(Date.now() + 6 * 3600e3).toISOString(), competitionId: "c-seriea", competitionName: "Serie A", nationName: "Italy", nationCode: "IT", zeroLay: 10.5, zeroBack: 9, lines: [["1-0", 6.5, 6.6], ["2-1", 8.5, 9.4], ["1-1", 6.5, 7]] },
    // §14.294: the same promotion on Result & BTTS (bet365's own market), the 0-0 laid as the Correct Score 0-0.
    { eventId: "rz-1", market: "result_btts", homeName: "Parma", awayName: "Udinese", startTime: new Date(Date.now() + 5 * 3600e3).toISOString(), competitionId: "c-seriea", competitionName: "Serie A", nationName: "Italy", nationCode: "IT", zeroLay: 11, zeroBack: 10.2, zeroLabel: "0-0", zeroMarket: "correct_score", lines: [["1 & GG", 4.5, 4.55], ["1 & NG", 5.0, 5.3], ["X & GG", 4.33, 4.6], ["2 & NG", 9.0, 9.8]] },
    { eventId: "rz-3", homeName: "Pisa", awayName: "Palermo", startTime: new Date(Date.now() + 30 * 3600e3).toISOString(), competitionId: "c-serieb", competitionName: "Serie B", nationName: "Italy", nationCode: "IT", zeroLay: 13.5, zeroBack: 12, lines: [["1-0", 7, 9.2], ["1-1", 6, 7.6]] },
];
function buildRefundZeroRows(stake, c) {
    const seen = ago(90);
    return RZ_EVENTS.map((e) => {
        const lines = e.lines.map(([label, back, lay]) => rzLine(stake, c, label, back, lay, e.zeroLay, seen)).sort((a, b) => b.profit - a.profit);
        const market = e.market || "correct_score";
        return { eventId: e.eventId, market, marketLabel: market === "result_btts" ? "Risultato + Goal" : "Risultato esatto", homeName: e.homeName, awayName: e.awayName, startTime: e.startTime, sportName: "Football", competitionId: e.competitionId, competitionName: e.competitionName, nationName: e.nationName, nationCode: e.nationCode,
            backBookmaker: { id: "b-bet365", slug: "bet365", name: "Bet365", eventUrl: "https://www.bet365.it/#/HO/" }, layBookmaker: { id: "b-sportmarket", slug: "sportmarket", name: "Sportmarket", eventUrl: "https://pro.sportmarket.com/trade/football/full-time" },
            stake, commission: c, best: lines[0], lines, zeroZero: { lay: { odds: e.zeroLay, label: e.zeroLabel || "0-0", lastSeenAt: seen, market: e.zeroMarket || "correct_score" }, back: { odds: e.zeroBack, label: market === "result_btts" ? "X & NG" : "0-0", lastSeenAt: seen } }, lastSeenAt: seen, staleAfterSeconds: 900 };
    });
}
function filterRefundZero(params) {
    const get = (k) => params.get(k);
    const stake = parseFloat(get("stake") || "100") > 0 ? parseFloat(get("stake") || "100") : 100;
    let c = parseFloat(get("commission") ?? "0"); if (!Number.isFinite(c)) c = 0; if (c > 1) c /= 100;
    const all = buildRefundZeroRows(stake, c);
    let rows = all;
    if (get("search")) { const s = get("search").toLowerCase(); rows = rows.filter((r) => `${r.homeName} ${r.awayName} ${r.competitionName}`.toLowerCase().includes(s)); }
    if (get("competitions")) { const ids = new Set(get("competitions").split(",")); rows = rows.filter((r) => ids.has(r.competitionId)); }
    if (get("market")) rows = rows.filter((r) => r.market === get("market"));
    if (get("min_profit")) rows = rows.filter((r) => r.best.profit >= parseFloat(get("min_profit")));
    if (get("start_time_from")) rows = rows.filter((r) => r.startTime >= get("start_time_from"));
    if (get("start_time_to")) rows = rows.filter((r) => r.startTime <= get("start_time_to"));
    const dir = get("sort_dir") === "ASC" ? 1 : -1;
    rows = [...rows].sort((a, b) => { const x = get("sort_by") === "start_time" ? a.startTime.localeCompare(b.startTime) : a.best.profit - b.best.profit; return x * dir; });
    const limit = Math.min(parseInt(get("limit") || "50", 10), 200); const offset = parseInt(get("offset") || "0", 10);
    const competitions = new Map();
    for (const r of all) { const k = competitions.get(r.competitionId) ?? { id: r.competitionId, name: r.competitionName, nationName: r.nationName, nationCode: r.nationCode, sportName: r.sportName, results: 0 }; k.results += 1; competitions.set(r.competitionId, k); }
    return { results: rows.slice(offset, offset + limit), total: rows.length, calculatedAt: ago(20), meta: { totalResults: all.length, stake, commission: c, markets: ["result_btts", "correct_score"].map((k) => ({ key: k, label: k === "result_btts" ? "Risultato + Goal" : "Risultato esatto", results: all.filter((r) => r.market === k).length })), backBookmakers: [{ slug: "bet365", name: "Bet365" }], layBookmakers: [{ slug: "sportmarket", name: "Sportmarket" }], competitions: [...competitions.values()] } };
}

function filterResultBtts(params) {
    const get = (k) => params.get(k);
    const marketRows = RB_ROWS;
    let rows = marketRows;
    if (get('search')) { const s = get('search').toLowerCase(); rows = rows.filter((r) => `${r.homeName} ${r.awayName} ${r.competitionName}`.toLowerCase().includes(s)); }
    if (get('competitions')) { const ids = new Set(get('competitions').split(',')); rows = rows.filter((r) => ids.has(r.competitionId)); }
    if (get('bookmaker')) { const slugs = new Set(get('bookmaker').split(',')); rows = rows.filter((r) => slugs.has(r.bookmakerSlug)); }
    if (get('min_rating')) rows = rows.filter((r) => r.rating >= parseFloat(get('min_rating')));
    if (get('start_time_from')) rows = rows.filter((r) => r.startTime >= get('start_time_from'));
    if (get('start_time_to')) rows = rows.filter((r) => r.startTime <= get('start_time_to'));
    const dir = get('sort_dir') === 'ASC' ? 1 : -1;
    const key = get('sort_by') === 'start_time' ? 'startTime' : 'rating';
    rows = [...rows].sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
    const limit = Math.min(parseInt(get('limit') || '50', 10), 200);
    const offset = parseInt(get('offset') || '0', 10);
    const competitions = new Map();
    for (const r of marketRows) { const c = competitions.get(r.competitionId) ?? { id: r.competitionId, name: r.competitionName, nationName: r.nationName, nationCode: r.nationCode, sportName: r.sportName, results: 0 }; c.results += 1; competitions.set(r.competitionId, c); }
    const bookmakers = [...new Map(marketRows.map((r) => [r.bookmakerSlug, { slug: r.bookmakerSlug, name: r.bookmakerName }])).values()];
    return { results: rows.slice(offset, offset + limit), total: rows.length, calculatedAt: ago(20), meta: { totalResults: marketRows.length, market: 'result_btts', bookmakers, competitions: [...competitions.values()] } };
}

const HOLDERS = [
    { id: 'h1', nome: 'Emanuele', descrizione: 'Collaboratore con descrizione da svuotare', stato: 'abilitato' },
    { id: 'h2', nome: 'Marco', stato: 'abilitato' },
    // §14.242: collaborators with a Bet365 account each, balances from poor to rich.
    { id: 'h3', nome: 'Lucia', stato: 'abilitato' },
    { id: 'h4', nome: 'Carla', stato: 'abilitato' },
    { id: 'h5', nome: 'Davide', stato: 'abilitato' },
    { id: 'h6', nome: 'Livia', stato: 'abilitato' },
    { id: 'h7', nome: 'Paolo (disabilitato)', stato: 'disabilitato' },
];
const BOOKS = [
    { id: 'pt-sisal', nome: 'Sisal.it', descrizione: 'Book con descrizione da svuotare', isExchange: false, externalId: null },
    { id: 'pt-bwin', nome: 'Bwin', isExchange: false, externalId: 'bwin' },
    { id: 'pt-betsson', nome: 'Betsson', isExchange: false, externalId: null },
    { id: 'pt-goldbet', nome: 'Lottomatica', isExchange: false, externalId: 'goldbet' },
    { id: 'pt-betfair', nome: 'Betfair', isExchange: true, externalId: null },
    { id: 'pt-betfair-sb', nome: 'Betfair Sportsbook', isExchange: false, externalId: null },
    // §14.242: the book behind the «Risultato + Goal» rows, linked by external id.
    { id: 'pt-bet365', nome: 'Bet365', isExchange: false, externalId: 'bet365' },
];
const ACCOUNTS = [
    { id: 'a1', holderId: 'h1', bookId: 'pt-sisal', nome: 'Sisal Emanuele', descrizione: 'Conto con descrizione da svuotare', saldoAttuale: 120, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'a2', holderId: 'h2', bookId: 'pt-sisal', nome: 'Sisal Marco', saldoAttuale: 50, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'a3', holderId: 'h1', bookId: 'pt-betfair', nome: 'Betfair Emanuele', saldoAttuale: 900, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'a4', holderId: 'h1', bookId: 'pt-bwin', nome: 'Bwin Emanuele', saldoAttuale: 80, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'a5', holderId: 'h2', bookId: 'pt-betsson', nome: 'Betsson Marco', saldoAttuale: 30, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'a6', holderId: 'h1', bookId: 'pt-goldbet', nome: 'Lottomatica Emanuele', saldoAttuale: 60, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    // §14.106: ogni PATCH su questo conto risponde 500, per vedere toast e errore nella modale.
    { id: 'a7', holderId: 'h2', bookId: 'pt-bwin', nome: 'Bwin Marco (PATCH fallisce)', descrizione: 'Il mock rifiuta ogni modifica', saldoAttuale: 15, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    // §14.242: six Bet365 accounts (one is blocked, one is on a suspended holder) for the recommended accounts.
    { id: 'b365-1', holderId: 'h1', bookId: 'pt-bet365', nome: 'Bet365 Emanuele', saldoAttuale: 420, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'b365-2', holderId: 'h2', bookId: 'pt-bet365', nome: 'Bet365 Marco', saldoAttuale: 95, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'b365-3', holderId: 'h3', bookId: 'pt-bet365', nome: 'Bet365 Lucia', saldoAttuale: 180, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'b365-4', holderId: 'h4', bookId: 'pt-bet365', nome: 'Bet365 Carla', saldoAttuale: 640, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'b365-5', holderId: 'h5', bookId: 'pt-bet365', nome: 'Bet365 Davide', saldoAttuale: 260, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'b365-6', holderId: 'h6', bookId: 'pt-bet365', nome: 'Bet365 Livia (bloccato)', saldoAttuale: 900, stato: 'abilitato', bloccato: true, createdAt: ago(86400) },
    { id: 'b365-7', holderId: 'h7', bookId: 'pt-bet365', nome: 'Bet365 Paolo', saldoAttuale: 50, stato: 'disabilitato', bloccato: false, createdAt: ago(86400) },
];
const saved = { bets: [], legs: [], patches: [] };
// §14.110: giocate rapide. La data di registrazione è la mezzanotte UTC del giorno
// scelto (come fa la modale), quindi tre giocate dello stesso giorno si distinguono
// solo per createdAt: l'elenco deve uscire dalla più recente alla più vecchia.
const dayIso = (d) => new Date(now + d * 86_400_000).toISOString().slice(0, 10) + 'T00:00:00.000Z';
const QUICK_BETS = [
    { id: 'qb1', accountId: 'a1', quickMethod: 'slot_machine', movimento: -20, dataRegistrazione: dayIso(-3), tag: 'bonus', nota: 'Book of Ra', createdAt: ago(3 * 86400 + 3600), updatedAt: ago(3 * 86400 + 3600) },
    { id: 'qb2', accountId: 'a2', quickMethod: 'casino_live', movimento: 45.5, dataRegistrazione: dayIso(-1), nota: 'Prima sessione', createdAt: ago(86400 + 7200), updatedAt: ago(86400 + 7200) },
    { id: 'qb3', accountId: 'a3', quickMethod: 'roulette', movimento: -12, dataRegistrazione: dayIso(-1), tag: 'test', createdAt: ago(86400 + 3600), updatedAt: ago(86400 + 3600) },
    { id: 'qb4', accountId: 'a1', quickMethod: 'blackjack', movimento: 30, dataRegistrazione: dayIso(-1), createdAt: ago(86400 + 600), updatedAt: ago(86400 + 600) },
    { id: 'qb5', accountId: 'a5', quickMethod: 'gratta_e_vinci', movimento: 5, dataRegistrazione: dayIso(0), nota: 'Turista per sempre', createdAt: ago(1800), updatedAt: ago(1800) },
];
// §14.293: lo stesso contratto di listQuickBets (giorni nel fuso di Roma, tutte le parole cercate).
const romeDay = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
function quickBetsPage(sp) {
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 10));
    const words = (sp.get('q') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const [accountId, method, tag, dal, al] = ['accountId', 'method', 'tag', 'dal', 'al'].map((k) => sp.get(k));
    let rows = quickBetsNewestFirst(QUICK_BETS).filter((b) => {
        if (accountId && b.accountId !== accountId) return false;
        if (method && b.quickMethod !== method) return false;
        if (tag === '__none__' ? !!b.tag : tag && b.tag !== tag) return false;
        if (dal && romeDay(b.dataRegistrazione) < dal) return false;
        if (al && romeDay(b.dataRegistrazione) > al) return false;
        const acc = ACCOUNTS.find((a) => a.id === b.accountId);
        const hay = [BOOKS.find((x) => x.id === acc?.bookId)?.nome, HOLDERS.find((x) => x.id === acc?.holderId)?.nome, acc?.nome, b.quickMethod.replace(/_/g, ' '), b.nota, b.tag].filter(Boolean).join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
    });
    const sort = sp.get('sort');
    if (sort === 'alto' || sort === 'basso') {
        const sign = sort === 'alto' ? -1 : 1;
        const order = new Map(rows.map((r, i) => [r.id, i]));
        rows = [...rows].sort((x, y) => sign * (x.movimento - y.movimento) || order.get(x.id) - order.get(y.id));
    }
    const total = rows.length;
    const page = Math.min(Math.max(1, Number(sp.get('page')) || 1), Math.max(1, Math.ceil(total / limit)));
    return { items: rows.slice((page - 1) * limit, page * limit), total, page, limit };
}
// §14.298: lo stesso contratto di listArchivedBets (profitto = somma dei movimenti delle gambe,
// rimborsata se tutte annullate, eliminabile senza gambe in corso/vinte/perse, giorni nel fuso di Roma).
function archivedBetsPage(sp) {
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 10));
    const words = (sp.get('q') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const get = (k) => sp.get(k) || '';
    const rows = BETS.filter((b) => b.archiviata).map((b) => {
        // La PATCH generica del mock non scrive la data: la mette la prima lettura dopo l'archiviazione.
        if (!b.archiviataAt) b.archiviataAt = iso(Date.now());
        const legs = LEGS.filter((l) => l.betId === b.id);
        const profitto = Math.round(legs.reduce((s, l) => s + (Number(l.movimento) || 0), 0) * 100) / 100;
        const esito = legs.length > 0 && legs.every((l) => l.statoEvento === 'annullato') ? 'void' : profitto >= 0 ? 'profit' : 'loss';
        const eliminabile = legs.every((l) => l.statoEvento === 'bozza' || l.statoEvento === 'annullato');
        return { ...b, profitto, esito, eliminabile, riepilogoGambe: legSummaryOf(b.id), _legs: legs };
    }).filter((b) => {
        if (get('sport') && b.sport !== get('sport')) return false;
        if (get('accountId') && b.accountId !== get('accountId')) return false;
        if (get('modalitaSaldo') && b.modalitaSaldo !== get('modalitaSaldo')) return false;
        if (get('esito') && b.esito !== get('esito')) return false;
        if (get('tag') === '__none__' ? !!b.tag : get('tag') && b.tag !== get('tag')) return false;
        const multi = b.eventoNome.toUpperCase().startsWith('MULTIPLA');
        if (get('tipo') && (multi ? 'multipla' : 'singola') !== get('tipo')) return false;
        if (get('dal') && romeDay(b.eventoData) < get('dal')) return false;
        if (get('al') && romeDay(b.eventoData) > get('al')) return false;
        const acc = ACCOUNTS.find((a) => a.id === b.accountId);
        const hay = [b.id, b.eventoNome, ...b._legs.map((l) => `${l.eventoNome} ${l.competizione}`), BOOKS.find((x) => x.id === acc?.bookId)?.nome, HOLDERS.find((x) => x.id === acc?.holderId)?.nome, acc?.nome].filter(Boolean).join(' ').toLowerCase();
        return words.every((w) => hay.includes(w));
    });
    const newest = (x, y) => (x.eventoData < y.eventoData ? 1 : x.eventoData > y.eventoData ? -1 : x.createdAt < y.createdAt ? 1 : -1);
    const sort = get('sort');
    rows.sort((x, y) => sort === 'archiviazione' ? (x.archiviataAt < y.archiviataAt ? 1 : x.archiviataAt > y.archiviataAt ? -1 : newest(x, y))
        : sort === 'profitto' ? y.profitto - x.profitto || newest(x, y) : newest(x, y));
    const total = rows.length;
    const page = Math.min(Math.max(1, Number(sp.get('page')) || 1), Math.max(1, Math.ceil(total / limit)));
    return { items: rows.slice((page - 1) * limit, page * limit).map(({ _legs, ...b }) => b), total, page, limit };
}
const quickBetsNewestFirst = (rows) => [...rows].sort((a, b) =>
    a.dataRegistrazione !== b.dataRegistrazione ? (a.dataRegistrazione < b.dataRegistrazione ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1);


// §14.109: il catalogo dei metodi di pagamento; un wallet = collaboratore × metodo, con il nome del metodo.
const PAYMENT_METHODS = [
    { id: 'pm-paypal', slug: 'paypal', nome: 'PayPal', descrizione: null, attivo: true, createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'pm-skrill', slug: 'skrill', nome: 'Skrill', descrizione: null, attivo: true, createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'pm-revolut', slug: 'revolut', nome: 'Revolut', descrizione: 'Conto business', attivo: true, createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'pm-neteller', slug: 'neteller', nome: 'Neteller', descrizione: null, attivo: false, createdAt: ago(86400), updatedAt: ago(86400) },
];
// §14.103: wallet, giocate con gambe e book globali per le modali di modifica.
const WALLETS = [
    { id: 'w1', holderId: 'h1', paymentMethodId: 'pm-paypal', nome: 'PayPal', descrizione: 'Wallet con descrizione da svuotare', saldoAttuale: 250, inAttesa: 60, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
    { id: 'w2', holderId: 'h2', paymentMethodId: 'pm-skrill', nome: 'Skrill', saldoAttuale: 40, inAttesa: 0, stato: 'abilitato', bloccato: false, createdAt: ago(86400) },
];
// §14.111: categorie dei movimenti di wallet (catalogo globale) e movimenti con categoria.
const mc = (slug, nome, direzione, natura, ordine, attivo = true) => ({ id: `mc-${slug}`, slug, nome, descrizione: null, direzione, natura, attivo, ordine, createdAt: ago(86400), updatedAt: ago(86400) });
const MOVEMENT_CATEGORIES = [
    mc('stipendio', 'Stipendio', 'entrata', 'reddito', 1),
    mc('altra-entrata', 'Altra entrata', 'entrata', 'reddito', 2),
    mc('capitale-versato', 'Capitale proprio versato', 'entrata', 'capitale', 3),
    mc('compenso-identita', 'Compenso identità', 'uscita', 'costo_attivita', 4),
    mc('commissioni', 'Commissioni', 'uscita', 'costo_attivita', 5),
    mc('altro-costo-attivita', "Altro costo dell'attività", 'uscita', 'costo_attivita', 6),
    mc('spesa-personale', 'Spesa personale', 'uscita', 'spesa_personale', 7),
    mc('capitale-ritirato', 'Capitale proprio ritirato', 'uscita', 'capitale', 8),
];
const monthDay = (d, hour = 10) => { const t = new Date(now); t.setUTCDate(d); t.setUTCHours(hour, 0, 0, 0); return t.toISOString(); };
const WALLET_MOVEMENTS = [
    // Riga precedente alla 0010: senza categoria, «da classificare», fuori dal report.
    { id: 'wm1', walletId: 'w1', tipo: 'ricarica', valore: 100, dataRegistrazione: monthDay(2), descrizione: 'ricarica vecchia', categoryId: null, holderId: null, createdAt: monthDay(2), updatedAt: monthDay(2) },
    { id: 'wm2', walletId: 'w1', tipo: 'ricarica', valore: 1800, dataRegistrazione: monthDay(5), descrizione: 'Stipendio', categoryId: 'mc-stipendio', holderId: null, createdAt: monthDay(5), updatedAt: monthDay(5) },
    { id: 'wm3', walletId: 'w1', tipo: 'ricarica', valore: 2000, dataRegistrazione: monthDay(6), descrizione: 'Dal conto in banca', categoryId: 'mc-capitale-versato', holderId: null, createdAt: monthDay(6), updatedAt: monthDay(6) },
    { id: 'wm4', walletId: 'w1', tipo: 'spesa', valore: 250, dataRegistrazione: monthDay(8), descrizione: 'Compenso Marco', categoryId: 'mc-compenso-identita', holderId: 'h2', createdAt: monthDay(8), updatedAt: monthDay(8) },
    { id: 'wm5', walletId: 'w1', tipo: 'spesa', valore: 50, dataRegistrazione: monthDay(9), descrizione: 'Commissione prelievo', categoryId: 'mc-commissioni', holderId: null, createdAt: monthDay(9), updatedAt: monthDay(9) },
    { id: 'wm6', walletId: 'w1', tipo: 'spesa', valore: 600, dataRegistrazione: monthDay(10), descrizione: 'Affitto', categoryId: 'mc-spesa-personale', holderId: null, createdAt: monthDay(10), updatedAt: monthDay(10) },
    { id: 'wm7', walletId: 'w1', tipo: 'spesa', valore: 1000, dataRegistrazione: monthDay(11), descrizione: 'In banca', categoryId: 'mc-capitale-ritirato', holderId: null, createdAt: monthDay(11), updatedAt: monthDay(11) },
    { id: 'wm8', walletId: null, tipo: 'trasferimento', fromWalletId: 'w1', toWalletId: 'w2', valore: 5, dataRegistrazione: monthDay(12), descrizione: null, categoryId: null, holderId: null, createdAt: monthDay(12), updatedAt: monthDay(12) },
];
const categoryOf = (m) => (m.categoryId ? MOVEMENT_CATEGORIES.find((c) => c.id === m.categoryId) ?? null : null);
const withCategory = (m) => { const c = categoryOf(m); return { ...m, categoriaSlug: c ? c.slug : null, categoriaNome: c ? c.nome : null, natura: c ? c.natura : null }; };
const categoryInUse = (id) => WALLET_MOVEMENTS.filter((m) => m.categoryId === id).length;
// §14.109: movimenti conto con lo stato del prelievo (w1 ha 60 in attesa da a1).
const ACCOUNT_MOVEMENTS = [
    { id: 'am1', accountId: 'a1', tipo: 'prelievo', walletId: 'w1', valore: 60, dataRegistrazione: ago(7200), descrizione: 'Prelievo in attesa di prova', stato: 'in_attesa', dataPagamento: null, accountNome: 'Sisal Emanuele', holderId: 'h1', walletNome: 'PayPal' },
    { id: 'am2', accountId: 'a1', tipo: 'prelievo', walletId: 'w1', valore: 25, dataRegistrazione: ago(86400 * 2), descrizione: 'Prelievo già pagato', stato: 'pagato', dataPagamento: ago(86400), accountNome: 'Sisal Emanuele', holderId: 'h1', walletNome: 'PayPal' },
    { id: 'am3', accountId: 'a3', tipo: 'deposito', walletId: 'w1', valore: 100, dataRegistrazione: ago(86400 * 3), descrizione: null, stato: 'pagato', dataPagamento: null, accountNome: 'Betfair Emanuele', holderId: 'h1', walletNome: 'PayPal' },
];
const LEGS = [];
const BETS = [
    { id: '101', eventoData: inDays(2), categoria: 'matched_betting', sport: 'calcio', eventoNome: 'Genoa - Como', modalitaSaldo: 'reale', accountId: 'a1', nota: 'Nota da svuotare', statoEvento: 'in_corso', archiviata: false, eventoNotificato: false, hasOpenLegs: true, createdAt: ago(3600) },
    { id: '102', eventoData: inDays(3, 20, 45), categoria: 'surebet', sport: 'calcio', eventoNome: 'Lazio - Roma', modalitaSaldo: 'reale', accountId: 'a3', nota: 'Nota del dettaglio', statoEvento: 'in_corso', archiviata: false, eventoNotificato: false, hasOpenLegs: true, createdAt: ago(3600) },
    // §14.281: giocate in corso dal design. Una già iniziata (notificata), una multipla, una in bonus con tag.
    { id: '103', eventoData: ago(1800), categoria: 'matched_betting', sport: 'calcio', eventoNome: 'Palermo - Venezia', modalitaSaldo: 'reale', accountId: 'a4', statoEvento: 'in_corso', archiviata: false, eventoNotificato: true, hasOpenLegs: true, createdAt: ago(5 * 3600) },
    { id: '104', eventoData: inDays(5, 15, 0), categoria: 'matched_betting', sport: 'calcio', eventoNome: 'MULTIPLA Milan - Lazio', modalitaSaldo: 'bonus', accountId: 'b365-2', tag: 'Benvenuto Bet365', nota: 'Multipla bonus 3 eventi, rimborso se perde una', statoEvento: 'in_corso', archiviata: false, eventoNotificato: false, hasOpenLegs: true, createdAt: ago(3 * 86400) },
    { id: '105', eventoData: inDays(1, 18, 0), categoria: 'valuebet', sport: 'tennis', eventoNome: 'Sinner - Alcaraz', modalitaSaldo: 'bonus', accountId: 'a6', statoEvento: 'in_corso', archiviata: false, eventoNotificato: false, hasOpenLegs: true, createdAt: ago(2 * 86400) },
    // §14.298: giocate archiviate dal design (13 righe, due pagine da 10): singole vinte e perse,
    // una multipla, una rimborsata (gambe annullate, l'unica eliminabile), tennis e basket, tag e note.
    ...[
        ['201', -1, 23, 'calcio', 'Argentinos Juniors - Independiente Rivadavia', 'b365-1', 'reale', [[8.33, 'vinto', 'Primera División', 'Cartellini', 'Under 4,5', 3.25]], { archived: 0.4 }],
        ['202', -1, 23, 'calcio', 'Argentinos Juniors - Independiente Rivadavia', 'b365-2', 'bonus', [[15.2, 'vinto', 'Primera División', '1X2', '2', 3.4]], { archived: 0.4, tag: 'Benvenuto Bet365', nota: 'Free bet SNR 10 €' }],
        ['203', -1, 20, 'calcio', 'Roma - Cagliari', 'a1', 'reale', [[2.4, 'vinto', 'Serie A', '1X2', '1', 1.95]], { archived: 0.9 }],
        ['204', -1, 18, 'calcio', 'Palermo - Venezia', 'a2', 'bonus', [[11.8, 'vinto', 'Serie B', 'Over/Under 2,5', 'Over', 1.9]], { archived: 1 }],
        ['205', -2, 1, 'calcio', 'Instituto Córdoba - Deportivo Riestra', 'b365-1', 'reale', [[-11.85, 'perso', 'Primera División', '1X2', 'X', 3.1], [10, 'vinto', 'Primera División', '1X2', 'X', 3.15, 'banca']], { archived: 1.6 }],
        ['206', -2, 0, 'calcio', 'Boca Juniors - Belgrano', 'a4', 'reale', [[1.6, 'vinto', 'Primera División', '1X2', '1', 1.8]], { archived: 1.6 }],
        ['207', -2, 19, 'calcio', 'Defensores de Belgrano - San Miguel', 'b365-1', 'reale', [[0.95, 'vinto', 'Primera B', '1X2', '1', 2.2]], { archived: 1.8 }],
        ['208', -2, 18, 'calcio', 'Sacachispas - Sportivo Barracas', 'b365-1', 'reale', [[-0.6, 'perso', 'Primera B', '1X2', '2', 2.05]], { archived: 1.8 }],
        ['209', -3, 23, 'calcio', 'MULTIPLA Milan - Pisa', 'a6', 'bonus', [[25.4, 'vinto', 'Multipla', 'Multipla', null, 5.86], [-1, 'perso', 'Serie A', '1X2', '1', 1.6, 'banca', 'Milan - Pisa'], [-3, 'perso', 'Serie A', '1X2', '1', 2.1, 'banca', 'Napoli - Inter'], [-3, 'perso', 'Serie A', '1X2', '1', 2.2, 'banca', 'Lazio - Juventus']], { archived: 2.5, tag: 'Da controllare', nota: 'Multipla da 3 per il bonus del 10 %' }],
        ['210', -3, 21, 'tennis', 'Sinner - Zverev', 'a2', 'reale', [[3.1, 'vinto', 'ATP Vienna', 'Vincente', 'Sinner', 1.45]], { archived: 2.5 }],
        ['211', -3, 21, 'basket', 'Olimpia Milano - Virtus Bologna', 'a5', 'reale', [[-2.15, 'perso', 'Serie A', 'Testa a testa', 'Olimpia Milano', 2.3]], { archived: 2.5, tag: 'Da controllare', nota: 'Quota maggiorata, limite verificato' }],
        ['212', -3, 20, 'calcio', 'Temperley - Chacarita Juniors', 'a1', 'reale', [[1.25, 'vinto', 'Primera Nacional', '1X2', '1', 2.4]], { archived: 2.5 }],
        ['213', -3, 19, 'calcio', 'Deportivo Español - Victoriano Arenas', 'a3', 'reale', [[0, 'annullato', 'Primera B', '1X2', '1', 2], [0, 'annullato', 'Primera B', '1X2', '1', 2.02, 'banca']], { archived: 2.5, nota: 'Rimborso 0-0' }],
    ].map(([id, d, h, sport, eventoNome, accountId, modalitaSaldo, legs, o]) => {
        const eventoData = inDays(d, h, 0);
        legs.forEach(([movimento, statoEvento, competizione, mercato, selezione, quota, metodo, evento], i) => LEGS.push({ id: `leg-${id}-${i}`, betId: id, eventoData, sport, eventoNome: evento ?? eventoNome, competizione, mercato, selezione: selezione ?? undefined, metodo: metodo ?? 'punta', tipoBonus: 'none', accountId, stake: 10, quota, rischio: 0, commissionePercentuale: 0, movimento, statoEvento, posizione: i }));
        return { id, eventoData, categoria: 'matched_betting', sport, eventoNome, modalitaSaldo, accountId, tag: o.tag, nota: o.nota, statoEvento: legs[0][1], archiviata: true, archiviataAt: ago(o.archived * 86400), eventoNotificato: false, hasOpenLegs: false, createdAt: ago((o.archived + 1) * 86400) };
    }),
];
LEGS.unshift(
    { id: 'leg-101-1', betId: '101', eventoData: inDays(2), sport: 'calcio', eventoNome: 'Genoa - Como', competizione: 'Serie A', mercato: '1X2', selezione: '1', metodo: 'punta', tipoBonus: 'none', accountId: 'a1', stake: 10, quota: 2.1, quotaRiferimento: 2.1, rischio: 0, bonusValore: 0, rimborsoValore: 0, commissionePercentuale: 0, movimento: 0, statoEvento: 'in_corso', eventoNotificato: false, posizione: 0 },
    { id: 'leg-103-1', betId: '103', eventoData: ago(1800), sport: 'calcio', eventoNome: 'Palermo - Venezia', competizione: 'Serie B', mercato: 'Over/Under 2,5', selezione: 'Over', metodo: 'punta', tipoBonus: 'none', accountId: 'a4', stake: 25, quota: 1.95, rischio: 25, commissionePercentuale: 0, movimento: 0, statoEvento: 'in_corso', posizione: 0 },
    { id: 'leg-103-2', betId: '103', eventoData: ago(1800), sport: 'calcio', eventoNome: 'Palermo - Venezia', competizione: 'Serie B', mercato: 'Over/Under 2,5', selezione: 'Over', metodo: 'banca', tipoBonus: 'none', accountId: 'a3', stake: 24.5, quota: 1.98, rischio: 24, commissionePercentuale: 4.5, movimento: 0, statoEvento: 'in_corso', posizione: 1 },
    { id: 'leg-104-0', betId: '104', eventoData: inDays(5, 15, 0), sport: 'calcio', eventoNome: 'MULTIPLA Milan - Lazio', competizione: 'Multipla', mercato: 'Multipla', metodo: 'punta', tipoBonus: 'bonus', accountId: 'b365-2', stake: 0, bonusValore: 10, quota: 7.84, rischio: 0, commissionePercentuale: 0, movimento: 0, statoEvento: 'in_corso', posizione: 0 },
    { id: 'leg-104-1', betId: '104', eventoData: inDays(5, 15, 0), sport: 'calcio', eventoNome: 'Milan - Lazio', competizione: 'Serie A', mercato: '1X2', selezione: '1', metodo: 'banca', tipoBonus: 'none', accountId: 'a3', stake: 3, quota: 2.02, quotaRiferimento: 2, rischio: 3, commissionePercentuale: 4.5, movimento: 0, statoEvento: 'bozza', posizione: 1 },
    { id: 'leg-104-2', betId: '104', eventoData: inDays(5, 18, 0), sport: 'calcio', eventoNome: 'Atalanta - Fiorentina', competizione: 'Serie A', mercato: '1X2', selezione: '1', metodo: 'banca', tipoBonus: 'none', accountId: 'a3', stake: 0, quota: 1.9, quotaRiferimento: 1.96, rischio: 0, commissionePercentuale: 4.5, movimento: 0, statoEvento: 'bozza', posizione: 2 },
    { id: 'leg-104-3', betId: '104', eventoData: inDays(5, 20, 45), sport: 'calcio', eventoNome: 'Torino - Genoa', competizione: 'Serie A', mercato: '1X2', selezione: '1', metodo: 'banca', tipoBonus: 'none', accountId: 'a3', stake: 0, quota: 2.05, quotaRiferimento: 2, rischio: 0, commissionePercentuale: 4.5, movimento: 0, statoEvento: 'bozza', posizione: 3 },
    { id: 'leg-105-1', betId: '105', eventoData: inDays(1, 18, 0), sport: 'tennis', eventoNome: 'Sinner - Alcaraz', competizione: 'ATP Parigi', mercato: 'Vincente', selezione: 'Sinner', metodo: 'punta', tipoBonus: 'bonus', accountId: 'a6', stake: 0, bonusValore: 50, quota: 1.72, rischio: 0, commissionePercentuale: 0, movimento: 0, statoEvento: 'in_corso', posizione: 0 },
    { id: 'leg-102-1', betId: '102', eventoData: inDays(3, 20, 45), sport: 'calcio', eventoNome: 'Lazio - Roma', competizione: 'Serie A', mercato: '1X2', selezione: 'X', metodo: 'punta', tipoBonus: 'none', accountId: 'a3', stake: 10, quota: 3.4, quotaRiferimento: 3.4, rischio: 0, bonusValore: 0, rimborsoValore: 0, commissionePercentuale: 0, movimento: 0, statoEvento: 'in_corso', eventoNotificato: false, posizione: 0 },
);
const GLOBAL_BOOKS = [
    { id: 'g-sisal', nome: 'Sisal', descrizione: 'Book globale con descrizione da svuotare', isExchange: false, genericUrl: 'https://www.sisal.it', externalId: 'sisal', isGlobal: true },
];

const TAGS = [
    { id: 't1', nome: 'Benvenuto Bet365', colore: '#0f4d3a', createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 't2', nome: 'Da controllare', colore: '#8a5a00', createdAt: ago(86400), updatedAt: ago(86400) },
];
// §14.361: promemoria del tracker (prima il mock non li aveva e la pagina mostrava solo l'errore).
const REMINDERS = [
    { id: 'r1', accountId: 'a1', descrizione: 'Prelevare la vincita del bonus di benvenuto', dataScadenza: inDays(1, 10, 0), periodoNotifica: '24h', notificaInviata: true, stato: 'attivo', createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'r2', accountId: 'b365-1', descrizione: 'Giocare il rollover della freebet entro la scadenza', dataScadenza: inDays(3, 21, 0), periodoNotifica: '12h', notificaInviata: false, stato: 'attivo', createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'r3', descrizione: 'Controllare le promo ricorrenti del weekend', dataScadenza: inDays(6, 9, 30), periodoNotifica: 'scadenza', notificaInviata: false, stato: 'attivo', createdAt: ago(86400), updatedAt: ago(86400) },
    { id: 'r4', accountId: 'a4', descrizione: 'Inviare i documenti per la verifica del conto', dataScadenza: inDays(-2, 18, 0), periodoNotifica: '24h', notificaInviata: true, stato: 'completato', createdAt: ago(5 * 86400), updatedAt: ago(2 * 86400) },
    { id: 'r5', accountId: 'a5', descrizione: 'Usare il bonus ricarica prima che scada', dataScadenza: inDays(-4, 23, 59), periodoNotifica: 'scadenza', notificaInviata: true, stato: 'scaduto', createdAt: ago(9 * 86400), updatedAt: ago(4 * 86400) },
];
function legSummaryOf(betId) {
    const legs = LEGS.filter((l) => l.betId === betId).sort((a, b) => (a.posizione ?? 0) - (b.posizione ?? 0));
    const first = legs[0];
    const eventi = [];
    for (const l of legs) if (!eventi.includes(l.eventoNome)) eventi.push(l.eventoNome);
    return { competizione: first?.competizione ?? null, mercato: first?.mercato ?? null, selezione: first?.selezione ?? null, quota: first?.quota ?? null, eventi };
}

function filterRows(q) {
    let rows = ROWS.filter((r) => Date.parse(r.startTime) > Date.now());
    const get = (k) => q.get(k) ?? '';
    if (get('sport')) rows = rows.filter((r) => r.sportName === get('sport'));
    if (get('match_type')) rows = rows.filter((r) => r.matchType === get('match_type'));
    if (get('market_type')) rows = rows.filter((r) => r.marketTypeKey === get('market_type'));
    if (get('nation')) rows = rows.filter((r) => r.nationName === get('nation'));
    if (get('competitions')) { const ids = new Set(get('competitions').split(',')); rows = rows.filter((r) => ids.has(r.competitionId)); }
    if (get('bookmaker') && get('cover_bookmakers')) {
        // §14.102: one leg on a chosen book, every other leg on a cover bookmaker.
        const b = new Set(get('bookmaker').split(',')); const c = new Set(get('cover_bookmakers').split(','));
        rows = rows.filter((r) => r.legs.some((leg, i) => b.has(leg.bookmakerSlug) && r.legs.every((o, j) => j === i || c.has(o.bookmakerSlug))));
    } else if (get('bookmaker')) { const b = new Set(get('bookmaker').split(',')); rows = rows.filter((r) => r.legs.some((l) => b.has(l.bookmakerSlug))); }
    else if (get('cover_bookmakers')) { const c = new Set(get('cover_bookmakers').split(',')); rows = rows.filter((r) => r.legs.every((l) => c.has(l.bookmakerSlug))); }
    if (get('allowed_bookmakers')) { const s = new Set(get('allowed_bookmakers').split(',')); rows = rows.filter((r) => r.legs.every((l) => s.has(l.bookmakerSlug))); }
    if (get('min_rating')) rows = rows.filter((r) => r.rating >= parseFloat(get('min_rating')));
    if (get('max_rating')) rows = rows.filter((r) => r.rating <= parseFloat(get('max_rating')));
    const minO = get('min_odds') ? parseFloat(get('min_odds')) : null;
    const maxO = get('max_odds') ? parseFloat(get('max_odds')) : null;
    if (minO != null || maxO != null) {
        const inRange = (o) => (minO == null || o >= minO) && (maxO == null || o <= maxO);
        rows = rows.filter((r) => (r.matchType === 'back_lay' ? inRange(r.legs[0].odds) : r.legs.some((l) => inRange(l.odds))));
    }
    if (get('search')) { const s = get('search').toLowerCase(); rows = rows.filter((r) => `${r.homeName} ${r.awayName} ${r.competitionName}`.toLowerCase().includes(s)); }
    if (get('start_time_from')) rows = rows.filter((r) => r.startTime >= get('start_time_from'));
    if (get('start_time_to')) rows = rows.filter((r) => r.startTime <= get('start_time_to'));
    const dir = get('sort_dir') === 'ASC' ? 1 : -1;
    const key = get('sort_by') === 'start_time' ? 'startTime' : 'rating';
    rows.sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
    const limit = Math.min(parseInt(get('limit') || '50', 10), 200);
    const offset = parseInt(get('offset') || '0', 10);
    return { results: rows.slice(offset, offset + limit), total: rows.length, calculatedAt: META.calculatedAt };
}

// §14.339: the free Oddsmatcher, no login: back on Sisal (shown as Snai) and lay on an exchange
// whatever the query asks; only the price bounds, the kickoff window, the sort and the page are
// read (at most 50 rows).
const FREE_PARAMS = ['min_odds', 'max_odds', 'start_time_from', 'start_time_to', 'sort_by', 'sort_dir', 'offset'];
function freeRows(q) {
    const p = new URLSearchParams();
    for (const k of FREE_PARAMS) if (q.get(k)) p.set(k, q.get(k));
    p.set('match_type', 'back_lay');
    p.set('bookmaker', 'sisal');
    p.set('cover_bookmakers', Object.values(BOOKMAKERS).filter((b) => b.isExchange).map((b) => b.slug).join(','));
    p.set('limit', String(Math.min(parseInt(q.get('limit') || '50', 10) || 50, 50)));
    const page = filterRows(p);
    // Shown as Snai, as the backend does: slug and name of the Sisal leg, no event page.
    const asSnai = (l) => (l.bookmakerSlug === 'sisal' ? { ...l, bookmakerSlug: 'snai', bookmakerName: 'Snai', eventUrl: null } : l);
    return { ...page, results: page.results.map((r) => ({ ...r, legs: r.legs.map(asSnai) })) };
}

// §14.262: le offerte del backoffice. Una pubblicata con una guida piccola e una bozza senza.
const romeToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dayNum = (d) => Date.parse(`${d}T00:00:00Z`) / 86400000;
let offersDown = false;
// §14.351: il cookie della sessione che il mock mette al login e al refresh (e toglie al logout).
const SESSION_COOKIE = 'access_token=mock; Path=/; HttpOnly; SameSite=Lax';
// §14.315: GET /api/__mock/offers-401 fa rispondere 401 alla PROSSIMA lettura di /api/offers o
// /api/offers/:slug (una sola volta), come un access_token scaduto: la pagina deve rinnovare la
// sessione e rileggere, non mostrare l'avviso.
let offersUnauthorizedOnce = false;
const IMAGES = new Map();
const OFFERS = [
    {
        id: 'of-1', slug: 'snai-30', type: 'benvenuto', groupLabel: 'Singola', bookmakerSlug: 'snai', bookmakerName: 'Snai',
        title: 'Deposita 60 €, ricevi 30 € di bonus', profit: 25, difficulty: 'Facile', isNew: false,
        expiresOn: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), expiryOverride: null, sortOrder: 0,
        visibility: 'published', publishedAt: '2026-10-18T09:00:00.000Z', createdAt: '2026-10-17T09:00:00.000Z', updatedAt: '2026-10-18T09:00:00.000Z',
        guide: {
            facts: { budget: 120, time: '45 min, in due momenti', minOdds: 'Nessuna', depositWithin: '7 giorni dalla registrazione' },
            signup: { label: 'Registrati su Snai', url: 'https://www.snai.it/' },
            intro: 'Snai regala **30 €** di bonus cash a chi apre un conto e deposita almeno 60 €.',
            requirement: 'Serve un conto su un exchange con almeno 90 € di liquidità.',
            warning: 'Hai 7 giorni dalla registrazione per depositare.',
            steps: [
                { title: 'Registrati su Snai', blocks: [
                    { type: 'paragraph', text: 'Apri il conto dal bottone qui sotto.' },
                    { type: 'buttons', buttons: [{ kind: 'external', label: 'Apri il conto su Snai', href: 'https://www.snai.it/' }] },
                ] },
                { title: 'Sblocca il bonus', blocks: [
                    { type: 'checklist', items: ['Apri l’oddsmatcher.', 'Apri il calcolatore in modalità **Bonus**.'] },
                    { type: 'callout', tone: 'tip', text: 'Controlla le quote prima di puntare.' },
                ] },
            ],
            faq: [{ question: 'Il bonus ha una scadenza?', answer: 'Sì: 15 giorni dall’accredito.' }],
            terms: { rows: [{ label: 'Quota minima', value: 'Nessuna' }], verifiedOn: '2026-10-18', url: 'https://www.snai.it/', linkLabel: 'Termini completi su snai.it' },
        },
    },
    {
        id: 'of-2', slug: 'bwin-multipla', type: 'ricorrenti', groupLabel: 'Ogni settimana', bookmakerSlug: 'bwin', bookmakerName: 'Bwin',
        title: 'Rimborso del 50 % sulla prima multipla della settimana', profit: 6, difficulty: 'Media', isNew: true,
        expiresOn: null, expiryOverride: null, sortOrder: 0, visibility: 'draft', publishedAt: null,
        createdAt: '2026-10-19T09:00:00.000Z', updatedAt: '2026-10-19T09:00:00.000Z', guide: null,
    },
];
// §14.345: il catalogo d'esempio del design (lib/offers-sample.ts) pubblicato, senza guida, perché
// l'elenco abbia più pagine (10 per pagina): 16 offerte di benvenuto con of-1 (§14.351: due coi
// titoli del worker), due delle quali scadute. Gli slug di of-1 e of-2 restano loro. Scadenze in giorni da oggi (negativo = scaduta).
[
    ['betflag-10', 'benvenuto', 'Singola', 'betflag', 'Betflag', 'Scommetti 50 €, ricevi 10 € di free bet', 5.5, 'Facile'],
    ['daznbet-100', 'benvenuto', 'Multipla', 'daznbet', 'Daznbet', 'Scommetti 200 €, ricevi 100 € in quintupla', 40, 'Media'],
    ['eurobet-100', 'benvenuto', 'Multipla', 'eurobet', 'Eurobet', 'Deposita 200 €, ricevi 100 € in quintupla', 60, 'Media'],
    ['sisal-100', 'benvenuto', 'Multipla', 'sisal', 'Sisal', 'Deposita 200 €, scommetti 10 €, ricevi 100 € in quadrupla', 65, 'Media', null, true],
    ['stanleybet-40', 'benvenuto', 'Multipla', 'stanleybet', 'Stanleybet', 'Scommetti 20 €, ricevi 4 × 10 € in tripla', 29, 'Media'],
    ['williamhill-100', 'benvenuto', 'Multipla', 'williamhill', 'William Hill', 'Scommetti 100 €, ricevi 10 × 10 € di free bet', 55, 'Media'],
    ['planetwin-50', 'benvenuto', 'Multipla', 'planetwin365', 'Planetwin365', 'Scommetti 50 €, ricevi 50 € in sestupla', 26, 'Difficile'],
    ['bet365-100', 'benvenuto', 'Rollover', 'bet365', 'Bet365', 'Deposita fino a 100 €, ricevi il 100 % con rollover', 70, 'Difficile'],
    ['netbet-30', 'benvenuto', 'Rimborso', 'netbet', 'Netbet', 'Scommetti 10 €, ricevi fino a 30 € di free bet', 10, 'Media'],
    ['goldbet-slot', 'benvenuto', 'Casinò', 'goldbet', 'Goldbet', 'Deposita 500 €, ricevi 50 € per le slot IGT', 20, 'Facile'],
    ['leovegas-casino', 'benvenuto', 'Casinò', 'leovegas', 'LeoVegas', 'Deposita 20 €, ricevi 20 € per il casinò', 8, 'Media'],
    ['admiralbet-20', 'benvenuto', 'Singola', 'admiralbet', 'Admiralbet', 'Scommetti 20 €, ricevi 20 € di free bet', 12, 'Facile', -5],
    ['winbet-25', 'benvenuto', 'Singola', 'winbet', 'Winbet', 'Deposita 25 €, ricevi 25 € di bonus', 14, 'Facile', -20],
    // §14.351: come quelle del worker delle guide: senza gruppo e col sito nel titolo (coperto per gli ospiti).
    ['zonagioco-sport', 'benvenuto', null, 'zonagioco', 'Zonagioco', 'Benvenuto Sport Zonagioco', 45, 'Media'],
    ['williamhill-sport', 'benvenuto', null, 'williamhill', 'Williamhill', 'Benvenuto Sport William Hill', 35, 'Media'],
    ['sisal-ruota-scommesse', 'ricorrenti', 'Ogni giorno', 'sisal', 'Sisal', 'Ruota dei bonus scommesse', null, 'Facile'],
    ['sisal-ruota-casino', 'ricorrenti', 'Ogni giorno', 'sisal', 'Sisal', 'Ruota dei bonus casinò e slot', null, 'Facile'],
    ['goldbet-live', 'ricorrenti', 'Ogni settimana', 'goldbet', 'Goldbet', 'Rimborso del 10 % sul casinò live, fino a 10 €', 2, 'Media', 2],
    ['betsson-quadrupla', 'ricorrenti', 'Ogni settimana', 'betsson', 'Betsson', 'Scommetti 10 € in quadrupla, ricevi 5 € di free bet', 1.5, 'Media', null, true],
    ['888-mensile', 'ricorrenti', 'Ogni mese', '888sport', '888sport', 'Rimborso del 10 % sulle perdite nette del mese, fino a 50 €', 12, 'Facile'],
    ['bet365-maggiorate', 'ricorrenti', 'Quando disponibili', 'bet365', 'Bet365', 'Quote maggiorate con la spunta gialla', null, 'Difficile'],
    ['eurobet-superquote', 'ricorrenti', 'Quando disponibili', 'eurobet', 'Eurobet', 'Super quote sugli eventi di Serie A', null, 'Media'],
    ['snai-tripla', 'ricorrenti', 'Ogni settimana', 'snai', 'Snai', 'Scommetti 50 € in tripla, ricevi 15 € di free bet', 3, 'Media', -1],
    ['betpassion-escl', 'esclusive', null, 'betpassion', 'Betpassion', 'Via e-mail: scommetti 150 € in tripla, ricevi 50 € di free bet', 18, 'Media'],
    ['leovegas-escl', 'esclusive', null, 'leovegas', 'LeoVegas', 'Via SMS: rimborso del 20 % sulle perdite della settimana, fino a 50 €', 15, 'Facile'],
    ['netbet-escl', 'esclusive', null, 'netbet', 'Netbet', 'Nel conto: ricarica 50 €, ricevi altri 50 €', 22, 'Media', null, true],
    ['888-escl', 'esclusive', null, '888sport', '888sport', 'Via e-mail: deposita 20 €, ricevi 20 € di free bet', 10, 'Facile', -15],
].forEach(([slug, type, groupLabel, bookmakerSlug, bookmakerName, title, profit, difficulty, expiresIn = null, isNew = false], i) => OFFERS.push({
    id: `of-s${i + 1}`, slug, type, groupLabel, bookmakerSlug, bookmakerName, title, profit, difficulty, isNew,
    expiresOn: expiresIn === null ? null : new Date(Date.now() + expiresIn * 86400000).toISOString().slice(0, 10), expiryOverride: null, sortOrder: 0,
    visibility: 'published', publishedAt: '2026-11-01T09:00:00.000Z', createdAt: new Date(Date.parse('2026-11-01T09:00:00Z') - i * 60000).toISOString(),
    updatedAt: '2026-11-01T09:00:00.000Z', guide: null,
}));
function offerView(row) {
    const today = romeToday();
    const days = row.expiresOn ? dayNum(row.expiresOn) - dayNum(today) : null;
    const expired = row.expiryOverride === 'expired' ? true : row.expiryOverride === 'active' ? false : days !== null && days < 0;
    return { ...row, expired, daysLeft: expired || days === null || days < 0 ? null : days, hasGuide: row.guide !== null };
}
function publicCard(o) {
    const { guide, id, visibility, publishedAt, createdAt, updatedAt, expiryOverride, ...card } = offerView(o);
    return card;
}
// §14.345: GET /api/offers?page= come il backend (listPublishedOffersPage): un tipo e un sito,
// le attive per gruppo nell'ordine dell'editor (gli altri gruppi dopo, quelli senza gruppo prima
// di loro), poi tutte le scadute; dentro la sezione sortOrder e la più nuova prima. Una pagina
// oltre l'ultima serve l'ultima.
const OFFER_GROUP_ORDER = { benvenuto: ['Singola', 'Multipla', 'Rollover', 'Rimborso', 'Casinò'], ricorrenti: ['Ogni giorno', 'Ogni settimana', 'Ogni mese', 'Quando disponibili'], esclusive: [] };
function offersPage(q) {
    const type = OFFER_GROUP_ORDER[q.get('type')] ? q.get('type') : 'benvenuto';
    const book = (q.get('book') || '').trim() || null;
    const limit = Math.min(Math.max(parseInt(q.get('limit') || '10', 10) || 10, 1), 50);
    const order = OFFER_GROUP_ORDER[type];
    const published = OFFERS.filter((o) => o.visibility === 'published').map(offerView);
    const rank = (o) => (o.expired ? 0 : order.includes(o.groupLabel) ? order.indexOf(o.groupLabel) + 1 : order.length + 1);
    const group = (o) => (o.expired ? null : o.groupLabel);
    const bySection = (a, b) => Number(a.expired) - Number(b.expired) || rank(a) - rank(b) || (group(a) ?? '').localeCompare(group(b) ?? '', 'it');
    const rows = published.filter((o) => o.type === type && (!book || o.bookmakerName === book))
        .sort((a, b) => bySection(a, b) || a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
    const sections = [];
    for (const o of rows) {
        const last = sections[sections.length - 1];
        if (last && last.expired === o.expired && last.group === group(o)) last.count += 1;
        else sections.push({ group: group(o), expired: o.expired, count: 1 });
    }
    const page = Math.min(Math.max(parseInt(q.get('page'), 10) || 1, 1), Math.max(1, Math.ceil(rows.length / limit)));
    const activeByType = Object.fromEntries(Object.keys(OFFER_GROUP_ORDER).map((t) => [t, published.filter((o) => o.type === t && !o.expired).length]));
    const books = [...new Set(published.filter((o) => o.type === type).map((o) => o.bookmakerName))].sort((a, b) => a.localeCompare(b, 'it'));
    return { offers: rows.slice((page - 1) * limit, page * limit).map(publicCard), total: rows.length, page, limit, sections, activeByType, books };
}
// §14.351: le letture per chi non è entrato, come resources/offers/free-offers.ts del backend:
// intero solo il benvenuto di Snai, le altre carte chiuse (senza slug, sito e data, col titolo
// coperto: ogni sito noto, anche scritto con spazi o in maiuscolo), nessun sito nel filtro.
const isFreeOffer = (o) => o.type === 'benvenuto' && o.bookmakerSlug === 'snai';
function maskSites(title) {
    const names = [...new Set(OFFERS.flatMap((o) => [o.bookmakerName, o.bookmakerSlug]))].sort((a, b) => b.length - a.length);
    const patterns = names.map((n) => [...n.toLowerCase()].filter((c) => /[\p{L}\p{N}]/u.test(c)).map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[\\s.\\-_'’]?"))
        .filter(Boolean).map((p) => `(?<![\\p{L}\\p{N}])${p}['’]?(?![\\p{L}\\p{N}])`);
    return title.replace(new RegExp(patterns.join('|'), 'giu'), '******');
}
function freeOffersPage(q) {
    const params = new URLSearchParams(q);
    params.delete('book');
    const p = offersPage(params);
    const offers = p.offers.map((o) => (isFreeOffer(o)
        ? { ...o, locked: false }
        : { locked: true, type: o.type, groupLabel: o.groupLabel, title: maskSites(o.title), profit: o.profit, difficulty: o.difficulty, isNew: o.isNew, expired: o.expired, daysLeft: o.daysLeft }));
    return { ...p, offers, books: [] };
}
function offerBodyError(body, selfId) {
    if (String(body.slug || '').startsWith('rotto')) return [500, { message: 'Errore finto del mock' }];
    if (String(body.slug || '').startsWith('invalido')) return [400, { errors: ['"guide.steps[0].title" is not allowed to be empty'] }];
    if (!body.title || !body.slug) return [400, { errors: ['"title" is not allowed to be empty'] }];
    if (OFFERS.some((o) => o.slug === body.slug && o.id !== selfId)) return [409, { message: 'Esiste già un’offerta con questo slug' }];
    return null;
}

function readRaw(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

function readBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (c) => { data += c; });
        req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(body === undefined ? '' : JSON.stringify(body));
    };
    console.log(`${req.method} ${path}${url.search}`);
    // §14.249: stato dell'utente del mock (hasPassword e il resto) modificabile a caldo.
    if (path === '/api/__mock/user' && req.method === 'PATCH') {
        Object.assign(user, await readBody(req));
        console.log('  mock user:', JSON.stringify(user));
        return send(200, { user });
    }
    // Profilo: PATCH /auth/me aggiorna nome/username, 'taken' simula lo username già in uso.
    if (path === '/api/auth/me' && req.method === 'PATCH') {
        const body = await readBody(req);
        console.log('  profile:', JSON.stringify(body));
        if (body.username === 'taken') return send(409, { message: 'Username già in uso' });
        if (body.name !== undefined) user.name = body.name;
        if (body.username !== undefined) user.username = body.username;
        return send(200, { user });
    }
    // §14.246: «Continua con Google». Il mock salta la schermata di Google e il callback:
    // 302 verso la pagina che chiude il giro, con Location relativa (il browser la risolve
    // sul frontend che ha inoltrato la richiesta). ?mock_error=google_denied|google_state|
    // google_email_unverified|google_failed|google_unavailable riproduce un esito negativo.
    if (path === '/api/auth/google') {
        const mockError = url.searchParams.get('mock_error');
        res.writeHead(302, { Location: mockError ? `/accesso-google?error=${mockError}` : '/accesso-google' });
        return res.end();
    }
    // §14.251: cancellazione dell'account. Chi ha una password manda quella del mock
    // ('Password123!'), l'account solo-Google (hasPassword false) la parola ELIMINA;
    // PATCH /api/__mock/user {"lastAdmin":true} riproduce il 409 dell'ultimo amministratore.
    // Il mock è senza stato: dopo il 204 /auth/me risponderebbe ancora, il frontend però
    // svuota lo store e torna alla home con una navigazione completa.
    if (path === '/api/auth/me' && req.method === 'DELETE') {
        const body = await readBody(req);
        console.log('  delete-account:', JSON.stringify({ password: body.password ? '***' : undefined, confirm: body.confirm }));
        if (user.hasPassword) {
            if (!body.password) return send(400, { message: "Inserisci la password attuale per eliminare l'account" });
            if (body.password !== 'Password123!') return send(400, { message: 'La password attuale non è corretta' });
        } else if (body.confirm !== 'ELIMINA') {
            return send(400, { message: "Per confermare l'eliminazione scrivi ELIMINA" });
        }
        if (user.lastAdmin) return send(409, { message: "Sei l'unico amministratore: nomina un altro amministratore dal backoffice prima di eliminare il tuo account" });
        return send(204);
    }
    // §14.252: accesso con la password 'sbagliata' → 401 come il backend, per il Callout
    // «Accesso non riuscito» della pagina di login; qualsiasi altra password entra.
    if (path === '/api/auth/login' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  login:', body.email, body.password === 'sbagliata' ? '(sbagliata)' : '***');
        if (body.password === 'sbagliata') return send(401, { message: 'Credenziali non valide' });
        res.setHeader('Set-Cookie', SESSION_COOKIE);
        return send(200, { user });
    }
    // §14.253: registrazione del design, solo email e password. 'esistente@esempio.it' → 409
    // come il backend, per il Callout «Registrazione non riuscita»; le altre → 201.
    if (path === '/api/auth/register' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  register:', JSON.stringify({ email: body.email, username: body.username, name: body.name, password: body.password ? '***' : undefined }));
        if (body.email === 'esistente@esempio.it') return send(409, { message: 'Un utente con questa email o username esiste già' });
        return send(201, { status: 'pending_verification', email: body.email });
    }
    if (path === '/api/auth/refresh') res.setHeader('Set-Cookie', SESSION_COOKIE);
    if (path === '/api/auth/me' || path === '/api/auth/refresh' || path === '/api/auth/login') return send(200, { user });
    // §14.249: «Imposta una password» dal profilo di chi è entrato con Google: la stessa
    // risposta neutra del backend per forgot-password.
    // §14.257: 'errore@esempio.it' → 500 e 'troppi@esempio.it' → 429 del limitatore, per il
    // Callout «Invio non riuscito» del recupero password.
    if (path === '/api/auth/forgot-password' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  forgot-password:', body.email);
        if (body.email === 'errore@esempio.it') return send(500, { message: 'Errore durante il recupero password' });
        if (body.email === 'troppi@esempio.it') return send(429, { error: 'Too many authentication attempts, please try again later.', retryAfter: '15 minutes' });
        return send(200, { message: "Se l'email è associata a un account, riceverai a breve un link per reimpostare la password. Controlla anche la cartella spam." });
    }
    // §14.257: il controllo del link di reimposta. 'scaduto' → 400 come il backend,
    // 'vecchio' → 404 di un backend senza la rotta (la pagina va avanti senza email);
    // gli altri token → l'email dell'utente del mock.
    if (path === '/api/auth/reset-password/check' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  reset-password/check:', body.token);
        if (!body.token) return send(400, { errors: ['"token" is required'] });
        if (body.token === 'scaduto') return send(400, { message: 'Link non valido o scaduto' });
        if (body.token === 'vecchio') return send(404, { message: 'Not found' });
        return send(200, { email: user.email });
    }
    // §14.257: il salvataggio. 'usato' → il link è morto fra il controllo e il salvataggio
    // (400 come il backend); 'rotto' → 500; gli altri → 200 con l'utente, come il backend
    // che fa entrare subito.
    if (path === '/api/auth/reset-password' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  reset-password:', body.token, body.password ? '***' : '(vuota)');
        if (body.token === 'usato') return send(400, { message: 'Link non valido o scaduto' });
        if (body.token === 'rotto') return send(500, { message: 'Errore durante il reset password' });
        return send(200, { user });
    }
    // §14.258: la convalida dell'email. Token che cominciano con 'scaduto' → 400 con l'email
    // dell'account come il backend sui link scaduti; 'usato' → 400 senza email (già usato o
    // sostituito); 'rotto' → 500; 'troppi' → 429 del limitatore; 'lento' → 200 dopo 3 s per
    // guardare «Verifica in corso…»; gli altri → 200 con l'utente (il backend fa entrare).
    if (path === '/api/auth/verify-email' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  verify-email:', body.token);
        if (!body.token) return send(400, { errors: ['"token" is required'] });
        if (body.token.startsWith('scaduto')) return send(400, { status: 400, message: 'Link non valido o scaduto', email: user.email });
        if (body.token === 'usato') return send(400, { status: 400, message: 'Link non valido o scaduto' });
        if (body.token === 'rotto') return send(500, { status: 500, message: 'Errore durante la verifica email' });
        if (body.token === 'troppi') return send(429, { error: 'Too many authentication attempts, please try again later.', retryAfter: '15 minutes' });
        if (body.token === 'lento') await new Promise((r) => setTimeout(r, 3000));
        return send(200, { user });
    }
    // §14.258: «Inviami un nuovo link». 'scaduto-sparito' → 400 (il link è stato sostituito nel
    // frattempo), 'scaduto-rotto' → 500, 'scaduto-troppi' → 429; gli altri → 200 con l'email
    // dopo 0,8 s, per vedere «Invio in corso…».
    if (path === '/api/auth/verify-email/resend' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  verify-email/resend:', body.token);
        if (!body.token) return send(400, { errors: ['"token" is required'] });
        if (body.token === 'scaduto-sparito') return send(400, { status: 400, message: 'Link non valido o scaduto' });
        if (body.token === 'scaduto-rotto') return send(500, { status: 500, message: "Errore durante l'invio del nuovo link" });
        if (body.token === 'scaduto-troppi') return send(429, { error: 'Too many authentication attempts, please try again later.', retryAfter: '15 minutes' });
        await new Promise((r) => setTimeout(r, 800));
        return send(200, { email: user.email });
    }
    // Profilo: la password attuale del mock è 'Password123!'.
    if (path === '/api/auth/change-password' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  change-password: current=', body.currentPassword ? '***' : '(vuota)');
        if (body.currentPassword !== 'Password123!') return send(400, { message: 'La password attuale non è corretta' });
        return send(200, { message: 'Password aggiornata' });
    }
    if (path === '/api/profit-tracker/telegram/status') return send(200, telegram);
    if (path === '/api/profit-tracker/telegram/generate-code') return send(200, { code: 'ABC123', expiresAt: iso(Date.now() + 600000) });
    if (path === '/api/profit-tracker/telegram/unlink') { telegram = { linked: false, linkedAt: null }; return send(204); }
    if (path === '/api/auth/logout') {
        res.setHeader('Set-Cookie', 'access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return send(204);
    }
    // §14.122: strumenti per utente e il confronto Risultato + Goal.
    if (path === '/api/tools/result-btts') return send(200, filterResultBtts(url.searchParams));
    if (path === '/api/tools/refund-zero') return send(200, filterRefundZero(url.searchParams));
    // §14.262: offerte e guide del backoffice, con la semantica del backend §14.261 (nuove in
    // bozza, salvataggio che non tocca la visibilità, published_at fermo, 409 sullo slug, 404).
    // Uno slug che comincia con «rotto» fa fallire il salvataggio con 500, «invalido» con un 400 Joi.
    // §14.264: immagini delle guide, in memoria. Come il backend: tipo dai primi byte (niente SVG),
    // 5 MB al massimo, nome casuale, lettura solo dei nomi generati.
    if (path === '/api/backoffice/offers/images' && req.method === 'POST') {
        const buf = await readRaw(req);
        const ext = buf.length > 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG' ? 'png'
            : buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 ? 'jpg'
            : buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP' ? 'webp'
            : buf.toString('ascii', 0, 3) === 'GIF' ? 'gif' : null;
        console.log('  offer image:', req.headers['content-type'], buf.length, 'bytes →', ext);
        if (buf.length > 5 * 1024 * 1024) return send(413, { message: 'L’immagine supera i 5 MB' });
        if (!ext) return send(415, { message: 'Il file non è un’immagine PNG, JPEG, WebP o GIF' });
        const name = `${require('crypto').randomUUID()}.${ext}`;
        IMAGES.set(name, buf);
        return send(201, { url: `/api/uploads/offers/${name}`, bytes: buf.length });
    }
    const imageMatch = path.match(/^\/api\/uploads\/offers\/([0-9a-f-]{36}\.(png|jpg|webp|gif))$/);
    if (imageMatch && req.method === 'GET') {
        const buf = IMAGES.get(imageMatch[1]);
        if (!buf) return send(404, { message: 'Immagine non trovata' });
        res.writeHead(200, { 'Content-Type': { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[imageMatch[2]] });
        return res.end(buf);
    }
    // §14.263: le letture pubbliche, solo le pubblicate, nell'ordine del backend (tipo, poi ordine).
    // GET /api/__mock/offers-down fa rispondere 503 alle due rotte (avviso «non riusciamo a caricare»).
    if (path === '/api/__mock/offers-down') { offersDown = !offersDown; return send(200, { offersDown }); }
    if (path === '/api/__mock/offers-401') { offersUnauthorizedOnce = true; return send(200, { offersUnauthorizedOnce }); }
    // §14.351: le letture per gli ospiti, aperte.
    if (path === '/api/offers/free/page' && req.method === 'GET') {
        if (offersDown) return send(503, { message: 'down' });
        return send(200, freeOffersPage(url.searchParams));
    }
    const freeGuide = path.match(/^\/api\/offers\/free\/guide\/([^/]+)$/);
    if (freeGuide && req.method === 'GET') {
        if (offersDown) return send(503, { message: 'down' });
        const row = OFFERS.find((o) => o.slug === decodeURIComponent(freeGuide[1]) && o.visibility === 'published' && isFreeOffer(o));
        if (!row) return send(404, { message: 'Offerta non trovata' });
        const { id, visibility, publishedAt, createdAt, expiryOverride, ...detail } = offerView(row);
        return send(200, { offer: detail });
    }
    // §14.351: come il backend, le letture da iscritto vogliono il cookie della sessione (il mock
    // lo mette al login e al refresh): senza, 401, e la pagina mostra la versione per gli ospiti.
    if ((path === '/api/offers' || /^\/api\/offers\/[^/]+$/.test(path)) && req.method === 'GET' && !/(^|;\s*)access_token=/.test(req.headers.cookie || '')) {
        return send(401, { status: 401, message: 'Authentication required' });
    }
    if ((path === '/api/offers' || /^\/api\/offers\/[^/]+$/.test(path)) && req.method === 'GET' && offersUnauthorizedOnce) {
        offersUnauthorizedOnce = false;
        console.log('  offers: 401 once (mock)');
        return send(401, { status: 401, message: 'Authentication required' });
    }
    if (path === '/api/offers' && req.method === 'GET') {
        if (offersDown) return send(503, { message: 'down' });
        if (url.searchParams.has('page')) return send(200, offersPage(url.searchParams));
        const rank = { benvenuto: 0, ricorrenti: 1, esclusive: 2 };
        const cards = OFFERS.filter((o) => o.visibility === 'published')
            .sort((a, b) => rank[a.type] - rank[b.type] || a.sortOrder - b.sortOrder)
            .map(publicCard);
        return send(200, { offers: cards });
    }
    const publicOffer = path.match(/^\/api\/offers\/([^/]+)$/);
    if (publicOffer && req.method === 'GET') {
        if (offersDown) return send(503, { message: 'down' });
        const row = OFFERS.find((o) => o.slug === decodeURIComponent(publicOffer[1]) && o.visibility === 'published');
        if (!row) return send(404, { message: 'Offerta non trovata' });
        const { id, visibility, publishedAt, createdAt, expiryOverride, ...detail } = offerView(row);
        return send(200, { offer: detail });
    }
    if (path === '/api/backoffice/offers' && req.method === 'GET') return send(200, { offers: OFFERS.map(offerView) });
    if (path === '/api/backoffice/offers' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  offer create:', JSON.stringify(body).slice(0, 400));
        const bad = offerBodyError(body);
        if (bad) return send(bad[0], bad[1]);
        const now = iso(Date.now());
        const row = { ...body, id: `of-${OFFERS.length + 1}-${Date.now()}`, visibility: 'draft', publishedAt: null, createdAt: now, updatedAt: now };
        OFFERS.push(row);
        return send(201, { offer: offerView(row) });
    }
    const offerMatch = path.match(/^\/api\/backoffice\/offers\/([^/]+)(\/visibility)?$/);
    if (offerMatch) {
        const row = OFFERS.find((o) => o.id === offerMatch[1]);
        if (!row) return send(404, { message: 'Offerta non trovata' });
        if (offerMatch[2] && req.method === 'PATCH') {
            const body = await readBody(req);
            console.log('  offer visibility:', row.slug, body.visibility);
            if (!['draft', 'published', 'hidden'].includes(body.visibility)) return send(400, { errors: ['"visibility" must be one of [draft, published, hidden]'] });
            row.visibility = body.visibility;
            if (body.visibility === 'published' && !row.publishedAt) row.publishedAt = iso(Date.now());
            row.updatedAt = iso(Date.now());
            return send(200, { offer: offerView(row) });
        }
        if (!offerMatch[2] && req.method === 'GET') return send(200, { offer: offerView(row) });
        if (!offerMatch[2] && req.method === 'PUT') {
            const body = await readBody(req);
            console.log('  offer save:', row.slug, JSON.stringify(body).slice(0, 400));
            const bad = offerBodyError(body, row.id);
            if (bad) return send(bad[0], bad[1]);
            Object.assign(row, body, { updatedAt: iso(Date.now()) });
            return send(200, { offer: offerView(row) });
        }
        if (!offerMatch[2] && req.method === 'DELETE') {
            OFFERS.splice(OFFERS.indexOf(row), 1);
            console.log('  offer delete:', row.slug);
            return send(204);
        }
    }
    if (path === '/api/backoffice/users' && req.method === 'GET') return send(200, { users: USERS });
    const toolsMatch = path.match(/^\/api\/backoffice\/users\/([^/]+)\/tools$/);
    if (toolsMatch && req.method === 'PATCH') {
        const body = await readBody(req);
        const u = USERS.find((x) => x.id === toolsMatch[1]);
        if (!u) return send(404, { message: 'Utente non trovato' });
        console.log('  user tool:', u.username, JSON.stringify(body));
        u.enabled_tools = u.enabled_tools.filter((t) => t !== body.tool);
        if (body.enabled) u.enabled_tools.push(body.tool);
        return send(200, { user: u });
    }
    // §14.124: pagina scraper (GET lista, PATCH toggle / sports / note, kill switch globale).
    if (path === '/api/backoffice/scrapers' && req.method === 'GET') return send(200, { scrapers: SCRAPERS });
    if (path === '/api/backoffice/scraping/global-status') {
        if (req.method === 'PATCH') {
            const body = await readBody(req);
            globalScraping = { enabled: !!body.enabled, updated_at: iso(Date.now()), updated_by: 'admin' };
        }
        return send(200, { status: globalScraping });
    }
    const scraperMatch = path.match(/^\/api\/backoffice\/scrapers\/([^/]+)\/(toggle|sports|note|all-competitions)$/);
    if (scraperMatch && req.method === 'PATCH') {
        const body = await readBody(req);
        const s = SCRAPERS.find((x) => x.id === scraperMatch[1]);
        if (!s) return send(404, { message: 'Bookmaker not found' });
        console.log('  scraper', scraperMatch[2], s.slug, JSON.stringify(body));
        if (scraperMatch[2] === 'toggle') s.scrape_enabled = !!body.scrape_enabled;
        if (scraperMatch[2] === 'sports') s.enabled_sports = body.enabled_sports;
        if (scraperMatch[2] === 'all-competitions') s.scrape_all_competitions = !!body.scrape_all_competitions;
        if (scraperMatch[2] === 'note') {
            if (body.note === undefined) return send(400, { message: 'note is required: a string or null' });
            if (body.note !== null && typeof body.note !== 'string') return send(400, { message: 'note must be a string or null' });
            const note = body.note === null ? '' : body.note.trim();
            if (note.length > 2000) return send(400, { message: 'note must be at most 2000 characters' });
            // 'errore' simula un guasto del backend per il percorso d'errore della pagina.
            if (note === 'errore') return send(500, { message: 'Errore simulato' });
            s.note = note.length > 0 ? note : null;
        }
        s.updated_at = iso(Date.now());
        return send(200, { scraper: s });
    }
    // §14.145: pagina «Salute» — report minimo e storia delle metriche, comprese le serie di età delle quote.
    if (path === '/api/odds-collection/admin/health') return send(200, { report: healthReport() });
    if (path === '/api/odds-collection/admin/health/history') {
        const hours = Math.max(1, parseInt(url.searchParams.get('hours') ?? '24', 10) || 24);
        return send(200, metricsHistory(hours));
    }
    if (path === '/api/odds-collection/matcher/meta') {
        // MOCK_META_DELAY_MS: the meta answers late, as in production before §14.306 (the menus show «Elenco in caricamento…» meanwhile).
        const delay = parseInt(process.env.MOCK_META_DELAY_MS ?? '0', 10) || 0;
        const body = { ...META, calculatedAt: ago(35) };
        if (delay > 0) return setTimeout(() => send(200, body), delay);
        return send(200, body);
    }
    if (path === '/api/odds-collection/matcher/results') return send(200, filterRows(url.searchParams));
    if (path === '/api/odds-collection/matcher/free/results') return send(200, freeRows(url.searchParams));
    if (path === '/api/odds-collection/matcher/free/meta') {
        const bookmakers = META.bookmakers.filter((b) => b.slug === 'sisal' || b.isExchange).map((b) => (b.slug === 'sisal' ? { ...b, slug: 'snai', name: 'Snai' } : b));
        const totalResults = freeRows(new URLSearchParams()).total;
        return send(200, { ...META, calculatedAt: ago(35), totalResults, sports: [], bookmakers, marketTypes: [], nations: [], competitions: [] });
    }
    // §14.361: promemoria (filtro per stato, crea, modifica, completa, elimina), tag e book personali creati dalla pagina Impostazioni.
    if (path === '/api/profit-tracker/reminders' && req.method === 'GET') {
        const stato = url.searchParams.get('stato');
        return send(200, REMINDERS.filter((r) => !stato || r.stato === stato));
    }
    if (path === '/api/profit-tracker/reminders' && req.method === 'POST') {
        const body = await readBody(req);
        const r = { id: `r${Date.now()}`, notificaInviata: false, stato: 'attivo', createdAt: iso(Date.now()), updatedAt: iso(Date.now()), ...body };
        REMINDERS.push(r);
        return send(201, r);
    }
    const remMatch = path.match(/^\/api\/profit-tracker\/reminders\/([^/]+)(\/complete)?$/);
    if (remMatch) {
        const i = REMINDERS.findIndex((r) => r.id === remMatch[1]);
        if (i < 0) return send(404, { message: 'Promemoria non trovato' });
        if (req.method === 'DELETE') {
            REMINDERS.splice(i, 1);
            return send(204);
        }
        if (remMatch[2] && req.method === 'PATCH') {
            REMINDERS[i] = { ...REMINDERS[i], stato: 'completato', updatedAt: iso(Date.now()) };
            return send(200, REMINDERS[i]);
        }
        if (req.method === 'PUT') {
            const body = await readBody(req);
            for (const [k, v] of Object.entries(body)) if (v !== undefined) REMINDERS[i][k] = v;
            REMINDERS[i].updatedAt = iso(Date.now());
            return send(200, REMINDERS[i]);
        }
    }
    if (path === '/api/profit-tracker/tags' && req.method === 'POST') {
        const body = await readBody(req);
        if (TAGS.some((t) => t.nome.toLowerCase() === String(body.nome ?? '').toLowerCase())) return send(409, { message: 'Esiste già un tag con questo nome' });
        const t = { id: `t${Date.now()}`, nome: body.nome, colore: body.colore, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
        TAGS.push(t);
        return send(201, t);
    }
    const tagMatch = path.match(/^\/api\/profit-tracker\/tags\/([^/]+)$/);
    if (tagMatch) {
        const i = TAGS.findIndex((t) => t.id === tagMatch[1]);
        if (i < 0) return send(404, { message: 'Tag non trovato' });
        if (req.method === 'DELETE') {
            TAGS.splice(i, 1);
            return send(204);
        }
        const body = await readBody(req);
        for (const k of ['nome', 'colore']) if (body[k] !== undefined) TAGS[i][k] = body[k];
        return send(200, TAGS[i]);
    }
    if (path === '/api/profit-tracker/books' && req.method === 'POST') {
        const body = await readBody(req);
        if (BOOKS.some((b) => b.nome.toLowerCase() === String(body.nome ?? '').toLowerCase())) return send(409, { message: 'Esiste già un book con questo nome', code: 'BOOK_NAME_ALREADY_EXISTS' });
        const b = { id: `pt-${Date.now()}`, nome: body.nome, descrizione: body.descrizione, isExchange: !!body.isExchange, externalId: null };
        BOOKS.push(b);
        return send(201, b);
    }
    if (path === '/api/profit-tracker/holders') return send(200, { items: HOLDERS, total: HOLDERS.length });
    if (path === '/api/profit-tracker/books') return send(200, { items: BOOKS, total: BOOKS.length });
    // §14.242: the open stakes per account (drafts not yet taken from the balance, legs in progress), from the legs.
    if (path === '/api/profit-tracker/accounts/open-stakes') {
        const byAccount = new Map();
        for (const leg of LEGS) {
            if (leg.statoEvento !== 'bozza' && leg.statoEvento !== 'in_corso') continue;
            const bet = BETS.find((b) => b.id === leg.betId);
            if (bet && bet.archiviata) continue;
            const item = byAccount.get(leg.accountId) ?? { accountId: leg.accountId, bozzaStake: 0, inCorsoStake: 0 };
            if (leg.statoEvento === 'bozza') item.bozzaStake += Number(leg.stake) || 0; else item.inCorsoStake += Number(leg.stake) || 0;
            byAccount.set(leg.accountId, item);
        }
        return send(200, { items: [...byAccount.values()] });
    }
    if (path === '/api/profit-tracker/accounts') {
        const bookId = url.searchParams.get('bookId');
        const holderId = url.searchParams.get('holderId');
        const status = url.searchParams.get('status');
        const items = ACCOUNTS.filter((a) => (!bookId || a.bookId === bookId) && (!holderId || a.holderId === holderId) && (!status || a.stato === status));
        return send(200, { items, total: items.length });
    }
    if (path === '/api/profit-tracker/bets' && req.method === 'POST') {
        const body = await readBody(req);
        const bet = { id: `bet-${saved.bets.length + 1}`, statoEvento: 'bozza', createdAt: iso(Date.now()), ...body };
        saved.bets.push(bet);
        // §14.107: la giocata nuova (clone o calcolatore) entra nell'elenco, si legge e si modifica come le altre.
        BETS.push(bet);
        console.log('  bet:', JSON.stringify(bet));
        return send(201, bet);
    }
    // §14.283: PATCH e DELETE di una gamba come il backend: solo i campi di betLegsValidation.update
    // (mercato e selezione compresi, metodo no); alla liquidazione un movimento semplice per vedere il guadagno.
    const legOne = path.match(/^\/api\/profit-tracker\/bets\/([^/]+)\/legs\/([^/]+)$/);
    if (legOne && (req.method === 'PATCH' || req.method === 'DELETE')) {
        const i = LEGS.findIndex((l) => l.id === legOne[2] && l.betId === legOne[1]);
        if (i < 0) return send(404, { message: 'Leg non trovata' });
        if (req.method === 'DELETE') {
            LEGS.splice(i, 1);
            saved.patches.push({ method: 'DELETE', path });
            console.log('  gamba eliminata:', legOne[2]);
            return send(204);
        }
        const body = await readBody(req);
        saved.patches.push({ method: 'PATCH', path, body });
        console.log('  leg:', legOne[2], JSON.stringify(body));
        // §14.338: quotaReale null la toglie (il backend la rimette assente nella risposta).
        const FIELDS = ['eventoData', 'eventoNome', 'mercato', 'selezione', 'stake', 'quota', 'quotaRiferimento', 'quotaReale', 'rischio', 'commissionePercentuale', 'statoEvento', 'tag', 'movimento', 'tipoBonus', 'bonusValore', 'rimborsoValore', 'accountId'];
        const leg = LEGS[i];
        for (const k of FIELDS) if (k in body) leg[k] = (k === 'selezione' && !body[k]) || (k === 'quotaReale' && body[k] == null) ? undefined : body[k];
        const c = (leg.commissionePercentuale ?? 0) / 100;
        const mov = { vinto: leg.metodo === 'punta' ? leg.stake * (leg.quota - 1) : leg.stake * (1 - c), perso: leg.metodo === 'punta' ? -leg.stake : -leg.stake * (leg.quota - 1) };
        leg.movimento = Math.round((mov[leg.statoEvento] ?? 0) * 100) / 100;
        return send(200, leg);
    }
    const legsMatch = path.match(/^\/api\/profit-tracker\/bets\/([^/]+)\/legs$/);
    if (legsMatch && req.method === 'POST') {
        const body = await readBody(req);
        const legs = (body.legs ?? []).map((l, i) => ({ id: `leg-${saved.legs.length + i + 1}`, betId: legsMatch[1], ...l }));
        saved.legs.push(...legs);
        LEGS.push(...legs);
        console.log('  legs:', JSON.stringify(legs));
        return send(201, legs);
    }
    // §14.103, come il backend: un campo nel body si scrive (null svuota), uno assente resta;
    // la nota null di una giocata non esce nel JSON. Book personali: Joi tiene solo
    // descrizione e isExchange; globali: URL ed ID a null restano (COALESCE).
    const patchItem = async (list, id, label, fields) => {
        const item = list.find((x) => x.id === id);
        if (!item) return send(404, { message: `mock: no ${label} ${id}` });
        const body = await readBody(req);
        saved.patches.push({ method: req.method, path, body });
        console.log(`  ${label}:`, JSON.stringify(body));
        for (const [k, val] of Object.entries(body)) {
            if (fields && !fields.includes(k)) continue;
            item[k] = val;
        }
        if (item.nota === null) delete item.nota;
        return send(200, item);
    };
    const ptMatch = path.match(/^\/api\/profit-tracker\/(holders|accounts|wallets|bets|books|global-books)\/([^/]+)$/);
    if (ptMatch && (req.method === 'PATCH' || req.method === 'PUT')) {
        const [, kind, id] = ptMatch;
        if (kind === 'holders') return patchItem(HOLDERS, id, 'holder', ['descrizione', 'stato']);
        if (kind === 'accounts' && id === 'a7') {
            const body = await readBody(req);
            saved.patches.push({ method: req.method, path, body, rejected: true });
            console.log('  account a7 (rifiutata):', JSON.stringify(body));
            return send(500, { message: 'Errore voluto dal mock sul conto a7' });
        }
        if (kind === 'accounts') return patchItem(ACCOUNTS, id, 'account');
        if (kind === 'wallets') return patchItem(WALLETS, id, 'wallet');
        if (kind === 'bets') {
            // §14.298: il ripristino toglie la data di archiviazione (la rimette la lista alla prossima archiviazione).
            const b = BETS.find((x) => x.id === id);
            if (b && b.archiviata) delete b.archiviataAt;
            return patchItem(BETS, id, 'bet');
        }
        if (kind === 'books') return patchItem(BOOKS, id, 'book', ['descrizione', 'isExchange']);
        return patchItem(GLOBAL_BOOKS, id, 'global-book', ['nome', 'descrizione', 'isExchange']);
    }
    if (ptMatch && ptMatch[1] === 'bets' && req.method === 'DELETE') {
        const i = BETS.findIndex((b) => b.id === ptMatch[2]);
        if (i < 0) return send(404, { message: 'mock: no bet' });
        if (LEGS.some((l) => l.betId === ptMatch[2] && l.statoEvento !== 'bozza' && l.statoEvento !== 'annullato')) {
            return send(400, { message: 'Impossibile eliminare: la giocata contiene eventi in corso, vinti o persi' });
        }
        BETS.splice(i, 1);
        for (let j = LEGS.length - 1; j >= 0; j--) if (LEGS[j].betId === ptMatch[2]) LEGS.splice(j, 1);
        saved.patches.push({ method: 'DELETE', path });
        console.log('  bet eliminata:', ptMatch[2]);
        return send(204);
    }
    if (ptMatch && ptMatch[1] === 'bets' && req.method === 'GET') {
        const bet = BETS.find((b) => b.id === ptMatch[2]);
        return bet ? send(200, { bet, legs: LEGS.filter((l) => l.betId === bet.id) }) : send(404, { message: 'mock: no bet' });
    }
    // §14.109: catalogo, wallet per metodo, prelievi in attesa → pagati/annullati, feed con lo stato.
    if (path === '/api/profit-tracker/movement-categories') return send(200, MOVEMENT_CATEGORIES.filter((c) => c.attivo).map((c) => ({ ...c, inUso: categoryInUse(c.id) })));
    if (path === '/api/profit-tracker/global-movement-categories' && req.method === 'GET') return send(200, MOVEMENT_CATEGORIES.map((c) => ({ ...c, inUso: categoryInUse(c.id) })));
    if (path === '/api/profit-tracker/global-movement-categories' && req.method === 'POST') {
        const body = await readBody(req);
        const nome = String(body.nome ?? '').trim();
        console.log('  movement-category:', JSON.stringify(body));
        if (MOVEMENT_CATEGORIES.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return send(409, { message: 'Esiste già una categoria con questo nome' });
        const c = { ...mc(nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nome, body.direzione, body.natura, MOVEMENT_CATEGORIES.length + 1, body.attivo ?? true), descrizione: body.descrizione ?? null, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
        MOVEMENT_CATEGORIES.push(c);
        return send(201, { ...c, inUso: 0 });
    }
    const mcMatch = path.match(/^\/api\/profit-tracker\/global-movement-categories\/([^/]+)$/);
    if (mcMatch && req.method === 'PUT') {
        const c = MOVEMENT_CATEGORIES.find((x) => x.id === mcMatch[1]);
        if (!c) return send(404, { message: 'Categoria non trovata' });
        const body = await readBody(req);
        console.log('  movement-category:', mcMatch[1], JSON.stringify(body));
        const inUso = categoryInUse(c.id);
        if (inUso > 0 && ((body.direzione && body.direzione !== c.direzione) || (body.natura && body.natura !== c.natura))) return send(409, { message: `Categoria usata da ${inUso} movimenti: direzione e natura non si possono cambiare, creane una nuova` });
        if (typeof body.nome === 'string' && MOVEMENT_CATEGORIES.some((x) => x.id !== c.id && x.nome.toLowerCase() === body.nome.trim().toLowerCase())) return send(409, { message: 'Esiste già una categoria con questo nome' });
        if (typeof body.nome === 'string') c.nome = body.nome.trim();
        if ('descrizione' in body) c.descrizione = body.descrizione;
        if (body.direzione) c.direzione = body.direzione;
        if (body.natura) c.natura = body.natura;
        if (typeof body.attivo === 'boolean') c.attivo = body.attivo;
        c.updatedAt = iso(Date.now());
        return send(200, { ...c, inUso });
    }
    if (mcMatch && req.method === 'DELETE') {
        const i = MOVEMENT_CATEGORIES.findIndex((x) => x.id === mcMatch[1]);
        if (i < 0) return send(404, { message: 'Categoria non trovata' });
        const inUso = categoryInUse(MOVEMENT_CATEGORIES[i].id);
        if (inUso > 0) return send(409, { message: `Categoria usata da ${inUso} movimenti: disattivala invece di eliminarla` });
        MOVEMENT_CATEGORIES.splice(i, 1);
        return send(204);
    }
    if (path === '/api/profit-tracker/wallet-movements' && req.method === 'GET') return send(200, WALLET_MOVEMENTS.map(withCategory));
    if (path === '/api/profit-tracker/wallet-movements' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  wallet-movement:', JSON.stringify(body));
        const valore = Number(body.valore);
        if (!(valore > 0)) return send(400, { message: 'Il valore del movimento deve essere maggiore di zero' });
        let categoryId = null;
        if (body.tipo === 'ricarica' || body.tipo === 'spesa') {
            const wallet = WALLETS.find((w) => w.id === body.walletId);
            if (!wallet) return send(400, { message: 'Wallet non valido per questo utente' });
            if (!body.categoryId) return send(400, { message: 'Categoria obbligatoria per ricariche e spese' });
            const c = MOVEMENT_CATEGORIES.find((x) => x.id === body.categoryId);
            if (!c) return send(400, { message: 'Categoria non valida' });
            if (!c.attivo) return send(400, { message: "Categoria disattivata: scegline un'altra" });
            if (c.direzione !== (body.tipo === 'ricarica' ? 'entrata' : 'uscita')) return send(400, { message: body.tipo === 'ricarica' ? 'Su una ricarica serve una categoria di entrata' : 'Su una spesa serve una categoria di uscita' });
            if (body.holderId && !HOLDERS.some((h) => h.id === body.holderId)) return send(400, { message: 'Collaboratore non valido per questo utente' });
            if (body.tipo === 'spesa' && wallet.saldoAttuale < valore) return send(400, { message: 'Saldo wallet insufficiente per registrare la spesa' });
            wallet.saldoAttuale += body.tipo === 'ricarica' ? valore : -valore;
            categoryId = c.id;
        } else if (body.tipo === 'trasferimento') {
            if (body.categoryId) return send(400, { message: 'Un trasferimento tra wallet non ha categoria' });
            const from = WALLETS.find((w) => w.id === body.fromWalletId); const to = WALLETS.find((w) => w.id === body.toWalletId);
            if (!from || !to || from === to) return send(400, { message: 'Wallet non validi per questo utente' });
            if (from.saldoAttuale < valore) return send(400, { message: 'Saldo wallet insufficiente per effettuare il trasferimento' });
            from.saldoAttuale -= valore; to.saldoAttuale += valore;
        } else return send(400, { message: 'Tipo movimento wallet non valido' });
        const m = { id: `wm${WALLET_MOVEMENTS.length + 1}`, walletId: body.walletId ?? null, tipo: body.tipo, fromWalletId: body.fromWalletId ?? null, toWalletId: body.toWalletId ?? null, valore, dataRegistrazione: body.dataRegistrazione, descrizione: body.descrizione ?? null, categoryId, holderId: body.holderId ?? null, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
        WALLET_MOVEMENTS.push(m);
        return send(201, withCategory(m));
    }
    const wmMatch = path.match(/^\/api\/profit-tracker\/wallet-movements\/([^/]+)$/);
    if (wmMatch && req.method === 'PATCH') {
        const m = WALLET_MOVEMENTS.find((x) => x.id === wmMatch[1]);
        if (!m) return send(404, { message: 'Movimento non trovato' });
        const body = await readBody(req);
        console.log('  wallet-movement patch:', wmMatch[1], JSON.stringify(body));
        if (m.tipo === 'trasferimento' && (body.categoryId !== undefined || body.holderId !== undefined)) return send(409, { message: 'Un trasferimento tra wallet non ha categoria' });
        if (body.categoryId !== undefined) {
            const c = MOVEMENT_CATEGORIES.find((x) => x.id === body.categoryId);
            if (!c) return send(400, { message: 'Categoria non valida' });
            if (c.direzione !== (m.tipo === 'ricarica' ? 'entrata' : 'uscita')) return send(400, { message: m.tipo === 'ricarica' ? 'Su una ricarica serve una categoria di entrata' : 'Su una spesa serve una categoria di uscita' });
            m.categoryId = c.id;
        }
        if (body.holderId !== undefined) m.holderId = body.holderId;
        if (body.descrizione !== undefined) m.descrizione = body.descrizione;
        m.updatedAt = iso(Date.now());
        return send(200, withCategory(m));
    }
    if (path === '/api/profit-tracker/payment-methods') return send(200, PAYMENT_METHODS.filter((m) => m.attivo));
    if (path === '/api/profit-tracker/global-payment-methods' && req.method === 'GET') return send(200, PAYMENT_METHODS);
    if (path === '/api/profit-tracker/global-payment-methods' && req.method === 'POST') {
        const body = await readBody(req);
        const nome = String(body.nome ?? '').trim();
        console.log('  payment-method:', JSON.stringify(body));
        if (PAYMENT_METHODS.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) return send(409, { message: 'Esiste già un metodo di pagamento con questo nome' });
        const m = { id: `pm-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, slug: nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nome, descrizione: body.descrizione ?? null, attivo: body.attivo ?? true, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
        PAYMENT_METHODS.push(m);
        return send(201, m);
    }
    const pmMatch = path.match(/^\/api\/profit-tracker\/global-payment-methods\/([^/]+)$/);
    if (pmMatch && req.method === 'PUT') {
        const m = PAYMENT_METHODS.find((x) => x.id === pmMatch[1]);
        if (!m) return send(404, { message: 'Metodo di pagamento non trovato' });
        const body = await readBody(req);
        console.log('  payment-method:', JSON.stringify(body));
        if (typeof body.nome === 'string' && PAYMENT_METHODS.some((x) => x.id !== m.id && x.nome.toLowerCase() === body.nome.trim().toLowerCase())) return send(409, { message: 'Esiste già un metodo di pagamento con questo nome' });
        if (typeof body.nome === 'string') { m.nome = body.nome.trim(); for (const w of WALLETS) if (w.paymentMethodId === m.id) w.nome = m.nome; }
        if ('descrizione' in body) m.descrizione = body.descrizione;
        if (typeof body.attivo === 'boolean') m.attivo = body.attivo;
        m.updatedAt = iso(Date.now());
        return send(200, m);
    }
    if (pmMatch && req.method === 'DELETE') {
        const i = PAYMENT_METHODS.findIndex((x) => x.id === pmMatch[1]);
        if (i < 0) return send(404, { message: 'Metodo di pagamento non trovato' });
        const n = WALLETS.filter((w) => w.paymentMethodId === pmMatch[1]).length;
        if (n > 0) return send(409, { message: `Metodo di pagamento usato da ${n} wallet: disattivalo invece di eliminarlo` });
        PAYMENT_METHODS.splice(i, 1);
        return send(204);
    }
    if (path === '/api/profit-tracker/wallets' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  wallet:', JSON.stringify(body));
        const m = PAYMENT_METHODS.find((x) => x.id === body.paymentMethodId);
        if (!m) return send(400, { message: 'Metodo di pagamento non valido' });
        if (WALLETS.some((w) => w.holderId === body.holderId && w.paymentMethodId === m.id)) return send(409, { message: 'Il collaboratore ha già un wallet per questo metodo di pagamento' });
        const w = { id: `w${WALLETS.length + 1}`, holderId: body.holderId, paymentMethodId: m.id, nome: m.nome, descrizione: body.descrizione ?? null, saldoAttuale: body.saldoIniziale ?? 0, inAttesa: 0, stato: body.stato ?? 'abilitato', bloccato: false, createdAt: iso(Date.now()) };
        WALLETS.push(w);
        return send(201, w);
    }
    if (path === '/api/profit-tracker/account-movements' && req.method === 'GET') {
        const stato = url.searchParams.get('stato');
        return send(200, ACCOUNT_MOVEMENTS.filter((m) => !stato || m.stato === stato));
    }
    if (path === '/api/profit-tracker/account-movements' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  account-movement:', JSON.stringify(body));
        const account = ACCOUNTS.find((a) => a.id === body.accountId);
        const wallet = WALLETS.find((w) => w.id === body.walletId);
        if (!account) return send(400, { message: 'Conto non valido per questo utente' });
        const valore = Number(body.valore);
        let stato = 'pagato';
        let dataPagamento = null;
        if (body.tipo === 'prelievo') {
            if (!wallet) return send(400, { message: 'Wallet obbligatorio per deposito e prelievo' });
            if (account.saldoAttuale < valore) return send(400, { message: 'Saldo insufficiente sul conto per effettuare il prelievo' });
            account.saldoAttuale -= valore;
            if (body.stato === 'pagato') { wallet.saldoAttuale += valore; dataPagamento = body.dataPagamento ?? body.dataRegistrazione; }
            else { stato = 'in_attesa'; wallet.inAttesa += valore; }
        } else if (body.tipo === 'deposito') {
            if (!wallet) return send(400, { message: 'Wallet obbligatorio per deposito e prelievo' });
            if (wallet.saldoAttuale < valore) return send(400, { message: 'Saldo insufficiente sul wallet per effettuare il deposito' });
            wallet.saldoAttuale -= valore; account.saldoAttuale += valore;
        } else {
            account.saldoAttuale += valore;
        }
        const holder = HOLDERS.find((h) => h.id === account.holderId);
        const m = { id: `am${ACCOUNT_MOVEMENTS.length + 1}`, accountId: account.id, tipo: body.tipo, walletId: wallet ? wallet.id : null, valore, dataRegistrazione: body.dataRegistrazione, descrizione: body.descrizione ?? null, stato, dataPagamento, accountNome: account.nome, holderId: holder ? holder.id : null, walletNome: wallet ? wallet.nome : null };
        ACCOUNT_MOVEMENTS.push(m);
        return send(201, m);
    }
    const amMatch = path.match(/^\/api\/profit-tracker\/account-movements\/([^/]+)(\/pay)?$/);
    if (amMatch && req.method === 'PATCH' && amMatch[2]) {
        const m = ACCOUNT_MOVEMENTS.find((x) => x.id === amMatch[1]);
        if (!m) return send(404, { message: 'Movimento non trovato' });
        if (m.tipo !== 'prelievo') return send(400, { message: 'Solo un prelievo può essere segnato come pagato' });
        if (m.stato === 'pagato') return send(409, { message: 'Prelievo già pagato' });
        const body = await readBody(req);
        console.log('  pay:', amMatch[1], JSON.stringify(body));
        const wallet = WALLETS.find((w) => w.id === m.walletId);
        if (wallet) { wallet.saldoAttuale += m.valore; wallet.inAttesa = Math.max(0, wallet.inAttesa - m.valore); }
        m.stato = 'pagato'; m.dataPagamento = body.dataPagamento ?? iso(Date.now());
        return send(200, m);
    }
    if (amMatch && req.method === 'DELETE' && !amMatch[2]) {
        const i = ACCOUNT_MOVEMENTS.findIndex((x) => x.id === amMatch[1]);
        if (i < 0) return send(404, { message: 'Movimento non trovato' });
        const m = ACCOUNT_MOVEMENTS[i];
        if (m.tipo !== 'prelievo' || m.stato !== 'in_attesa') return send(409, { message: 'Si può annullare solo un prelievo in attesa' });
        console.log('  cancel:', amMatch[1]);
        const account = ACCOUNTS.find((a) => a.id === m.accountId);
        if (account) account.saldoAttuale += m.valore;
        const wallet = WALLETS.find((w) => w.id === m.walletId);
        if (wallet) wallet.inAttesa = Math.max(0, wallet.inAttesa - m.valore);
        ACCOUNT_MOVEMENTS.splice(i, 1);
        return send(204);
    }
    const feedEntries = () => [
        ...ACCOUNT_MOVEMENTS.map((m) => ({ id: m.id, source: m.tipo, data: m.dataRegistrazione, importo: m.valore, accountId: m.accountId, walletId: m.walletId, descrizione: m.descrizione, stato: m.stato, dataPagamento: m.dataPagamento, categoriaSlug: null, categoriaNome: null, natura: null, holderId: null })),
        // §14.111: come il backend, l'importo di un movimento di wallet è il valore (positivo), la categoria viaggia con la riga.
        ...WALLET_MOVEMENTS.map((m) => { const c = categoryOf(m); return { id: m.id, source: m.tipo, data: m.dataRegistrazione, importo: m.valore, accountId: null, walletId: m.walletId ?? m.fromWalletId ?? null, descrizione: m.descrizione, stato: null, dataPagamento: null, categoriaSlug: c ? c.slug : null, categoriaNome: c ? c.nome : null, natura: c ? c.natura : null, holderId: m.holderId ?? null }; }),
    ];
    const feedFilter = (rows) => {
        const q = url.searchParams;
        const s = q.get('source'); const st = q.get('stato'); const cat = q.get('categoria'); const dc = q.get('daClassificare') === 'true'; const w = q.get('walletId'); const a = q.get('accountId'); const from = q.get('fromDate'); const to = q.get('toDate');
        return rows.filter((r) => (!s || r.source === s) && (!st || r.stato === st) && (!cat || r.categoriaSlug === cat) && (!dc || ((r.source === 'ricarica' || r.source === 'spesa') && !r.categoriaSlug)) && (!w || r.walletId === w) && (!a || r.accountId === a) && (!from || r.data >= from) && (!to || r.data <= to)).sort((a, b) => (a.data < b.data ? 1 : -1));
    };
    // §14.111: il report come conto economico, dalle giocate rapide e dai movimenti di wallet classificati.
    const reportRows = () => {
        const q = url.searchParams;
        const from = q.get('fromDate'); const to = q.get('toDate'); const holderId = q.get('holderId'); const accountId = q.get('accountId'); const bookId = q.get('bookId'); const categoria = q.get('categoria');
        const inWindow = (d) => (!from || d >= from) && (!to || d <= to);
        const rows = [];
        for (const b of QUICK_BETS) {
            const acc = ACCOUNTS.find((x) => x.id === b.accountId);
            if (!acc || !inWindow(b.dataRegistrazione)) continue;
            if ((holderId && acc.holderId !== holderId) || (accountId && acc.id !== accountId) || (bookId && acc.bookId !== bookId) || (categoria && b.quickMethod !== categoria)) continue;
            rows.push({ importo: b.movimento, data: b.dataRegistrazione, accountId: acc.id, bookId: acc.bookId, holderId: acc.holderId, sezione: 'giocate', categoria: b.quickMethod, categoriaNome: null, refId: `quick:${b.id}`, kind: 'quick', id: b.id, nome: b.nota ?? null, walletId: null });
        }
        if (!accountId && !bookId) {
            for (const m of WALLET_MOVEMENTS) {
                const c = categoryOf(m);
                if (m.tipo === 'trasferimento' || !c || c.natura === 'capitale' || !inWindow(m.dataRegistrazione)) continue;
                const w = WALLETS.find((x) => x.id === m.walletId); const h = m.holderId ?? (w ? w.holderId : null);
                if ((holderId && h !== holderId) || (categoria && c.slug !== categoria)) continue;
                rows.push({ importo: m.tipo === 'ricarica' ? m.valore : -m.valore, data: m.dataRegistrazione, accountId: null, bookId: null, holderId: h, sezione: c.natura, categoria: c.slug, categoriaNome: c.nome, refId: `wm:${m.id}`, kind: m.tipo, id: m.id, nome: m.descrizione ?? null, walletId: m.walletId });
            }
        }
        return rows;
    };
    const amountsOf = (rows) => {
        const sum = (sez) => rows.filter((r) => r.sezione === sez).reduce((s, r) => s + r.importo, 0);
        const profittoGiocate = sum('giocate'); const altreEntrate = sum('reddito'); const costiAttivita = -sum('costo_attivita'); const spesePersonali = -sum('spesa_personale');
        const nettoAttivita = profittoGiocate - costiAttivita;
        return { profittoGiocate, altreEntrate, costiAttivita, spesePersonali, nettoAttivita, netto: nettoAttivita + altreEntrate - spesePersonali, giocate: rows.filter((r) => r.sezione === 'giocate').length, movimenti: rows.filter((r) => r.sezione !== 'giocate').length };
    };
    if (path === '/api/profit-tracker/report') {
        const q = url.searchParams; const rows = reportRows();
        const monthOf = (d) => `${d.slice(0, 7)}-01T00:00:00.000Z`;
        const groups = new Map();
        for (const r of rows) {
            const key = [monthOf(r.data), r.sezione, r.categoria, r.accountId, r.holderId].join('|');
            const g = groups.get(key) ?? { periodStart: monthOf(r.data), sezione: r.sezione, categoria: r.categoria, categoriaNome: r.categoriaNome, accountId: r.accountId, bookId: r.bookId, holderId: r.holderId, totale: 0, giocate: 0 };
            g.totale += r.importo; g.giocate += 1; groups.set(key, g);
        }
        const months = [...new Set(rows.map((r) => monthOf(r.data)))].sort();
        const buckets = months.map((m) => { const a = amountsOf(rows.filter((r) => monthOf(r.data) === m)); return { periodStart: m, totale: a.profittoGiocate, ...a }; });
        const from = q.get('fromDate'); const to = q.get('toDate'); const holderId = q.get('holderId');
        const extraRows = (q.get('accountId') || q.get('bookId')) ? [] : WALLET_MOVEMENTS.filter((m) => m.tipo !== 'trasferimento' && (!from || m.dataRegistrazione >= from) && (!to || m.dataRegistrazione <= to) && (!holderId || (m.holderId ?? (WALLETS.find((w) => w.id === m.walletId) || {}).holderId) === holderId));
        const cap = (tipo) => extraRows.filter((m) => { const c = categoryOf(m); return c && c.natura === 'capitale' && m.tipo === tipo; }).reduce((s, m) => s + m.valore, 0);
        const totals = amountsOf(rows);
        return send(200, { rows: [...groups.values()], buckets, totale: totals.profittoGiocate, ...totals, capitaleVersato: cap('ricarica'), capitaleRitirato: cap('spesa'), daClassificare: extraRows.filter((m) => !m.categoryId).length });
    }
    if (path === '/api/profit-tracker/report/detail') {
        const q = url.searchParams; const page = Number(q.get('page') ?? 1); const limit = Number(q.get('limit') ?? 25);
        const items = reportRows().sort((a, b) => (a.data < b.data ? 1 : -1)).map((r) => ({ kind: r.kind, id: r.id, nome: r.nome, categoria: r.categoria, categoriaNome: r.categoriaNome, sezione: r.sezione, data: r.data, importo: r.importo, accountIds: r.accountId ? [r.accountId] : [], walletId: r.walletId, holderId: r.holderId }));
        return send(200, { items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit });
    }
    // Dashboard (feature/dashboard): profitto mensile realizzato dell'anno, con un mese in perdita,
    // e il totale delle puntate in corso. Solo i mesi già iniziati, come il backend.
    // §14.336: `POST /__mock/dashboard-empty` (body {"empty": true|false}) spegne i profitti per lo
    // stato vuoto della Dashboard dal design.
    if (path === '/__mock/dashboard-empty' && req.method === 'POST') {
        const flag = await readBody(req);
        globalThis.__mockDashboardEmpty = !!(flag && flag.empty);
        return send(200, { empty: globalThis.__mockDashboardEmpty });
    }
    if (path === '/api/profit-tracker/unified-profit-summary') {
        const year = new Date().getUTCFullYear();
        const amounts = globalThis.__mockDashboardEmpty
            ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            : [412.5, 286.1, -134.8, 655.0, 520.35, 98.4, -42.15, 731.9, 384.25, 210.6, 0, 0];
        const buckets = amounts.slice(0, new Date().getUTCMonth() + 1)
            .map((total, m) => ({ periodStart: `${year}-${String(m + 1).padStart(2, '0')}-01T00:00:00.000Z`, total }));
        return send(200, { granularity: 'month', rangeTotal: buckets.reduce((s, b) => s + b.total, 0), buckets });
    }
    if (path === '/api/profit-tracker/puntate-in-corso/totale') {
        return send(200, { totale: 185 });
    }
    if (path === '/api/profit-tracker/activity-feed/summary') {
        const rows = feedFilter(feedEntries());
        const entrate = rows.filter((r) => r.importo > 0).reduce((s, r) => s + r.importo, 0);
        const uscite = rows.filter((r) => r.importo < 0).reduce((s, r) => s + r.importo, 0);
        return send(200, { totaleEntrate: entrate, totaleUscite: uscite, saldoNetto: entrate + uscite });
    }
    if (path === '/api/profit-tracker/activity-feed') {
        const rows = feedFilter(feedEntries());
        return send(200, { items: rows, total: rows.length, page: 1, limit: 25 });
    }
    if (path === '/api/profit-tracker/quick-bets' && req.method === 'GET' && url.searchParams.has('page')) {
        // §14.293: la lista paginata come listQuickBets del backend (filtri, ricerca, ordine, pagina).
        return send(200, quickBetsPage(url.searchParams));
    }
    if (path === '/api/profit-tracker/quick-bets' && req.method === 'GET') {
        const accountId = url.searchParams.get('accountId');
        return send(200, quickBetsNewestFirst(QUICK_BETS.filter((b) => !accountId || b.accountId === accountId)));
    }
    if (path === '/api/profit-tracker/quick-bets' && req.method === 'POST') {
        const body = await readBody(req);
        console.log('  quick-bet:', JSON.stringify(body));
        const account = ACCOUNTS.find((a) => a.id === body.accountId);
        if (!account) return send(400, { message: 'Conto non valido per questo utente' });
        const movimento = Number(body.movimento);
        account.saldoAttuale += movimento;
        const b = { id: `qb${QUICK_BETS.length + 1}`, accountId: account.id, quickMethod: body.quickMethod, movimento, dataRegistrazione: body.dataRegistrazione, tag: body.tag ?? undefined, nota: body.nota ?? undefined, createdAt: iso(Date.now()), updatedAt: iso(Date.now()) };
        QUICK_BETS.push(b);
        return send(201, b);
    }
    const qbMatch = path.match(/^\/api\/profit-tracker\/quick-bets\/([^/]+)$/);
    if (qbMatch && req.method === 'PATCH') {
        const b = QUICK_BETS.find((x) => x.id === qbMatch[1]);
        if (!b) return send(404, { message: 'Giocata rapida non trovata' });
        const body = await readBody(req);
        console.log('  quick-bet patch:', qbMatch[1], JSON.stringify(body));
        if (body.movimento !== undefined) {
            const account = ACCOUNTS.find((a) => a.id === b.accountId);
            if (account) account.saldoAttuale += Number(body.movimento) - b.movimento;
            b.movimento = Number(body.movimento);
        }
        if (body.tag !== undefined) b.tag = body.tag ?? undefined;
        if (body.nota !== undefined) b.nota = body.nota ?? undefined;
        b.updatedAt = iso(Date.now());
        return send(200, b);
    }
    if (qbMatch && req.method === 'DELETE') {
        const i = QUICK_BETS.findIndex((x) => x.id === qbMatch[1]);
        if (i < 0) return send(404, { message: 'Giocata rapida non trovata' });
        console.log('  quick-bet delete:', qbMatch[1]);
        const account = ACCOUNTS.find((a) => a.id === QUICK_BETS[i].accountId);
        if (account) account.saldoAttuale -= QUICK_BETS[i].movimento;
        QUICK_BETS.splice(i, 1);
        return send(204);
    }
    if (path === '/api/profit-tracker/wallets') return send(200, WALLETS);
    // §14.281: come il backend, la lista porta il riepilogo delle gambe (prima gamba, eventi senza doppioni).
    if (path === '/api/profit-tracker/bets' && url.searchParams.get('archiviata') === 'true' && url.searchParams.has('page')) {
        return send(200, archivedBetsPage(url.searchParams));
    }
    if (path === '/api/profit-tracker/bets') return send(200, BETS.map((b) => ({ ...b, riepilogoGambe: legSummaryOf(b.id) })));
    if (path === '/api/profit-tracker/tags') return send(200, TAGS);
    if (path === '/api/profit-tracker/global-books') return send(200, GLOBAL_BOOKS);
    if (path === '/__mock/saved') return send(200, saved);
    if (await backofficeMock({ path, method: req.method, url, send, readBody: () => readBody(req), scrapers: SCRAPERS })) return;
    return send(404, { message: `mock: no route for ${req.method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock api on http://127.0.0.1:${PORT} (${ROWS.length} matcher rows)`));
