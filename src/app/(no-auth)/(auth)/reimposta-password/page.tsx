import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { AuthHeader } from '@/components/auth/auth-header'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

interface ReimpostaPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ReimpostaPasswordPage({ searchParams }: ReimpostaPasswordPageProps) {
  const params = await searchParams
  const token = params.token ?? ''

  if (!token) {
    return (
      <div className="space-y-8">
        <AuthHeader
          title="Link non valido"
          subtitle="Il link per reimpostare la password non è valido o è scaduto."
        />
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/recupero-password"
            className="rounded font-medium text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Richiedi un nuovo link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AuthHeader
        title="Reimposta password"
        subtitle="Inserisci la nuova password per il tuo account."
      />
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ResetPasswordForm token={token} />
        </CardContent>
      </Card>
    </div>
  )
}
