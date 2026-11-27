'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dices, Goal, Repeat, ShieldCheck, Target, TrendingUp, type LucideIcon } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DsModal, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsAlert, countLabel } from '@/components/profit-tracker/tracker-ds'
import { parseDecimal } from '@/lib/profit-tracker/bet-detail'
import { BET_CATEGORIES } from '@/lib/profit-tracker/categories'
import { MONTH_FULL, dashMoney } from '@/lib/profit-tracker/dashboard'
import {
  SECTION_KEYS,
  categoriesFromRows,
  daysLeftInMonth,
  goalProgress,
  goalsOfMonth,
  isSectionKey,
  monthKey,
  monthsReached,
  sectionMonths,
  sectionTotals,
  type GoalProgress,
} from '@/lib/profit-tracker/report-sections'
import { cn } from '@/lib/utils'
import { getProfitGoals, updateProfitGoals } from '@/services/api/profit-tracker-client'
import type {
  BetCategory,
  ProfitGoal,
  ProfitGoalsUpdate,
  ProfitReportResult,
} from '@/types/profit-tracker'

/**
 * Le sezioni del Report (§14.415): una card per Matched Betting, Surebet, Valuebet e
 * Risultato + Goal con il profitto delle giocate del periodo, più «Altre giocate» (le rapide)
 * quando ce ne sono. Ogni sezione può avere un obiettivo mensile: la card mostra il mese (quello
 * aperto, o il mese in corso nell'anno in corso) con la barra e quanto manca; sopra le card, il
 * totale delle sezioni con un obiettivo. Gli obiettivi valgono sul totale, quindi con un filtro
 * per identità o per conto non si vedono. Un clic sul nome di una sezione filtra il Report.
 */

const SECTION_ICON: Record<BetCategory, LucideIcon> = {
  matched_betting: Repeat,
  surebet: ShieldCheck,
  valuebet: TrendingUp,
  risultato_goal: Goal,
}

const SECTION_LABEL = Object.fromEntries(BET_CATEGORIES.map((c) => [c.value, c.label])) as Record<
  BetCategory,
  string
>

const money = (n: number) => dashMoney(n, { sign: false })
const monthName = (m: number) => MONTH_FULL[m].toLowerCase()

/** `AAAA-MM` → «novembre 2026». */
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${monthName(m - 1)} ${y}`
}

export function ReportSezioni({
  report,
  isLoading,
  year,
  selectedMonth,
  now,
  categoria,
  goalsHidden,
  onSelectCategoria,
}: {
  report: ProfitReportResult | null
  isLoading: boolean
  year: number
  selectedMonth: number | null
  now: Date
  /** Il filtro «Categoria» del Report ('' = tutte). */
  categoria: string
  /** Filtro per identità o per conto: gli obiettivi (sul totale) non si confrontano. */
  goalsHidden: boolean
  onSelectCategoria: (key: string) => void
}) {
  const [goals, setGoals] = useState<ProfitGoal[]>([])
  const [goalsMonth, setGoalsMonth] = useState<string | null>(null)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProfitGoals()
      .then((r) => {
        if (cancelled) return
        setGoals(r.goals)
        setGoalsMonth(r.mese)
      })
      .catch(() => {
        if (!cancelled) setGoalsError('Non è stato possibile caricare gli obiettivi.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categorie = useMemo(
    () => (report ? (report.categorie ?? categoriesFromRows(report.rows)) : []),
    [report],
  )
  const totals = useMemo(
    () => sectionTotals(categorie, year, selectedMonth),
    [categorie, year, selectedMonth],
  )
  const monthly = useMemo(() => sectionMonths(categorie, year), [categorie, year])

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  // Il mese delle barre: quello aperto, o il mese in corso nell'anno in corso; negli anni
  // passati senza mese aperto solo il conto dei mesi raggiunti.
  const goalMonth = selectedMonth ?? (year === currentYear ? currentMonth : null)
  const isCurrentMonth = goalMonth != null && year === currentYear && goalMonth === currentMonth
  const daysLeft = isCurrentMonth ? daysLeftInMonth(now) : null
  const monthGoals = goalMonth != null ? goalsOfMonth(goals, monthKey(year, goalMonth)) : null
  // I mesi già chiusi del periodo, per «raggiunto in N mesi su M».
  const lastClosed = year < currentYear ? 11 : year === currentYear ? currentMonth - 1 : -1

  const showGoals = !goalsHidden
  const periodo = selectedMonth == null ? `Anno ${year}` : `${MONTH_FULL[selectedMonth]} ${year}`

  // Il totale delle sezioni che hanno un obiettivo nel mese delle barre.
  const total = useMemo(() => {
    if (goalMonth == null || !monthGoals) return null
    const withGoal = SECTION_KEYS.filter((k) => monthGoals[k] != null)
    if (withGoal.length === 0) return null
    const obiettivo = withGoal.reduce((s, k) => s + (monthGoals[k] ?? 0), 0)
    const fatto = withGoal.reduce((s, k) => s + monthly[k][goalMonth], 0)
    return { progress: goalProgress(obiettivo, fatto), sections: withGoal.length }
  }, [goalMonth, monthGoals, monthly])

  const showAltre = totals.altre.giocate > 0 || totals.altre.totale !== 0

  return (
    <section aria-labelledby="h-report-sezioni" className="flex flex-col gap-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="h-report-sezioni" className="ds-label m-0 text-ds-ink-muted uppercase">
          Sezioni · {periodo}
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={goalsMonth == null}
          className={cn(dsButtonClass('secondary', 'sm'), 'gap-1.5 disabled:opacity-50')}
        >
          <Target className="h-4 w-4" aria-hidden />
          Obiettivi mensili
        </button>
      </div>

      {goalsError && <DsAlert>{goalsError}</DsAlert>}
      {goalsHidden && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">
          Gli obiettivi valgono sul totale: con un filtro per identità o per conto non si vedono.
        </p>
      )}

      {showGoals && !categoria && total && goalMonth != null && (
        <div className={cn(DS_PANEL, 'flex flex-col gap-2 px-5 py-4')}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="ds-body font-semibold text-ds-ink">
              Obiettivo di {monthName(goalMonth)}
              <span className="ds-caption block font-normal text-ds-ink-muted sm:ml-2 sm:inline">
                {total.sections === 1
                  ? 'l’unica sezione con un obiettivo'
                  : `somma delle ${total.sections} sezioni con un obiettivo`}
              </span>
            </span>
            <span className="ds-body text-ds-ink tabular-nums">
              <span className="font-semibold">{money(total.progress.fatto)}</span> su{' '}
              {money(total.progress.obiettivo)}
            </span>
          </div>
          <GoalBar
            progress={total.progress}
            label={`Obiettivo totale di ${monthName(goalMonth)}`}
          />
          <GoalStatus progress={total.progress} daysLeft={daysLeft} />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {SECTION_KEYS.map((key) => {
          const dimmed = categoria !== '' && categoria !== key
          const amount = totals.bySection[key]
          const goal = monthGoals?.[key] ?? null
          const reached =
            selectedMonth == null && lastClosed >= 0
              ? monthsReached(goals, key, monthly[key], year, lastClosed)
              : null
          return (
            <SectionCard
              key={key}
              sectionKey={key}
              label={SECTION_LABEL[key]}
              icon={SECTION_ICON[key]}
              totale={amount.totale}
              giocate={amount.giocate}
              isLoading={isLoading}
              dimmed={dimmed}
              selected={categoria === key}
              onSelect={() => onSelectCategoria(key)}
            >
              {showGoals && !dimmed && !isLoading && (
                <>
                  {goalMonth != null &&
                    (goal == null ? (
                      <p className="ds-caption m-0 text-ds-ink-muted">
                        Nessun obiettivo per {monthName(goalMonth)}
                      </p>
                    ) : (
                      <SectionGoal
                        month={goalMonth}
                        progress={goalProgress(goal, monthly[key][goalMonth])}
                        daysLeft={daysLeft}
                        label={SECTION_LABEL[key]}
                      />
                    ))}
                  {reached && reached.conObiettivo > 0 && (
                    <p className="ds-caption m-0 text-ds-ink-muted">
                      Obiettivo raggiunto {reached.raggiunti}{' '}
                      {reached.raggiunti === 1 ? 'volta' : 'volte'} su {reached.conObiettivo}{' '}
                      {reached.conObiettivo === 1 ? 'mese chiuso' : 'mesi chiusi'}
                    </p>
                  )}
                </>
              )}
            </SectionCard>
          )
        })}
        {showAltre && (
          <SectionCard
            sectionKey="altre"
            label="Altre giocate"
            icon={Dices}
            totale={totals.altre.totale}
            giocate={totals.altre.giocate}
            isLoading={isLoading}
            dimmed={categoria !== '' && isSectionKey(categoria)}
          >
            <p className="ds-caption m-0 text-ds-ink-muted">
              Le giocate rapide (casinò, slot, trading…), senza obiettivo.
            </p>
          </SectionCard>
        )}
      </div>

      {editing && goalsMonth != null && (
        <GoalsModal
          mese={goalsMonth}
          current={goalsOfMonth(goals, goalsMonth)}
          onClose={() => setEditing(false)}
          onSaved={(r) => {
            setGoals(r.goals)
            setGoalsMonth(r.mese)
            setEditing(false)
          }}
        />
      )}
    </section>
  )
}

function SectionCard({
  sectionKey,
  label,
  icon: Icon,
  totale,
  giocate,
  isLoading,
  dimmed,
  selected,
  onSelect,
  children,
}: {
  sectionKey: string
  label: string
  icon: LucideIcon
  totale: number
  giocate: number
  isLoading: boolean
  dimmed: boolean
  selected?: boolean
  onSelect?: () => void
  children?: React.ReactNode
}) {
  const tone = totale > 0 ? 'text-ds-profit' : totale < 0 ? 'text-ds-loss' : 'text-ds-ink'
  const head = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'font-ds-sans text-sm leading-5 font-semibold',
            selected ? 'text-ds-brand' : 'text-ds-ink',
          )}
        >
          {label}
        </span>
        <span
          aria-hidden
          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </span>
      {isLoading ? (
        <span
          aria-hidden
          className="my-0.5 block h-8 w-36 max-w-full animate-pulse rounded-ds-xs bg-ds-surface-sunken"
        />
      ) : dimmed ? (
        <span className="font-ds-sans text-[28px] leading-8 font-semibold text-ds-ink-muted">
          —
        </span>
      ) : (
        <span
          className={cn(
            'font-ds-sans text-[28px] leading-8 font-semibold tracking-[-0.01em] whitespace-nowrap tabular-nums',
            tone,
          )}
        >
          {dashMoney(totale)}
        </span>
      )}
      <span className="ds-caption text-ds-ink-muted">
        {isLoading ? ' ' : dimmed ? 'Fuori dal filtro' : countLabel(giocate, 'giocata', 'giocate')}
      </span>
    </>
  )
  return (
    <div
      data-sezione={sectionKey}
      className={cn(
        DS_PANEL,
        'flex min-w-0 flex-col gap-3 p-5',
        selected && 'border-ds-brand',
        dimmed && 'opacity-60',
      )}
    >
      {onSelect ? (
        <button
          type="button"
          aria-pressed={selected}
          title={selected ? `Togli il filtro ${label}` : `Filtra il report per ${label}`}
          onClick={onSelect}
          className={cn('flex cursor-pointer flex-col gap-1 rounded-ds-xs text-left', dsFocusRing)}
        >
          {head}
        </button>
      ) : (
        <div className="flex flex-col gap-1">{head}</div>
      )}
      {children}
    </div>
  )
}

function GoalBar({ progress, label }: { progress: GoalProgress; label: string }) {
  const pct = Math.round(progress.quota * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-2 overflow-hidden rounded-full bg-ds-surface-sunken"
    >
      <div
        className={cn('h-full rounded-full', progress.raggiunto ? 'bg-ds-profit' : 'bg-ds-brand')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Quanto manca, o di quanto è stato superato; nel mese in corso anche il ritmo al giorno. */
function GoalStatus({ progress, daysLeft }: { progress: GoalProgress; daysLeft: number | null }) {
  if (progress.raggiunto) {
    return (
      <p className="ds-caption m-0 font-semibold text-ds-profit">
        Raggiunto{progress.oltre > 0 ? `, ${money(progress.oltre)} oltre` : ''}
      </p>
    )
  }
  if (daysLeft != null) {
    return (
      <p className="ds-caption m-0 flex flex-wrap gap-x-1.5 text-ds-ink">
        <span className="font-semibold">Mancano {money(progress.mancano)}</span>
        <span className="text-ds-ink-muted">
          {money(progress.mancano / daysLeft)} al giorno{' '}
          {daysLeft === 1 ? 'nell’ultimo giorno' : `nei ${daysLeft} giorni che restano`}
        </span>
      </p>
    )
  }
  return (
    <p className="ds-caption m-0 text-ds-loss">Non raggiunto, mancati {money(progress.mancano)}</p>
  )
}

function SectionGoal({
  month,
  progress,
  daysLeft,
  label,
}: {
  month: number
  progress: GoalProgress
  daysLeft: number | null
  label: string
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-ds-line pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="ds-caption text-ds-ink-muted">Obiettivo di {monthName(month)}</span>
        <span className="ds-caption text-ds-ink-muted tabular-nums">
          {Math.round(progress.quota * 100)} %
        </span>
      </div>
      <GoalBar progress={progress} label={`Obiettivo di ${monthName(month)}, ${label}`} />
      <span className="ds-body-sm text-ds-ink tabular-nums">
        <span className="font-semibold">{money(progress.fatto)}</span> su{' '}
        {money(progress.obiettivo)}
      </span>
      <GoalStatus progress={progress} daysLeft={daysLeft} />
    </div>
  )
}

/** La finestra degli obiettivi: un importo per sezione, valido dal mese in corso in poi. */
function GoalsModal({
  mese,
  current,
  onClose,
  onSaved,
}: {
  mese: string
  current: Record<BetCategory, number | null>
  onClose: () => void
  onSaved: (result: { mese: string; goals: ProfitGoal[] }) => void
}) {
  const [values, setValues] = useState<Record<BetCategory, string>>(
    () =>
      Object.fromEntries(
        SECTION_KEYS.map((k) => [
          k,
          current[k] == null ? '' : String(current[k]).replace('.', ','),
        ]),
      ) as Record<BetCategory, string>,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = SECTION_KEYS.map((k) => {
    const n = parseDecimal(values[k])
    const invalid = values[k].trim() !== '' && (n == null || n < 0)
    return { key: k, value: n == null || n <= 0 ? null : Math.round(n * 100) / 100, invalid }
  })
  const hasErrors = parsed.some((p) => p.invalid)

  const save = async () => {
    if (hasErrors) return
    setSaving(true)
    setError(null)
    try {
      const update: ProfitGoalsUpdate = Object.fromEntries(parsed.map((p) => [p.key, p.value]))
      onSaved(await updateProfitGoals(update))
    } catch {
      setError('Non è stato possibile salvare gli obiettivi. Riprova tra poco.')
      setSaving(false)
    }
  }

  return (
    <DsModal
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Obiettivi mensili"
      description={`Quanto vuoi guadagnare ogni mese con ciascuna sezione. Valgono da ${monthLabel(mese)} in poi; i mesi passati tengono l’obiettivo che avevano. Lascia vuoto per nessun obiettivo.`}
      footer={
        <>
          <button type="button" onClick={onClose} className={dsButtonClass('ghost', 'md')}>
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || hasErrors}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {saving ? 'Salvataggio…' : 'Salva obiettivi'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {parsed.map((p) => (
          <GTextField
            key={p.key}
            id={`obiettivo-${p.key}`}
            label={SECTION_LABEL[p.key]}
            value={values[p.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [p.key]: v }))}
            placeholder="Nessuno"
            numeric
            suffix="€"
            error={p.invalid ? 'Scrivi un importo positivo, o lascia vuoto.' : undefined}
            onEnter={() => void save()}
          />
        ))}
      </div>
      {error && <DsAlert>{error}</DsAlert>}
    </DsModal>
  )
}
