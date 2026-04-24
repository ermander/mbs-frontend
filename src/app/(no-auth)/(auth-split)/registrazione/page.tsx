import { RegistrationForm } from '@/components/auth/registration-form'
import { GuestGuard } from '@/components/auth/guest-guard'

export default function RegistrazionePage() {
  return (
    <GuestGuard>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Crea un account</h1>
          <p className="text-muted-foreground">Inizia gratis. Bastano pochi secondi.</p>
        </div>
        <RegistrationForm />
      </div>
    </GuestGuard>
  )
}
