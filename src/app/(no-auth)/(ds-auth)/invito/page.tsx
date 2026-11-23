import type { Metadata } from 'next'
import { DsBackToLogin, DsCenteredAuthShell } from '@/components/auth/ds-auth-shell'
import { DsResetPasswordForm } from '@/components/auth/ds-reset-password-form'

export const metadata: Metadata = {
  title: 'Il tuo invito',
  robots: { index: false, follow: false },
}

interface InvitoPageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * /invito?token=… (§14.383): il link della mail che parte quando un admin crea l'account di un
 * tester dal Backoffice. Il tester sceglie la sua password ed entra subito: lo stesso form e le
 * stesse chiamate di /reimposta-password (il link è un token di reimposta che vale 7 giorni),
 * con le parole dell'invito.
 */
export default async function InvitoPage({ searchParams }: InvitoPageProps) {
  const { token = '' } = await searchParams
  return (
    <DsCenteredAuthShell headerAside={<DsBackToLogin prompt="Hai già scelto la password?" />}>
      <DsResetPasswordForm key={token} token={token} variant="invite" />
    </DsCenteredAuthShell>
  )
}
