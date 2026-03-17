import { ReactNode } from 'react'
import { BackofficeAuthGuard } from '@/components/auth/backoffice-auth-guard'
import { BackofficeShell } from '@/components/backoffice/backoffice-shell'

export default function BackofficeAuthLayout({ children }: { children: ReactNode }) {
  return (
    <BackofficeAuthGuard>
      <BackofficeShell>{children}</BackofficeShell>
    </BackofficeAuthGuard>
  )
}
