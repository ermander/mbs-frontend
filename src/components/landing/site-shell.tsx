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
 * Con `narrow` (solo la landing) sezioni e piè di pagina stanno nella colonna da 1200px del mockup
 * invece che in quella a tutta larghezza dell'app (§14.357). La barra no (§14.384, ClickUp
 * 1amgf8934re): è la stessa di tutte le altre pagine, a tutta larghezza con le voci a destra. Prima
 * stava anche lei nei 1200px e la barra dell'app di un admin non ci entrava: sopra i 1280px le voci
 * finivano sotto il nome (Backoffice sopra il nome utente) e non erano allineate con il resto
 * dell'app; per chi non è entrato il marchio e le voci si spostavano passando dalla landing alle
 * pagine legali.
 */
export function SiteShell({
  narrow = false,
  children,
}: {
  narrow?: boolean
  children: React.ReactNode
}) {
  // Solo su contenuto e piè di pagina: la barra resta nella colonna dell'app (vedi sopra). Non su
  // un involucro intorno alla barra, che toglierebbe alla Topnav il suo `sticky`. L'involucro di
  // contenuto e piè di pagina è `contents`: non fa box, e i due restano elementi della colonna flex
  // del guscio (il contenuto si allarga, il piè di pagina sta in fondo), ma ereditano `--page-max`.
  const column = narrow && PAGE_COLUMN_NARROW
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope flex min-h-screen flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light',
      )}
    >
      <DashboardAuthGuard
        publicFallback={<LandingNav />}
        pendingFallback={<LandingNav accountActions={false} />}
      >
        <Topnav />
      </DashboardAuthGuard>
      <div className={cn('contents', column)}>
        <main className="flex-1">{children}</main>
        <SignedInSwitch signedIn={<LandingFooter inApp />} fallback={<LandingFooter />} />
      </div>
    </div>
  )
}
