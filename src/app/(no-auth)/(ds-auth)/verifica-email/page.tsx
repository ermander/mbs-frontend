import { DsCenteredAuthShell } from '@/components/auth/ds-auth-shell'
import { DsVerifyEmail } from '@/components/auth/ds-verify-email'

interface VerificaEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * /verifica-email?token=… dal design di Claude Design (artifact QDTUn7GYt7LBfr1rpVB6Jz,
 * §14.258): il guscio a colonna centrale del recupero password, con il solo marchio nella barra;
 * la pagina controlla il link appena si apre e, senza token, mostra subito «Il link non vale più».
 */
export default async function VerificaEmailPage({ searchParams }: VerificaEmailPageProps) {
  const { token = '' } = await searchParams
  return (
    <DsCenteredAuthShell>
      <DsVerifyEmail key={token} token={token} />
    </DsCenteredAuthShell>
  )
}
