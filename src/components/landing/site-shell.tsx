import { cn } from '@/lib/utils'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'

/**
 * Guscio delle pagine pubbliche (landing, legali, contatti, 404): nav, contenuto, footer sui token
 * del design system (ds-*, §14.248), con i font Source caricati qui e non sull'<html>. La classe
 * ds-scope rimappa i token ow-* dei componenti vecchi che finiscono qui dentro (il modulo dei
 * contatti) sulla stessa palette.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope flex min-h-screen flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light]',
      )}
    >
      <LandingNav />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
