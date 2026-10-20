import { OFFERS_LOGIN_REQUIRED } from '@/lib/offers-content'
import { DashboardAuthGuard } from '@/app/(auth)/dashboard/dashboard-auth-guard'

/** Elenco e dettaglio delle offerte: pubblici, o dietro la guard se OFFERS_LOGIN_REQUIRED. */
export function OffersAccess({ children }: { children: React.ReactNode }) {
  return OFFERS_LOGIN_REQUIRED ? <DashboardAuthGuard>{children}</DashboardAuthGuard> : children
}
