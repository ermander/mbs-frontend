import { ReactNode } from 'react'
import { BackofficeAuthGuard } from '@/components/auth/backoffice-auth-guard'

export default function BackofficeAuthLayout({ children }: { children: ReactNode }) {
  return <BackofficeAuthGuard>{children}</BackofficeAuthGuard>
}
