import * as React from 'react'

import { PAGE_COLUMN } from '@/lib/page-column'
import { cn } from '@/lib/utils'

/**
 * Colonna delle pagine dell'area autenticata ancora sul design vecchio (backoffice, alcune pagine
 * del tracker, Risultato + Goal, Rimborso 0-0). Dal §14.357 è la stessa colonna della barra in
 * alto e delle pagine sul design OddWise (PAGE_COLUMN): il guscio esterno annulla il padding del
 * <main> del layout (-mx-4, md:-mx-8, come DsPageShell) e i bordi del contenuto cadono dove cadono
 * quelli della barra. `className` va alla colonna, quindi un max-w-* la restringe ancora.
 */
const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="-mx-4 md:-mx-8">
        <div ref={ref} className={cn(PAGE_COLUMN, className)} {...props} />
      </div>
    )
  },
)
Container.displayName = 'Container'

export { Container }
