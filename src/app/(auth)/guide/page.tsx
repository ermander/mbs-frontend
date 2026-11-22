import { BookOpen } from 'lucide-react'

import { SectionGuard } from '@/components/auth/section-guard'
import { DsComingSoonPage } from '@/components/landing/ds-coming-soon-page'

export default function GuidePage() {
  // §14.366: una sezione che l'admin accende o spegne per utente.
  return (
    <SectionGuard section="guide">
      <DsComingSoonPage
        title="Guide"
        icon={BookOpen}
        description="Questa sezione è in preparazione: la trovi qui appena è pronta."
      />
    </SectionGuard>
  )
}
