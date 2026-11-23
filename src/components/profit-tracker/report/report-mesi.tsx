'use client'

import { CalendarRange } from 'lucide-react'

import {
  DS_CARD,
  DS_PANEL,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAmount,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { dsFocusRing } from '@/components/landing/ds-primitives'
import { MONTH_FULL, dashMoney } from '@/lib/profit-tracker/dashboard'
import type { MonthTableRow } from '@/lib/profit-tracker/report'
import { cn } from '@/lib/utils'

/**
 * La tabella «Mese per mese» del Report: per ogni mese giocate, profitto delle giocate, costi,
 * entrate, spese, netto e netto cumulato da gennaio, con il totale dell'anno. Un clic su un mese lo
 * apre in tutta la pagina (lo stesso mese scelto dal filtro o dalle barre); un secondo clic torna
 * all'anno. Con un conto scelto restano solo le colonne delle giocate.
 */
export function ReportMonthTable({
  year,
  rows,
  selectedMonth,
  onSelect,
  betsOnly,
  isLoading,
}: {
  year: number
  rows: MonthTableRow[]
  selectedMonth: number | null
  onSelect: (month: number) => void
  betsOnly: boolean
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Caricamento dei mesi"
        className="h-64 animate-pulse rounded-ds-md bg-ds-surface-sunken"
      />
    )
  }

  if (!rows.some((r) => r.hasData)) {
    return (
      <div className={cn(DS_PANEL, 'flex flex-col items-center gap-2 px-6 py-10 text-center')}>
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-ds-surface-sunken text-ds-ink-muted">
          <CalendarRange className="h-8 w-8" strokeWidth={1.75} aria-hidden />
        </span>
        <h3 className="ds-heading m-0">Nessuna voce nel {year}</h3>
        <p className="ds-body m-0 max-w-[440px] text-ds-ink-muted">
          Quando archivi una giocata o registri una ricarica o una spesa, il suo mese compare qui.
        </p>
      </div>
    )
  }

  const total = rows.reduce(
    (acc, r) => ({
      giocate: acc.giocate + r.giocate,
      profittoGiocate: acc.profittoGiocate + r.profittoGiocate,
      costiAttivita: acc.costiAttivita + r.costiAttivita,
      altreEntrate: acc.altreEntrate + r.altreEntrate,
      spesePersonali: acc.spesePersonali + r.spesePersonali,
      netto: acc.netto + r.netto,
    }),
    {
      giocate: 0,
      profittoGiocate: 0,
      costiAttivita: 0,
      altreEntrate: 0,
      spesePersonali: 0,
      netto: 0,
    },
  )

  const monthAction = (r: MonthTableRow) =>
    selectedMonth === r.month
      ? `Chiudi ${MONTH_FULL[r.month]} ${year} e torna all'anno`
      : `Apri ${MONTH_FULL[r.month]} ${year}`

  return (
    <div className="flex flex-col gap-3">
      <div className={DS_TABLE_WRAP}>
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Il conto economico di ogni mese del {year}, con il netto cumulato da gennaio
          </caption>
          <thead>
            <tr className={DS_THEAD_ROW}>
              <th scope="col" className="py-3 pr-2.5 pl-4">
                Mese
              </th>
              <th scope="col" className="px-2.5 py-3 text-right">
                Giocate
              </th>
              <th scope="col" className="px-2.5 py-3 text-right">
                Profitto giocate
              </th>
              {!betsOnly && (
                <>
                  <th scope="col" className="px-2.5 py-3 text-right">
                    Costi attività
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-right">
                    Altre entrate
                  </th>
                  <th scope="col" className="px-2.5 py-3 text-right">
                    Spese personali
                  </th>
                </>
              )}
              <th scope="col" className="px-2.5 py-3 text-right">
                Netto
              </th>
              <th scope="col" className="py-3 pr-4 pl-2.5 text-right">
                Cumulato
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selected = selectedMonth === r.month
              return (
                <tr
                  key={r.month}
                  onClick={() => onSelect(r.month)}
                  className={cn(
                    DS_ROW,
                    'cursor-pointer align-middle',
                    selected ? 'bg-ds-brand-soft' : 'hover:bg-ds-surface-sunken/60',
                  )}
                >
                  <th scope="row" className="py-2.5 pr-2.5 pl-4 text-left font-normal">
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={monthAction(r)}
                      title={monthAction(r)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(r.month)
                      }}
                      className={cn(
                        'ds-body cursor-pointer rounded-ds-xs font-semibold',
                        selected
                          ? 'text-ds-brand'
                          : r.hasData
                            ? 'text-ds-ink'
                            : 'text-ds-ink-muted',
                        dsFocusRing,
                      )}
                    >
                      {MONTH_FULL[r.month]}
                    </button>
                  </th>
                  <td className="ds-num-sm px-2.5 py-2.5 text-right text-ds-ink-muted">
                    {r.giocate > 0 ? r.giocate.toLocaleString('it-IT') : '—'}
                  </td>
                  <AmountCell value={r.profittoGiocate} />
                  {!betsOnly && (
                    <>
                      <AmountCell value={-r.costiAttivita} />
                      <AmountCell value={r.altreEntrate} />
                      <AmountCell value={-r.spesePersonali} />
                    </>
                  )}
                  <AmountCell value={r.netto} strong />
                  <td className="py-2.5 pr-4 pl-2.5 text-right">
                    <DsAmount value={r.cumulato} size="sm" className="font-medium" />
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ds-line-strong align-middle">
              <th scope="row" className="ds-body py-3 pr-2.5 pl-4 text-left font-semibold">
                Totale {year}
              </th>
              <td className="ds-num-sm px-2.5 py-3 text-right font-semibold">
                {total.giocate.toLocaleString('it-IT')}
              </td>
              <AmountCell value={total.profittoGiocate} strong />
              {!betsOnly && (
                <>
                  <AmountCell value={-total.costiAttivita} strong />
                  <AmountCell value={total.altreEntrate} strong />
                  <AmountCell value={-total.spesePersonali} strong />
                </>
              )}
              <AmountCell value={total.netto} strong />
              <td className="py-3 pr-4 pl-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
        {rows.map((r) => {
          const selected = selectedMonth === r.month
          const parts = [countLabel(r.giocate, 'giocata', 'giocate')]
          if (!betsOnly) {
            if (r.costiAttivita !== 0) parts.push(`costi ${dashMoney(-r.costiAttivita)}`)
            if (r.altreEntrate !== 0) parts.push(`entrate ${dashMoney(r.altreEntrate)}`)
            if (r.spesePersonali !== 0) parts.push(`spese ${dashMoney(-r.spesePersonali)}`)
          }
          return (
            <li key={r.month}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`${monthAction(r)}: netto ${dashMoney(r.netto)}`}
                onClick={() => onSelect(r.month)}
                className={cn(
                  DS_CARD,
                  'w-full cursor-pointer gap-1 py-3 text-left',
                  selected ? 'border-ds-brand bg-ds-brand-soft' : 'hover:bg-ds-surface-sunken/60',
                  dsFocusRing,
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      'font-semibold',
                      selected ? 'text-ds-brand' : r.hasData ? 'text-ds-ink' : 'text-ds-ink-muted',
                    )}
                  >
                    {MONTH_FULL[r.month]}
                  </span>
                  {r.hasData ? (
                    <DsAmount value={r.netto} size="sm" />
                  ) : (
                    <span className="ds-caption text-ds-ink-muted">Nessuna voce</span>
                  )}
                </span>
                {r.hasData && (
                  <span className="ds-caption flex flex-wrap justify-between gap-x-3 text-ds-ink-muted">
                    <span>{parts.join(' · ')}</span>
                    <span className="tabular-nums">cumulato {dashMoney(r.cumulato)}</span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
        <li className="flex items-baseline justify-between gap-3 px-4 pt-1">
          <span className="ds-body font-semibold">Totale {year}</span>
          <DsAmount value={total.netto} size="sm" />
        </li>
      </ul>
    </div>
  )
}

/** Un importo della tabella: con segno e colore, «—» quando è zero. */
function AmountCell({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <td className="px-2.5 py-2.5 text-right">
      {value === 0 ? (
        <span className="ds-num-sm text-ds-ink-faint">—</span>
      ) : (
        <DsAmount value={value} size="sm" className={strong ? undefined : 'font-medium'} />
      )}
    </td>
  )
}
