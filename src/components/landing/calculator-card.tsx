import { CALCULATOR_EXAMPLE as EX } from '@/lib/landing-content'
import { cn } from '@/lib/utils'

const muted = 'text-ow-raised-muted'
const num = 'font-ow-mono tabular-nums'
/** Etichetta di ruolo (punta/banca): maiuscoletto grigio, senza colore. */
const role = 'text-[11px] font-medium uppercase tracking-[0.02em] text-ow-raised-muted'

function Badge() {
  return (
    <span className="inline-flex items-center rounded bg-white/[0.05] px-1.5 py-0.5 text-xs text-ow-raised-muted">
      {EX.chip}
    </span>
  )
}

function DecidedBefore({ className }: { className?: string }) {
  return (
    <span className={cn('text-right leading-[1.4]', muted, className)}>
      {EX.decidedBefore[0]}
      <br />
      {EX.decidedBefore[1]}
    </span>
  )
}

/**
 * La card del calcolatore nel hero, l'elemento firma della landing: l'unico punto in cui
 * compaiono siti di scommesse con il loro nome. Superficie in rilievo con anello hairline,
 * niente ombra; il profitto garantito è l'unica cifra in accento. Sotto md rende la versione
 * compatta (angoli arrotondati solo in alto, appoggiata al fondo del hero).
 */
export function CalculatorCard() {
  return (
    <>
      {/* Versione compatta (telefono) */}
      <div className="flex w-full flex-col gap-3 rounded-t-[12px] bg-ow-raised px-5 pb-6 pt-5 text-ow-on-raised shadow-ow-card md:hidden">
        <div className="flex items-center justify-between">
          <Badge />
          <span className={cn('text-xs', muted)}>{EX.event}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[EX.back, EX.lay].map((leg) => (
            <div
              key={leg.role}
              className="flex min-w-0 flex-col gap-0.5 rounded-ow-btn bg-ow-raised-fill px-3 py-2.5"
            >
              <span className={role}>
                {leg.role} · {leg.site}
              </span>
              <span className={cn(num, 'whitespace-nowrap text-sm')}>
                {leg.odds} · {leg.stake}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between border-t border-ow-raised-line pt-3">
          <div className="flex flex-col gap-0.5">
            <span className={cn('text-xs', muted)}>{EX.totalLabelMobile}</span>
            <span className={cn(num, 'text-[28px] font-medium leading-none text-ow-accent')}>
              {EX.total}
            </span>
          </div>
          <DecidedBefore className="text-xs" />
        </div>
      </div>

      {/* Versione completa (da md in su) */}
      <div className="hidden w-full max-w-[480px] flex-col gap-4 rounded-ow-card-lg bg-ow-raised p-6 text-ow-on-raised shadow-ow-card md:flex lg:w-[440px] lg:shrink-0 xl:w-[460px]">
        <div className="flex items-center justify-between">
          <Badge />
          <span className={cn('text-[13px]', muted)}>{EX.guide}</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-medium tracking-[-0.012em]">{EX.event}</p>
          <p className={cn('text-[13px]', muted)}>{EX.eventMeta}</p>
        </div>
        <div className="flex flex-col gap-2">
          {[EX.back, EX.lay].map((leg) => (
            <div
              key={leg.role}
              className="grid grid-cols-4 items-center gap-2 rounded-ow-btn bg-ow-raised-fill px-3 py-2.5"
            >
              <span className={role}>{leg.role}</span>
              <span className="text-sm font-medium">{leg.site}</span>
              <span className={cn(num, 'text-right text-sm')}>{leg.odds}</span>
              <span className={cn(num, 'text-right text-sm')}>{leg.stake}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EX.outcomes.map((o) => (
            <div
              key={o.label}
              className="flex flex-col gap-0.5 rounded-ow-btn border border-ow-raised-line px-3 py-2.5"
            >
              <span className={cn('text-xs', muted)}>{o.label}</span>
              <span className={cn(num, 'text-base')}>{o.profit}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between border-t border-ow-raised-line pt-4">
          <div className="flex flex-col gap-1">
            <span className={cn('text-[13px]', muted)}>{EX.totalLabel}</span>
            <span className={cn(num, 'text-[32px] font-medium leading-none text-ow-accent')}>
              {EX.total}
            </span>
          </div>
          <DecidedBefore className="text-[13px]" />
        </div>
      </div>
    </>
  )
}
