import * as React from 'react'

import { DashboardAuthGuard } from './dashboard/dashboard-auth-guard'
import { Topnav } from '@/components/topnav/topnav'
import { LandingFooter } from '@/components/landing/landing-footer'

/**
 * Layout dell'area autenticata: barra in alto, pagina, piè di pagina della landing in fondo
 * (§14.348: privacy, termini, cookie e l'avvertenza sul gioco si raggiungono da ogni pagina, non
 * solo da quelle pubbliche). Il piè di pagina sta dopo il <main>: le pagine che riempiono
 * l'altezza sotto la barra (DsPageShell, oddsmatcher, calcolatori) lo lasciano appena sotto.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <div className="flex min-h-screen flex-col bg-background">
        <Topnav />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        <LandingFooter inApp />
      </div>
    </DashboardAuthGuard>
  )
}
