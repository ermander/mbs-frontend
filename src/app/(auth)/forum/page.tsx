import { MessageSquare } from 'lucide-react'

import { DsComingSoonPage } from '@/components/landing/ds-coming-soon-page'

export default function ForumPage() {
  return (
    <DsComingSoonPage
      title="Forum"
      icon={MessageSquare}
      description="Questa sezione è in preparazione: la trovi qui appena è pronta."
    />
  )
}
