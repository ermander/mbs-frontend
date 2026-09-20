import { AuthHeader } from '@/components/auth/auth-header'
import { GuestGuard } from '@/components/auth/guest-guard'
import { RegistrationForm } from '@/components/auth/registration-form'

export default function RegistrazionePage() {
  return (
    <GuestGuard>
      <div className="flex flex-col gap-8">
        <AuthHeader title="Crea un account" subtitle="Inizia gratis. Bastano pochi secondi." />
        <RegistrationForm />
      </div>
    </GuestGuard>
  )
}
