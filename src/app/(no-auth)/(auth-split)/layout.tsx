import { AuthShell } from '@/components/auth/auth-primitives'

/**
 * Registrazione: da lg la pagina si divide in due. Il pannello di sinistra per ora resta vuoto
 * (superficie con hairline); il contenuto si passa ad AuthShell con `aside`. Il login è nel
 * gruppo (login), sul guscio del design (DsAuthShell, §14.252).
 */
export default function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell split>{children}</AuthShell>
}
