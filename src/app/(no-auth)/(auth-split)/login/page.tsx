import { AuthHeader } from '@/components/auth/auth-header'
import { GuestGuard } from '@/components/auth/guest-guard'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <GuestGuard>
      <div className="flex flex-col gap-8">
        <AuthHeader title="Bentornato" subtitle="Accedi al tuo account OddWise per continuare." />
        <LoginForm />
      </div>
    </GuestGuard>
  )
}
