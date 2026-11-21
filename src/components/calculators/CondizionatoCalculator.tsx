'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

import {
  computeCondizionato,
  type CondizionatoScenario,
  type CoverLegResult,
  type CoverMode,
  type CoverSectionInput,
} from '@/lib/calculators/engines/condizionato-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { CalculatorRating, CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import { CondizionatoSaveModal } from '@/components/calculators/CondizionatoSaveModal'
import {
  CalcFigure,
  CalcLayout,
  CalcNumberField,
  CalcOutcomeTable,
  CalcProfits,
  OutcomeRow,
  amount,
  type OutcomeProfitRow,
} from '@/components/calculators/calc-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'

/**
 * Calcolatore offline del rimborso condizionato (§14.349): il book rimborsa la qualificante solo
 * se perde e si verifica una condizione. Si copre la qualificante (in Banca o con una o due
 * Punte) e si scommette contro la condizione (in Banca o con una o due Punte), così il profitto
 * è lo stesso in ogni scenario. I conti stanno in `engines/condizionato-engine.ts`; «Salva nel
 * tracker» (§14.352) apre `CondizionatoSaveModal`.
 */

const DEFAULT_COMMISSION = '4,5'

interface LegState {
  odds: string
  commission: string
}

interface SectionState {
  mode: CoverMode
  legs: LegState[]
}

const newLeg = (commission = DEFAULT_COMMISSION): LegState => ({ odds: '', commission })

const INITIAL_SECTION: SectionState = { mode: 'banca', legs: [newLeg()] }

function toInput(section: SectionState): CoverSectionInput {
  return {
    mode: section.mode,
    legs: section.legs.map((leg) => ({
      odds: parseNum(leg.odds),
      commissionPercent: parseNum(leg.commission),
    })),
  }
}

/** Il nome di una gamba nei titoli delle righe: «Banca», «Punta 2». */
function legTitle(mode: CoverMode, index: number, count: number): string {
  const base = mode === 'banca' ? 'Banca' : 'Punta'
  return count > 1 ? `${base} ${index + 1}` : base
}

/** Il nome di una gamba nelle colonne della tabella: «Copertura 1», «Condizione». */
function columnLabel(base: string, index: number, count: number): string {
  return count > 1 ? `${base} ${index + 1}` : base
}

function scenarioLabel(
  s: CondizionatoScenario,
  qualifierMode: CoverMode,
  qualifierLegs: number,
): string {
  let qualifier: string
  if (s.qualifier.wins) {
    qualifier =
      s.qualifier.leg == null
        ? 'Vince la qualificante'
        : `Vince la qualificante (esito ${s.qualifier.leg + 1})`
  } else if (qualifierMode === 'banca') {
    qualifier = 'Perde la qualificante'
  } else {
    qualifier =
      qualifierLegs > 1 && s.qualifier.leg != null
        ? `Vince la copertura ${s.qualifier.leg + 1}`
        : 'Vince la copertura'
  }
  const condition =
    (s.condition.happens ? 'condizione sì' : 'condizione no') +
    (s.condition.leg != null ? ` (esito ${s.condition.leg + 1})` : '')
  return `${qualifier}, ${condition}`
}

export function CondizionatoCalculator() {
  const [puntata, setPuntata] = useState('')
  const [quota, setQuota] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [qualifier, setQualifier] = useState<SectionState>(INITIAL_SECTION)
  const [condition, setCondition] = useState<SectionState>(INITIAL_SECTION)
  const [saveOpen, setSaveOpen] = useState(false)

  const stake = parseNum(puntata)
  const odds = parseNum(quota)
  const refund = parseNum(rimborso)
  const result = useMemo(
    () =>
      computeCondizionato({
        stake,
        odds,
        refund,
        qualifier: toInput(qualifier),
        condition: toInput(condition),
      }),
    [stake, odds, refund, qualifier, condition],
  )

  const legLabels = [
    'Qualificante',
    ...qualifier.legs.map((_, i) => columnLabel('Copertura', i, qualifier.legs.length)),
    ...condition.legs.map((_, i) => columnLabel('Condizione', i, condition.legs.length)),
  ]

  const rows: OutcomeProfitRow[] = result
    ? result.scenarios.map((s) => ({
        id: s.id,
        esito: scenarioLabel(s, qualifier.mode, qualifier.legs.length),
        legs: [s.qualifierProfit, ...s.qualifierCovers, ...s.conditionCovers],
        rimborso: s.refund,
        totale: s.total,
      }))
    : []

  return (
    <div className="flex flex-col gap-8">
      <CalculatorRating label="CR" value={result ? result.crPercent : null} plain />
      <CalculatorSaveAction onClick={() => setSaveOpen(true)} disabled={!result} />
      {saveOpen && result && stake != null && odds != null && refund != null && (
        <CondizionatoSaveModal
          open
          onOpenChange={setSaveOpen}
          stake={stake}
          odds={odds}
          refund={refund}
          result={result}
        />
      )}

      <CalcLayout
        outcomes={
          <>
            <CalcGroup title="Qualificante">
              <OutcomeRow
                title="Punta"
                odds={
                  <CalcNumberField
                    id="cond-quota"
                    ariaLabel="Quota della qualificante"
                    size="sm"
                    value={quota}
                    onChange={setQuota}
                  />
                }
                figure={
                  <CalcFigure
                    label="Puntata"
                    live
                    value={amount(stake != null && stake > 0 ? stake : null)}
                  />
                }
              />
            </CalcGroup>

            <CoverSection
              id="cond-q"
              title="Copertura della qualificante"
              who="qualificante"
              hint={
                qualifier.mode === 'banca'
                  ? 'Banca lo stesso esito della qualificante su un exchange.'
                  : 'Punta su un altro book l’esito opposto alla qualificante.'
              }
              secondHint={
                qualifier.mode === 'banca'
                  ? 'Seconda bancata: quando la qualificante vince con due esiti (per esempio una doppia chance) e li banchi uno per uno.'
                  : 'Seconda punta: quando gli esiti opposti sono due (per esempio pareggio e vittoria dell’altra squadra).'
              }
              section={qualifier}
              results={result?.qualifierCovers ?? null}
              onChange={setQualifier}
            />

            <CoverSection
              id="cond-c"
              title="Copertura della condizione"
              who="condizione"
              hint={
                condition.mode === 'banca'
                  ? 'Banca l’esito della condizione: se la condizione non si verifica, la bancata vince.'
                  : 'Punta l’esito che esclude la condizione: se la condizione non si verifica, la punta vince.'
              }
              secondHint={
                condition.mode === 'banca'
                  ? 'Seconda bancata: quando la condizione si verifica con due esiti diversi e li banchi uno per uno.'
                  : 'Seconda punta: quando servono due esiti per escludere la condizione.'
              }
              section={condition}
              results={result?.conditionCovers ?? null}
              onChange={setCondition}
            />
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="cond-puntata"
              label="Puntata qualificante"
              size="lg"
              suffix="€"
              value={puntata}
              onChange={setPuntata}
            />
            <CalcNumberField
              id="cond-rimborso"
              label="Rimborso"
              suffix="€"
              value={rimborso}
              onChange={setRimborso}
              hint="Il bonus che il book accredita se la qualificante perde e la condizione si verifica."
            />
            <div className="flex flex-col gap-2 border-t border-ds-line pt-4">
              <p className="ds-body-sm m-0 text-ds-ink-muted">
                Gioca la qualificante su un esito che esclude la condizione: se vince, la condizione
                non può verificarsi. Ad esempio, se il rimborso scatta con i tempi supplementari,
                punta la vittoria di una squadra e copri il pareggio.
              </p>
              <p className="ds-body-sm m-0 text-ds-ink-muted">
                La copertura della qualificante pareggia la vincita; quella della condizione vale
                quanto il rimborso, così guadagni lo stesso in ogni scenario.
              </p>
            </div>
          </>
        }
      />

      <CalcProfits outlay={result?.outlay ?? null} minGain={result?.minProfit ?? null}>
        <CalcOutcomeTable
          legLabels={legLabels}
          rows={rows}
          stake={stake ?? 0}
          emptyText="Il risultato compare quando puntata, rimborso e tutte le quote sono compilati e validi."
        />
      </CalcProfits>
    </div>
  )
}

function CalcGroup({
  title,
  action,
  hint,
  children,
}: {
  title: string
  action?: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="ds-label m-0 text-ds-ink-muted uppercase">{title}</h3>
        {action}
      </div>
      {hint && <p className="ds-body-sm m-0 -mt-1 text-ds-ink-muted">{hint}</p>}
      {children}
    </section>
  )
}

/** Banca o Punta per una sezione: due Button del design, quello scelto in primary. */
function ModeToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: CoverMode
  onChange: (mode: CoverMode) => void
}) {
  const options: { value: CoverMode; label: string }[] = [
    { value: 'banca', label: 'Banca' },
    { value: 'punta', label: 'Punta' },
  ]
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={dsButtonClass(o.value === value ? 'primary' : 'secondary', 'sm')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function CoverSection({
  id,
  title,
  who,
  hint,
  secondHint,
  section,
  results,
  onChange,
}: {
  id: string
  title: string
  /** «qualificante» o «condizione», per le etichette dei lettori di schermo. */
  who: string
  hint: string
  secondHint: string
  section: SectionState
  results: CoverLegResult[] | null
  onChange: (section: SectionState) => void
}) {
  const count = section.legs.length
  const setMode = (mode: CoverMode) => {
    if (mode === section.mode) return
    // Cambiando tipo le quote non valgono più (bancata dello stesso esito ↔ punta dell'opposto).
    onChange({ mode, legs: section.legs.map((leg) => ({ ...leg, odds: '' })) })
  }
  const setLeg = (index: number, patch: Partial<LegState>) =>
    onChange({
      ...section,
      legs: section.legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)),
    })
  const addLeg = () =>
    onChange({ ...section, legs: [...section.legs, newLeg(section.legs[0].commission)] })
  const removeLeg = () => onChange({ ...section, legs: section.legs.slice(0, 1) })

  return (
    <CalcGroup
      title={title}
      hint={hint}
      action={
        <ModeToggle
          label={`Tipo di copertura della ${who}`}
          value={section.mode}
          onChange={setMode}
        />
      }
    >
      {section.legs.map((leg, i) => {
        const r = results?.[i] ?? null
        const name = legTitle(section.mode, i, count)
        if (section.mode === 'banca') {
          return (
            <OutcomeRow
              key={i}
              tone="loss"
              title={name}
              odds={
                <CalcNumberField
                  id={`${id}-odds-${i}`}
                  ariaLabel={`Quota ${name.toLowerCase()} della ${who}`}
                  size="sm"
                  value={leg.odds}
                  onChange={(v) => setLeg(i, { odds: v })}
                />
              }
              figure={<CalcFigure label="Bancata" live value={amount(r?.stake)} />}
              aside={
                <div className="flex w-full items-center justify-between gap-3 sm:h-11">
                  <span className="ds-body-sm text-ds-ink-muted">Responsabilità</span>
                  <span className="ds-num whitespace-nowrap text-ds-ink">
                    {amount(r?.liability)}
                  </span>
                </div>
              }
            >
              <div className="col-span-full flex items-center justify-between gap-3 border-t border-ds-line pt-3">
                <label htmlFor={`${id}-comm-${i}`} className="ds-body-sm text-ds-ink-muted">
                  Commissione exchange
                </label>
                <CalcNumberField
                  id={`${id}-comm-${i}`}
                  size="sm"
                  suffix="%"
                  className="w-28"
                  value={leg.commission}
                  onChange={(v) => setLeg(i, { commission: v })}
                />
              </div>
            </OutcomeRow>
          )
        }
        return (
          <OutcomeRow
            key={i}
            title={name}
            odds={
              <CalcNumberField
                id={`${id}-odds-${i}`}
                ariaLabel={`Quota ${name.toLowerCase()} della ${who}`}
                size="sm"
                value={leg.odds}
                onChange={(v) => setLeg(i, { odds: v })}
              />
            }
            figure={<CalcFigure label="Contropuntata" live value={amount(r?.stake)} />}
          />
        )
      })}
      <div className="flex flex-col items-start gap-1">
        {count === 1 ? (
          <>
            <button type="button" onClick={addLeg} className={dsButtonClass('ghost', 'sm')}>
              <Plus className="h-4 w-4" aria-hidden />
              Aggiungi una seconda copertura
            </button>
            <p className="ds-body-sm m-0 text-ds-ink-muted">{secondHint}</p>
          </>
        ) : (
          <button
            type="button"
            onClick={removeLeg}
            className={dsButtonClass('ghost', 'sm')}
            aria-label={`Togli la seconda copertura della ${who}`}
          >
            <Minus className="h-4 w-4" aria-hidden />
            Togli la seconda copertura
          </button>
        )}
      </div>
    </CalcGroup>
  )
}
