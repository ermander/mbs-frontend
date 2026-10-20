import type { Metadata } from 'next'

import { OFFERS_COPY, SAMPLE_OFFERS } from '@/lib/offers-content'
import { DashboardAuthGuard } from '@/app/(auth)/dashboard/dashboard-auth-guard'
import { DsContainer } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'
import { OffersList } from '@/components/offers/offers-list'

/**
 * Per ora l'elenco delle offerte è pubblico (§14.259). Per riservarlo a chi ha un account basta
 * metterlo a true: la guard dell'area autenticata rimanda al login chi non è entrato.
 */
const SOLO_UTENTI_REGISTRATI: boolean = false

export const metadata: Metadata = { title: OFFERS_COPY.title }

export default function OffertePage() {
  const page = (
    <SiteShell>
      <DsContainer className="flex flex-col gap-8 pb-16 pt-6">
        <h1 className="sr-only">{OFFERS_COPY.title}</h1>
        <OffersList offers={SAMPLE_OFFERS} />
        <p className="ds-caption pt-6 tracking-[0.02em] text-ds-ink-muted">
          {OFFERS_COPY.responsibleGaming}
        </p>
      </DsContainer>
    </SiteShell>
  )
  return SOLO_UTENTI_REGISTRATI ? <DashboardAuthGuard>{page}</DashboardAuthGuard> : page
}
