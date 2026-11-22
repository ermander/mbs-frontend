import { SectionGuard } from '@/components/auth/section-guard'

/**
 * §14.366: i Calcolatori sono una sezione. Chi è entrato senza la sezione vede «Sezione non
 * abilitata»; gli ospiti i calcolatori gratuiti (§14.340).
 */
export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  return <SectionGuard section="calculators">{children}</SectionGuard>
}
