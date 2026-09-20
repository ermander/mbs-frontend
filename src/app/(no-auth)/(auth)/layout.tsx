import { AuthShell } from '@/components/auth/auth-primitives'

/** Recupero e reimposta password, verifica email: colonna singola al centro. */
export default function AuthShellLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
