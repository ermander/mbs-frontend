import { DsBackToLogin, DsCenteredAuthShell } from '@/components/auth/ds-auth-shell'
import { DsResetPasswordForm } from '@/components/auth/ds-reset-password-form'

interface ReimpostaPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * /reimposta-password?token=… dal design di Claude Design (artifact Gxa5BqXsdoSUZ4RV8oMjrY,
 * §14.257): lo stesso guscio del recupero; il form controlla il link appena si apre e, senza
 * token, mostra subito «Link non valido».
 */
export default async function ReimpostaPasswordPage({ searchParams }: ReimpostaPasswordPageProps) {
  const { token = '' } = await searchParams
  return (
    <DsCenteredAuthShell headerAside={<DsBackToLogin />}>
      <DsResetPasswordForm key={token} token={token} />
    </DsCenteredAuthShell>
  )
}
