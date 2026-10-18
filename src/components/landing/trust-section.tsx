import { BookOpen, Calculator, ShieldCheck, type LucideIcon } from 'lucide-react'

import { TRUST, type TrustIcon } from '@/lib/landing-content'
import { DsContainer } from '@/components/landing/ds-primitives'

const ICONS: Record<TrustIcon, LucideIcon> = {
  'shield-check': ShieldCheck,
  calculator: Calculator,
  'book-open': BookOpen,
}

/** La fascia di fiducia prima del footer: tre argomenti con icona 24px, titolo e una riga di testo. */
export function TrustSection() {
  return (
    <section className="mt-16 border-t border-ds-line bg-ds-surface-raised py-12">
      <DsContainer className="grid gap-6 md:grid-cols-3">
        {TRUST.items.map((item) => {
          const Icon = ICONS[item.icon]
          return (
            <div key={item.title} className="flex items-start gap-3">
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
              <div>
                <h3 className="ds-subheading">{item.title}</h3>
                <p className="ds-body-sm mt-1 text-ds-ink-muted">{item.text}</p>
              </div>
            </div>
          )
        })}
      </DsContainer>
    </section>
  )
}
