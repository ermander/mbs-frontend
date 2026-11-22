import { DashboardAuthGuard } from '@/app/(auth)/dashboard/dashboard-auth-guard'
import { SignedInSwitch } from '@/components/auth/signed-in-switch'
import { Topnav } from '@/components/topnav/topnav'
import { cn } from '@/lib/utils'
import { PAGE_COLUMN_NARROW } from '@/lib/page-column'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'

/**
 * Guscio delle pagine pubbliche (landing, legali, contatti, 404): nav, contenuto, footer sui token
 * del design system (ds-*, §14.248), con i font Source caricati qui e non sull'<html>. La classe
 * ds-scope rimappa i token ow-* dei componenti vecchi che finiscono qui dentro (il modulo dei
 * contatti) sulla stessa palette.
 *
 * Barra e piè di pagina seguono la sessione (ClickUp «Controllo Navbar»): ai link legali e ai
 * contatti si arriva anche dal piè di pagina dell'app, e chi è entrato trovava «Accedi / Inizia
 * gratis». Ora chi è entrato vede la Topnav e il piè di pagina dell'app, come nel layout di
 * (auth); chi non lo è la barra e il piè di pagina della landing. Il contenuto resta reso dal
 * server per tutti (niente guard intorno alla pagina, come invece in (open)): finché la sessione
 * non è nota la barra è quella della landing senza Accedi e Inizia gratis, e una sessione
 * scaduta resta sulla pagina con la barra della landing (publicFallback), senza finire sul login.
 *
 * Con `narrow` (solo la landing) barra, sezioni e piè di pagina stanno nella colonna da 1200px del
 * mockup invece che in quella da 1600px dell'app (§14.357).
 */
export function SiteShell({
  narrow = false,
  children,
}: {
  narrow?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope flex min-h-screen flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light',
        narrow && PAGE_COLUMN_NARROW,
      )}
    >
      <DashboardAuthGuard
        publicFallback={<LandingNav />}
        pendingFallback={<LandingNav accountActions={false} />}
      >
        <Topnav />
      </DashboardAuthGuard>
      <main className="flex-1">{children}</main>
      <SignedInSwitch signedIn={<LandingFooter inApp />} fallback={<LandingFooter />} />
    </div>
  )
}
