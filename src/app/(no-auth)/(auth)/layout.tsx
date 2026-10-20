import { AuthShell } from '@/components/auth/auth-primitives'

/** Verifica email e ritorno da Google: colonna singola al centro (recupero e reimposta password sono passati al design, §14.257). */
export default function AuthShellLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
