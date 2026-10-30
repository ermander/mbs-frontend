import { OFFERS_LOGIN_REQUIRED } from '@/lib/offers-content'
import { DashboardAuthGuard } from '@/app/(auth)/dashboard/dashboard-auth-guard'

/**
 * Elenco e dettaglio delle offerte: dietro la guard dell'area autenticata (§14.315), che rimanda
 * al login chi non è entrato; pubblici solo se OFFERS_LOGIN_REQUIRED torna false.
 */
export function OffersAccess({ children }: { children: React.ReactNode }) {
  return OFFERS_LOGIN_REQUIRED ? <DashboardAuthGuard>{children}</DashboardAuthGuard> : children
}
