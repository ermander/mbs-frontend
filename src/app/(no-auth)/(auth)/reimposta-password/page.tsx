import { AuthHeader } from '@/components/auth/auth-header'
import { AuthLink } from '@/components/auth/auth-primitives'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

interface ReimpostaPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ReimpostaPasswordPage({ searchParams }: ReimpostaPasswordPageProps) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token) {
    return (
      <div className="flex flex-col gap-8">
        <AuthHeader
          title="Link non valido"
          subtitle="Il link per reimpostare la password non è valido o è scaduto."
        />
        <p className="text-sm text-ow-text-3">
          <AuthLink href="/recupero-password">Richiedi un nuovo link</AuthLink>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Reimposta password"
        subtitle="Inserisci la nuova password per il tuo account."
      />
      <ResetPasswordForm token={token} />
    </div>
  )
}
