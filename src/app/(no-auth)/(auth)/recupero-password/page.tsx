import { AuthHeader } from '@/components/auth/auth-header'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function RecuperoPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Password dimenticata?"
        subtitle="Inserisci l'email del tuo account: ti invieremo un link per reimpostarla."
      />
      <ForgotPasswordForm />
    </div>
  )
}
