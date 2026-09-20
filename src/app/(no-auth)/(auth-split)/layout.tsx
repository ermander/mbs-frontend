import { AuthShell } from '@/components/auth/auth-primitives'

/**
 * Login e registrazione: da lg la pagina si divide in due. Il pannello di sinistra per ora
 * resta vuoto (superficie con hairline); il contenuto si passa ad AuthShell con `aside`.
 */
export default function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell split>{children}</AuthShell>
}
