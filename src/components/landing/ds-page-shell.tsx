import { cn } from '@/lib/utils'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'

/**
 * Guscio ds-* di una pagina dell'area autenticata: gli stessi token, font Source e ponte ow-* di
 * SiteShell, ma senza barra né piè di pagina, perché la Topnav col menu utente sta nel layout di
 * (auth). Annulla il padding del <main> del layout (-mx-4 -my-6, md:-mx-8) e riempie l'altezza
 * sotto la barra, come fanno le pagine dei calcolatori e dell'oddsmatcher. Nato per /offerte e
 * /offerte/[id] quando sono passate nell'area autenticata (§14.324).
 */
export function DsPageShell({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light] md:-mx-8',
        className,
      )}
    >
      {children}
    </div>
  )
}
