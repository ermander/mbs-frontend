import { SectionGuard } from '@/components/auth/section-guard'

/**
 * §14.366: l'Oddsmatcher è una sezione. Chi è entrato senza la sezione vede «Sezione non
 * abilitata»; gli ospiti la versione gratuita (§14.339).
 */
export default function OddsScannerLayout({ children }: { children: React.ReactNode }) {
  return <SectionGuard section="oddsmatcher">{children}</SectionGuard>
}
