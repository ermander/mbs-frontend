'use client'

import { useEffect, useMemo, useState } from 'react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AssignAccountsModal,
  type AssignLeg,
} from '@/components/strumenti/scanner-v2/assign-accounts-modal'
import { BookmakerBadge } from '@/components/strumenti/scanner-v2/bookmaker-badge'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import {
  DecimalField,
  ResultStat,
  formatNum,
  formatSigned,
  profitClass,
} from '@/components/strumenti/scanner-v2/calculator-shared'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { computeDutch } from '@/lib/calculators/engines/dutch-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { buildDutchBet, type BetEventInfo } from '@/lib/calculators/bet-payloads'
import {
  MIN_FAVOURITE_STAKE,
  adviseStake,
  recommendAccounts,
  type Allocation,
  type AllocationLeg,
  type StakeAdvice,
} from '@/lib/calculators/account-allocation'
import { useResultBttsSettingsStore } from '@/stores/result-btts-settings-store'
import {
  loadBookAccountsAvailability,
  type BookAccountsAvailability,
} from '@/lib/calculators/load-accounts'
import { shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { formatKickoffLong } from '@/lib/matcher/format'
import {
  RESULT_BTTS_MARKET_LABEL,
  RESULT_BTTS_ZERO_ZERO_LABEL,
  resultBttsLegs,
  resultBttsLowestOddsIndex,
  resultBttsRowKey,
} from '@/lib/result-btts'
import type { ResultBttsLeg, ResultBttsRow } from '@/types/result-btts'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { ratingBadge } from './result-btts-table'

/** The event of a row as the Profit Tracker payloads describe it. */
export function resultBttsEventInfo(row: ResultBttsRow): BetEventInfo {
  return {
    eventoDataIso: new Date(row.startTime).toISOString(),
    eventoNome: `${row.homeName ?? '?'} vs ${row.awayName ?? '?'}`,
    competizione: row.competitionName,
    sport: sportDisplay(row.sportName).ptSport,
    mercato: RESULT_BTTS_MARKET_LABEL,
  }
}

interface ResultBttsCalculatorModalProps {
  row: ResultBttsRow | null
  onClose: () => void
}

/**
 * The calculator of a row of «Risultato + Goal» (§14.177): a plain dutch over
 * the five legs on one bookmaker, the stake on one and the others covers for
 * the same profit whichever wins. The 0-0 («X & NG») is not covered: the
 * bookmaker refunds the stakes. The bet goes to the Profit Tracker as a
 * surebet, one account per leg, with the accounts the tool recommends
 * (§14.242, rule of §14.243). The view is keyed by the row, so it mounts
 * fresh with its prices.
 */
export function ResultBttsCalculatorModal({ row, onClose }: ResultBttsCalculatorModalProps) {
  const event = useMemo(() => (row ? resultBttsEventInfo(row) : null), [row])
  return (
    <Dialog open={row != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[100dvh] max-w-4xl overflow-y-auto overflow-x-hidden p-0 sm:max-h-[90vh]"
        showClose={true}
      >
        <DialogTitle asChild>
          <VisuallyHidden>Calcolatore Risultato + Goal</VisuallyHidden>
        </DialogTitle>
        {row && event && (
          <div className="flex min-w-0 flex-col overflow-hidden">
            <header className="border-b border-border px-5 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                {row.competitionName} · {formatKickoffLong(row.startTime)}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {row.homeName} <span className="font-normal text-muted-foreground">vs</span>{' '}
                {row.awayName}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                  {RESULT_BTTS_MARKET_LABEL}
                </span>
                <BookmakerLink leg={row}>
                  <BookmakerBadge slug={row.bookmakerSlug} name={row.bookmakerName} size="md" />
                </BookmakerLink>
                <span className={ratingBadge(row.rating)}>{row.rating.toFixed(2)}%</span>
              </div>
            </header>
            <ResultBttsCalculatorView
              key={resultBttsRowKey(row)}
              row={row}
              event={event}
              onClose={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ResultBttsCalculatorViewProps {
  row: ResultBttsRow
  event: BetEventInfo
  onClose: () => void
}

type BookAccountsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | ({ status: 'ready' } & BookAccountsAvailability)

export function ResultBttsCalculatorView({ row, event, onClose }: ResultBttsCalculatorViewProps) {
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)
  const legs = useMemo(() => resultBttsLegs(row), [row])
  const zeroZeroOdds = row.zeroZero?.odds ?? null

  const [quotes, setQuotes] = useState<string[]>(() => legs.map((leg) => leg.odds.toFixed(2)))
  // The stake starts on the lowest price, as the user always plays it («Puntata qui» moves it).
  const [puntaIndex, setPuntaIndex] = useState(() => resultBttsLowestOddsIndex(legs))
  const [puntata, setPuntata] = useState('')

  // The two knobs of the stake advice (§14.244), kept in the browser; typed as text, stored as numbers.
  const cushion = useResultBttsSettingsStore((s) => s.cushion)
  const maxStake = useResultBttsSettingsStore((s) => s.maxStake)
  const setCushion = useResultBttsSettingsStore((s) => s.setCushion)
  const setMaxStake = useResultBttsSettingsStore((s) => s.setMaxStake)
  const [cushionText, setCushionText] = useState(() => String(cushion))
  const [maxStakeText, setMaxStakeText] = useState(() => String(maxStake))

  const [assignOpen, setAssignOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)

  // The accounts of the bookmaker with their available balance, read once per opening.
  const [bookAccounts, setBookAccounts] = useState<BookAccountsState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    loadBookAccountsAvailability({
      slug: row.bookmakerSlug,
      name: row.bookmakerName,
      isExchange: false,
    })
      .then((res) => {
        if (!cancelled) setBookAccounts({ status: 'ready', ...res })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setBookAccounts({
            status: 'error',
            message: err instanceof Error ? err.message : 'Errore nel caricamento dei conti',
          })
      })
    return () => {
      cancelled = true
    }
  }, [row.bookmakerSlug, row.bookmakerName])

  const puntataNum = parseNum(puntata)
  const quoteNums = quotes.map(parseNum)
  // The memo keys on the joined quotes: the array is rebuilt on every render.
  const quotesKey = quotes.join('|')

  const result = useMemo(
    () =>
      computeDutch({
        legs: quoteNums.map((q) => ({ grossOdds: q, commissionPercent: 0 })),
        puntaIndex,
        puntata: puntataNum,
        bonus: 0,
        rimborso: 0,
        imbalancePercent: 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotesKey, puntaIndex, puntataNum],
  )

  // The recommended account per leg, as soon as every stake is there and the accounts are read.
  const allocation: Allocation | null = useMemo(() => {
    if (!result.showSummary || bookAccounts.status !== 'ready') return null
    const allocationLegs: AllocationLeg[] = legs.map((leg, i) => ({
      key: leg.outcomeKey,
      stake: result.legs[i].stake ?? 0,
      odds: quoteNums[i] ?? 0,
    }))
    return recommendAccounts(
      allocationLegs,
      bookAccounts.accounts.map((a) => ({ id: a.account.id, available: a.available })),
      { cushion },
    )
    // quotesKey stands for `quoteNums`, rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, bookAccounts, legs, quotesKey, cushion])

  // The stake advice needs the prices and the accounts, not the stake: it is there before typing.
  const advice: StakeAdvice | null = useMemo(() => {
    if (bookAccounts.status !== 'ready') return null
    if (legs.length < 2 || quoteNums.some((q) => q == null || q <= 0)) return null
    return adviseStake({
      legs: legs.map((leg, i) => ({ key: leg.outcomeKey, odds: quoteNums[i] as number })),
      puntaIndex,
      accounts: bookAccounts.accounts.map((a) => ({ id: a.account.id, available: a.available })),
      cushion,
      maxStake,
    })
    // quotesKey stands for `quoteNums`, rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookAccounts, legs, quotesKey, puntaIndex, cushion, maxStake])
  const holderNameOf = (accountId: string) =>
    bookAccounts.status === 'ready'
      ? (bookAccounts.accounts.find((a) => a.account.id === accountId)?.holderName ?? accountId)
      : accountId

  const balances = useMemo(() => {
    if (bookAccounts.status !== 'ready') return undefined
    return Object.fromEntries(bookAccounts.accounts.map((a) => [a.account.id, a.available]))
  }, [bookAccounts])

  // One leg per outcome, every one on the row's bookmaker, its own account.
  const assignLegs: AssignLeg[] = useMemo(
    () =>
      legs.map((leg, i) => ({
        key: leg.outcomeKey,
        title: `${i === puntaIndex ? 'Puntata' : 'Copertura'} · ${leg.label}`,
        detail: `${formatNum(result.legs[i]?.stake ?? null)} € a quota ${formatNum(quoteNums[i] ?? null)}`,
        bookmaker: { slug: row.bookmakerSlug, name: row.bookmakerName, isExchange: false },
        tone: i === puntaIndex ? 'primary' : 'sky',
      })),
    // quotesKey stands for `quoteNums`, rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [legs, puntaIndex, result, row.bookmakerName, row.bookmakerSlug, quotesKey],
  )

  const handleConfirm = async (accountIds: Record<string, string>) => {
    if (!result.showSummary || puntataNum == null) return
    if (quoteNums.some((q) => q == null)) return
    if (legs.some((leg) => !accountIds[leg.outcomeKey])) return
    setSaving(true)
    setSaveError(null)
    try {
      const { betPayload, legsPayload } = buildDutchBet({
        event,
        categoria: 'surebet',
        puntaIndex,
        puntata: puntataNum,
        bonus: 0,
        rimborso: 0,
        legs: legs.map((leg, i) => ({
          selezione: leg.label,
          quotaGross: quoteNums[i] as number,
          commissionePercent: 0,
          accountId: accountIds[leg.outcomeKey],
          stake: result.legs[i].stake as number,
        })),
      })
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {legs.map((leg, i) => {
          const isPunta = i === puntaIndex
          const legResult = result.legs[i]
          return (
            <div
              key={leg.outcomeKey}
              className={cn(
                'flex flex-col items-center rounded-lg border p-3 text-center',
                isPunta ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                {isPunta ? 'Puntata' : 'Copertura'}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{leg.label}</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={quotes[i]}
                onChange={(e) => {
                  const value = sanitizeDecimal(e.target.value)
                  setQuotes((prev) => prev.map((q, j) => (j === i ? value : q)))
                }}
                className="mt-3 h-9 w-full text-center font-mono text-base font-semibold"
                aria-label={`Quota ${leg.label}`}
              />
              <p className="mt-3 font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatNum(legResult?.stake ?? null)} €
              </p>
              {isPunta ? (
                <p className="mt-1 text-[11px] text-muted-foreground">puntata</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setPuntaIndex(i)}
                  className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  Puntata qui
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-end gap-4">
          <DecimalField
            id="rb-calc-puntata"
            label="Puntata €"
            value={puntata}
            onChange={setPuntata}
            className="w-32"
          />
          <DecimalField
            id="rb-calc-cushion"
            label="Cuscinetto €"
            value={cushionText}
            onChange={(v) => {
              setCushionText(v)
              setCushion(parseNum(v) ?? 0)
            }}
            className="w-28"
          />
          <DecimalField
            id="rb-calc-max-stake"
            label="Puntata max €"
            value={maxStakeText}
            onChange={(v) => {
              setMaxStakeText(v)
              setMaxStake(parseNum(v) ?? 0)
            }}
            className="w-28"
          />
          {advice && (
            <div className="flex items-center gap-2 pb-1 text-sm">
              {advice.recommended != null ? (
                <>
                  <span className="text-muted-foreground">Consigliata</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatNum(advice.recommended)} €
                  </span>
                  {advice.favouriteAccountId && (
                    <span className="text-muted-foreground">
                      su {holderNameOf(advice.favouriteAccountId)}
                      {advice.cappedBy === 'max' && ' (tetto)'}
                      {advice.cappedBy === 'covers' && ' (limite delle coperture)'}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPuntata(String(advice.recommended))}
                    disabled={parseNum(puntata) === advice.recommended}
                  >
                    Usa
                  </Button>
                </>
              ) : (
                <span className="text-xs text-amber-400">
                  Nessun conto regge una favorita da almeno {MIN_FAVOURITE_STAKE} € con il
                  cuscinetto: ricarica un conto o abbassa il cuscinetto.
                </span>
              )}
            </div>
          )}
          <div className="grid flex-1 grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 sm:grid-cols-4">
            <ResultStat
              label="Esborso totale"
              value={result.totalOutlay != null ? `€${formatNum(result.totalOutlay)}` : '—'}
            />
            <ResultStat
              label="Coperture"
              value={formatNum(
                result.legs.filter((l) => !l.isPunta).reduce((s, l) => s + (l.stake ?? 0), 0) ||
                  null,
              )}
            />
            <ResultStat
              label="Guadagno min"
              value={result.guadagnoMinimo != null ? `€${formatNum(result.guadagnoMinimo)}` : '—'}
              className={profitClass(result.guadagnoMinimo)}
            />
            <ResultStat
              label="Rating"
              value={result.rating != null ? `${formatNum(result.rating)}%` : '—'}
            />
          </div>
        </div>
      </div>

      {result.showSummary && (
        <RecommendedAccountsPanel
          bookmakerName={row.bookmakerName}
          bookmakerSlug={row.bookmakerSlug}
          legs={legs}
          puntaIndex={puntaIndex}
          quoteNums={quoteNums}
          stakes={result.legs.map((l) => l.stake)}
          state={bookAccounts}
          allocation={allocation}
          advice={advice}
          cushion={cushion}
        />
      )}

      {result.showSummary && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Esito</th>
                <th className="px-4 py-2.5 text-right">Incasso</th>
                <th className="px-4 py-2.5 text-right">Esborso</th>
                <th className="px-4 py-2.5 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const legResult = result.legs[i]
                return (
                  <tr
                    key={`profit-${leg.outcomeKey}`}
                    className={cn('border-b border-border/50', legResult.isPunta && 'bg-primary/5')}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">
                      vince <span className="font-medium text-foreground">{leg.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-primary">
                      {formatSigned(legResult.payout)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-destructive">
                      {formatSigned(result.totalOutlay != null ? -result.totalOutlay : null)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2.5 text-right font-semibold',
                        profitClass(legResult.profit),
                      )}
                    >
                      {formatSigned(legResult.profit)} €
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground">
                  finisce <span className="font-medium text-foreground">0-0</span> (
                  {RESULT_BTTS_ZERO_ZERO_LABEL}
                  {zeroZeroOdds != null ? ` a ${zeroZeroOdds.toFixed(2)}` : ''}): non coperto, il
                  bookmaker rimborsa le puntate
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-muted-foreground">—</td>
                <td className="px-4 py-2.5 text-right font-medium text-destructive">
                  {formatSigned(result.totalOutlay != null ? -result.totalOutlay : null)}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-muted-foreground">
                  rimborso
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Button
        variant="success"
        className="w-full"
        onClick={() => setAssignOpen(true)}
        disabled={!result.showSummary}
      >
        Invia scommessa al Profit Tracker
      </Button>

      <AssignAccountsModal
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open)
          if (!open) setSaveError(null)
        }}
        legs={assignLegs}
        initialSelection={allocation?.byLeg}
        recommended={allocation?.byLeg}
        balances={balances}
        onConfirm={(ids) => void handleConfirm(ids)}
        saving={saving}
        error={saveError}
        savedBetId={savedBetId}
        onDone={() => {
          setAssignOpen(false)
          onClose()
        }}
      />
    </div>
  )
}

interface RecommendedAccountsPanelProps {
  bookmakerName: string
  bookmakerSlug: string
  legs: ResultBttsLeg[]
  puntaIndex: number
  quoteNums: Array<number | null>
  stakes: Array<number | null>
  state: BookAccountsState
  allocation: Allocation | null
  advice: StakeAdvice | null
  cushion: number
}

/**
 * «Su quali conti puntare» (§14.242, §14.243): per leg, the account of the
 * bookmaker the tool recommends, its available balance and what it becomes
 * if the leg wins or loses. The favourite goes on the poorest account that
 * covers its stake, the covers on the richest, the accounts in between hold
 * nothing: see `recommendAccounts`.
 */
function RecommendedAccountsPanel({
  bookmakerName,
  bookmakerSlug,
  legs,
  puntaIndex,
  quoteNums,
  stakes,
  state,
  allocation,
  advice,
  cushion,
}: RecommendedAccountsPanelProps) {
  const shortName = shortBookmakerName(bookmakerName)
  const holderNameOf = (accountId: string) =>
    state.status === 'ready'
      ? (state.accounts.find((a) => a.account.id === accountId)?.holderName ?? accountId)
      : accountId
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Su quali conti puntare</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          La favorita (quota più bassa) sul conto {shortName} con il saldo disponibile più basso che
          la copre; le coperture sui conti più ricchi, la più grossa sul più ricco; gli altri conti
          restano fermi. Disponibile = saldo attuale meno le bozze aperte; ogni conto tiene il
          cuscinetto ({formatNum(cushion)} €) dopo le sue puntate.
        </p>
      </div>
      {state.status === 'loading' && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Lettura dei conti…
        </div>
      )}
      {state.status === 'error' && (
        <p className="px-4 py-3 text-sm text-destructive">{state.message}</p>
      )}
      {state.status === 'ready' && state.book == null && (
        <p className="px-4 py-3 text-xs text-amber-400">
          Nessun libro del Profit Tracker corrisponde a {shortName}. Collegalo dal backoffice
          (External ID «{bookmakerSlug}») o chiama il libro come il bookmaker.
        </p>
      )}
      {state.status === 'ready' && state.book != null && state.accounts.length === 0 && (
        <p className="px-4 py-3 text-xs text-amber-400">
          Nessun conto abilitato su {state.book.nome}. Aggiungine uno in Profit Tracker → Conti.
        </p>
      )}
      {state.status === 'ready' && allocation != null && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2 text-left">Gamba</th>
                  <th className="px-3 py-2 text-right">Quota</th>
                  <th className="px-3 py-2 text-right">Puntata</th>
                  <th className="px-3 py-2 text-left">Conto</th>
                  <th className="px-3 py-2 text-right">Disponibile</th>
                  <th className="px-3 py-2 text-right">Se vince</th>
                  <th className="px-4 py-2 text-right">Se perde</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => {
                  const view = allocation.legs[i]
                  const account = state.accounts.find((a) => a.account.id === view.accountId)
                  const missing = allocation.shortfall[view.accountId]
                  const isPunta = i === puntaIndex
                  return (
                    <tr
                      key={`acc-${leg.outcomeKey}`}
                      className={cn('border-b border-border/50', isPunta && 'bg-primary/5')}
                    >
                      <td className="px-4 py-2">
                        <span className="font-medium text-foreground">{leg.label}</span>
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                          {isPunta ? 'puntata' : 'copertura'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                        {formatNum(quoteNums[i])}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                        {formatNum(stakes[i])} €
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">
                          {account?.holderName ?? view.accountId}
                        </span>
                        {missing != null && (
                          <span className="ml-2 text-xs text-destructive">
                            mancano {formatNum(missing)} €
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {formatNum(account?.available ?? null)} €
                        {account != null && account.bozzaStake > 0 && (
                          <span className="ml-1 text-[10px]">
                            (bozze {formatNum(account.bozzaStake)})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-400">
                        {formatNum(view.ifWins)} €
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right font-mono tabular-nums',
                          view.ifLoses < 0 ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {formatNum(view.ifLoses)} €
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 px-4 py-2.5 text-xs text-muted-foreground">
            {!allocation.feasible && (
              <p className="text-destructive">
                Nessuna combinazione copre tutte le puntate: ricarica un conto o abbassa la puntata.
              </p>
            )}
            {allocation.feasible && allocation.belowCushionAccountIds.length > 0 && (
              <p className="text-amber-400">
                Sotto il cuscinetto:{' '}
                {allocation.belowCushionAccountIds.map(holderNameOf).join(', ')}.
              </p>
            )}
            {advice && advice.ladder.length > 0 && (
              <p>
                Favorita:{' '}
                {advice.ladder
                  .map(
                    (step) => `fino a ${formatNum(step.upTo)} € su ${holderNameOf(step.accountId)}`,
                  )
                  .join(', ')}
                {advice.refillAccountIds.length > 0 &&
                  `; da ricaricare: ${advice.refillAccountIds.map(holderNameOf).join(', ')}`}
                .
              </p>
            )}
            {allocation.feasible && !allocation.distinct && (
              <p>
                I conti non bastano per una gamba ciascuno: alcune gambe vanno sullo stesso conto.
              </p>
            )}
            {allocation.idleAccountIds.length > 0 && (
              <p>Fermi: {allocation.idleAccountIds.map(holderNameOf).join(', ')}.</p>
            )}
            {state.bozzeUnknown && (
              <p className="text-amber-400">
                Bozze aperte non lette: il disponibile è il saldo attuale.
              </p>
            )}
            <p>
              Conti letti: {state.accounts.length} su {state.book?.nome}. I conti proposti sono
              preselezionati nell&apos;invio al Profit Tracker e si possono cambiare.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
