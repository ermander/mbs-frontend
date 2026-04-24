import { Card, CardContent } from '@/components/ui/card'
import { AuthHeader } from '@/components/auth/auth-header'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function RecuperoPasswordPage() {
  return (
    <div className="space-y-8">
      <AuthHeader
        title="Password dimenticata?"
        subtitle="Inserisci l'email del tuo account: ti invieremo un link per reimpostarla."
      />
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
