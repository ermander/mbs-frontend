import { ReactNode } from 'react'
import { BackofficeAuthGuard } from '@/components/auth/backoffice-auth-guard'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/**
 * Il Backoffice sul design OddWise (§14.365): tutte le pagine nel guscio chiaro delle altre pagine
 * dell'app (fondo surface, colonna PAGE_COLUMN, font Source), invece del fondo scuro della grafica
 * vecchia fra la barra e il piè di pagina chiari. Il guscio porta anche il ponte dei colori shadcn
 * (ds-calc-bridge), così un componente vecchio rimasto dentro prende comunque la palette chiara.
 */
export default function BackofficeAuthLayout({ children }: { children: ReactNode }) {
  return (
    <BackofficeAuthGuard>
      <GiocateDsShell>{children}</GiocateDsShell>
    </BackofficeAuthGuard>
  )
}
