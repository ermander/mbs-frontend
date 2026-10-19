import { DsAuthShell } from '@/components/auth/ds-auth-shell'
import { DsLoginForm } from '@/components/auth/ds-login-form'
import { GuestGuard } from '@/components/auth/guest-guard'

/**
 * /login dal design di Claude Design (artifact 2XdF4wj1R2NqbrBkeum9qt, §14.252): guscio a due
 * colonne sui token ds-* e form di accesso. Fuori dal gruppo (auth-split), che resta alla
 * registrazione sulla grammatica «Linear». Il guscio si rende subito; il form aspetta GuestGuard.
 */
export default function LoginPage() {
  return (
    <DsAuthShell>
      <GuestGuard>
        <DsLoginForm />
      </GuestGuard>
    </DsAuthShell>
  )
}
