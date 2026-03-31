import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export default function BackofficeLoginPage() {
  return (
    <Container className="max-w-md">
      <div className="space-y-6 text-center">
        <Image
          src="/loghi/mbs-icon.svg"
          alt="MBS"
          width={48}
          height={48}
          className="mx-auto h-12 w-12"
        />
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Login backoffice</h2>
        <p className="text-muted-foreground">
          Accedi al pannello di amministrazione. Solo gli utenti con ruolo ADMIN possono entrare.
        </p>
      </div>
      <Card className="mt-8">
        <CardHeader className="space-y-0 pb-4">
          <h3 className="sr-only">Form di accesso backoffice</h3>
        </CardHeader>
        <CardContent>
          <LoginForm redirectTo="/backoffice/dashboard" />
        </CardContent>
      </Card>
    </Container>
  )
}
