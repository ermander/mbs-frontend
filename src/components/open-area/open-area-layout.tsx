import * as React from 'react'

import { DashboardAuthGuard } from '@/app/(auth)/dashboard/dashboard-auth-guard'
import { Topnav } from '@/components/topnav/topnav'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'
import { cn } from '@/lib/utils'

/**
 * Layout delle pagine dell'app aperte anche a chi non è entrato (gruppo di rotte `(open)`,
 * §14.339-14.340: oddsmatcher e calcolatori, dove dalla landing si arriva senza account). Chi è
 * entrato vede la pagina come nel layout di (auth), con DashboardAuthGuard e Topnav; chi non è
 * entrato (o ha la sessione scaduta) la vede nel guscio della landing invece di finire sul login.
 * Cosa può usare un ospite lo decide ogni pagina. Il piè di pagina c'è in tutti e due i casi: per
 * chi è entrato nella versione dell'app, come nel layout di (auth) (§14.348).
 */
export function OpenAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard publicFallback={<PublicShell>{children}</PublicShell>}>
      <div className="flex min-h-screen flex-col bg-background">
        <Topnav />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        <LandingFooter inApp />
      </div>
    </DashboardAuthGuard>
  )
}

/**
 * Il guscio di chi non è entrato: barra e piè di pagina della landing (Accedi, Inizia gratis) sui
 * token ds-* come SiteShell, ma con il <main> che ha lo stesso padding di quello di (auth): le
 * pagine dell'app lo annullano con -mx-4 -my-6 (DsPageShell, calcolatori, oddsmatcher) e così si
 * rendono uguali nei due gusci. La barra della landing è alta 64px come `--topnav-h`.
 */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope flex min-h-screen flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light',
      )}
    >
      <LandingNav />
      <main className="flex flex-1 flex-col px-4 py-6 md:px-8">{children}</main>
      <LandingFooter />
    </div>
  )
}
