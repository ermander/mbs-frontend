import { LoginForm } from '@/components/auth/login-form'
import { GuestGuard } from '@/components/auth/guest-guard'

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bentornato</h1>
          <p className="text-muted-foreground">Accedi al tuo account MBS per continuare.</p>
        </div>
        <LoginForm />
      </div>
    </GuestGuard>
  )
}
