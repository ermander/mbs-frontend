import { formatOdds } from '@/lib/landing-format'
import { LANDING_ROUTES, ODDSMATCHER } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { DsMoney, DsRatingBadge } from '@/components/landing/ds-data'
import { DsButton, DsCard, DsContainer } from '@/components/landing/ds-primitives'

const th =
  'bg-ds-surface-sunken px-3 py-3 text-left text-[13px] font-semibold uppercase leading-4 tracking-[0.04em] text-ds-ink-muted first:pl-4 last:pr-4'
const td = 'border-t border-ds-line px-3 py-3 align-middle first:pl-4 last:pr-4'
const num = 'text-right tabular-nums'

/**
 * «L'oddsmatcher, adesso»: la OddsTable del design in una card senza padding, con le cinque coppie
 * d'esempio e un «Calcola» per riga che porta ai calcolatori. Sul telefono la tabella scorre in
 * orizzontale dentro la card.
 */
export function OddsmatcherSection() {
  const { columns } = ODDSMATCHER
  return (
    <section id="oddsmatcher" className="pt-16">
      <DsContainer>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="ds-title">{ODDSMATCHER.title}</h2>
          <DsButton href={LANDING_ROUTES.oddsmatcher} variant="ghost" iconEnd="arrow-right">
            {ODDSMATCHER.cta}
          </DsButton>
        </div>
        <DsCard flush className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse">
            <caption className="sr-only">{ODDSMATCHER.caption}</caption>
            <thead>
              <tr>
                <th scope="col" className={cn(th, 'min-w-[180px]')}>
                  {columns.event}
                </th>
                <th scope="col" className={th}>
                  {columns.market}
                </th>
                <th scope="col" className={th}>
                  {columns.site}
                </th>
                <th scope="col" className={cn(th, num)}>
                  {columns.back}
                </th>
                <th scope="col" className={th}>
                  {columns.exchange}
                </th>
                <th scope="col" className={cn(th, num)}>
                  {columns.lay}
                </th>
                <th scope="col" className={cn(th, num)}>
                  {columns.liquidity}
                </th>
                <th scope="col" className={cn(th, num)}>
                  {columns.rating}
                </th>
                <th scope="col" className={th}>
                  <span className="sr-only">{ODDSMATCHER.calculate}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ODDSMATCHER.rows.map((row) => (
                <tr key={row.id}>
                  <td className={td}>
                    <span className="font-semibold text-ds-ink">{row.event}</span>
                    <span className="ds-caption mt-0.5 block text-ds-ink-muted">{row.meta}</span>
                  </td>
                  <td className={cn(td, 'text-ds-ink-muted')}>{row.market}</td>
                  <td className={td}>{row.site}</td>
                  <td className={cn(td, num, 'whitespace-nowrap font-semibold')}>
                    {formatOdds(row.back)}
                  </td>
                  <td className={td}>{row.exchange}</td>
                  <td className={cn(td, num, 'whitespace-nowrap font-semibold')}>
                    {formatOdds(row.lay)}
                  </td>
                  <td className={cn(td, num)}>
                    <DsMoney value={row.liquidity} neutral />
                  </td>
                  <td className={cn(td, num)}>
                    <DsRatingBadge value={row.rating} />
                  </td>
                  <td className={cn(td, num)}>
                    <DsButton href={LANDING_ROUTES.calcolatori} size="sm">
                      {ODDSMATCHER.calculate}
                    </DsButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>
      </DsContainer>
    </section>
  )
}
