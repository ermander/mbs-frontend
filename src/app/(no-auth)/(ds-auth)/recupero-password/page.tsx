import { DsBackToLogin, DsCenteredAuthShell } from '@/components/auth/ds-auth-shell'
import { DsForgotPasswordForm } from '@/components/auth/ds-forgot-password-form'

/**
 * /recupero-password dal design di Claude Design (artifact Gxa5BqXsdoSUZ4RV8oMjrY, §14.257): il
 * guscio a colonna centrale con la richiesta del link e la vista «Controlla la posta».
 */
export default function RecuperoPasswordPage() {
  return (
    <DsCenteredAuthShell headerAside={<DsBackToLogin />}>
      <DsForgotPasswordForm />
    </DsCenteredAuthShell>
  )
}
