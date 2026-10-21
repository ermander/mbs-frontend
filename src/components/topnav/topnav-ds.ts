import { cn } from '@/lib/utils'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'

/**
 * Tema chiaro del design system (ds-*, §14.275) per la barra e per ciò che apre in un portale
 * (tendine, cassetto mobile): font Source, token ds-* e il ponte che rimappa i pezzi shadcn.
 */
export const topnavDsScope = cn(
  dsSerif.variable,
  dsSans.variable,
  'ds-scope ds-calc-bridge font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light]',
)

/** Pannello delle tendine della barra: surface-raised, hairline, raggio md, ombra md. */
export const topnavMenuPanel = cn(
  topnavDsScope,
  'rounded-ds-md border-ds-line bg-ds-surface-raised p-1 shadow-ds-md',
)

/** Voce di una tendina: 14px, fondo brand-soft al passaggio e su quella attiva. */
export const topnavMenuItem =
  'flex cursor-pointer items-center gap-2 rounded-ds-sm px-2.5 py-2 text-sm text-ds-ink focus:bg-ds-brand-soft focus:text-ds-ink'
