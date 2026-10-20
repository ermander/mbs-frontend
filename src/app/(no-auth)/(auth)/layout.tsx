import { AuthShell } from '@/components/auth/auth-primitives'

/**
 * Ritorno da Google: colonna singola al centro (recupero e reimposta password sono passati al
 * design nel §14.257, la verifica email nel §14.258).
 */
export default function AuthShellLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
