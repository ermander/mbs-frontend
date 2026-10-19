import { DsAuthShell, DsRegisterAside } from '@/components/auth/ds-auth-shell'
import { DsRegistrationForm } from '@/components/auth/ds-registration-form'
import { GuestGuard } from '@/components/auth/guest-guard'

/**
 * /registrazione dal design di Claude Design (artifact YD2hmm5D6e4x8RRe8qiQJy, §14.253): lo
 * stesso guscio del login con il pannello della registrazione. Il guscio si rende subito; il
 * form aspetta GuestGuard.
 */
export default function RegistrazionePage() {
  return (
    <DsAuthShell aside={<DsRegisterAside />}>
      <GuestGuard>
        <DsRegistrationForm />
      </GuestGuard>
    </DsAuthShell>
  )
}
