import { MessageSquare } from 'lucide-react'

import { SectionGuard } from '@/components/auth/section-guard'
import { DsComingSoonPage } from '@/components/landing/ds-coming-soon-page'

export default function ForumPage() {
  // §14.366: una sezione che l'admin accende o spegne per utente.
  return (
    <SectionGuard section="forum">
      <DsComingSoonPage
        title="Forum"
        icon={MessageSquare}
        description="Questa sezione è in preparazione: la trovi qui appena è pronta."
      />
    </SectionGuard>
  )
}
