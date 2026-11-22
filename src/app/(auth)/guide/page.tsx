import { BookOpen } from 'lucide-react'

import { DsComingSoonPage } from '@/components/landing/ds-coming-soon-page'

export default function GuidePage() {
  return (
    <DsComingSoonPage
      title="Guide"
      icon={BookOpen}
      description="Questa sezione è in preparazione: la trovi qui appena è pronta."
    />
  )
}
