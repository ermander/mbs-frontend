import * as React from 'react'

import { DashboardAuthGuard } from './dashboard/dashboard-auth-guard'
import { Topnav } from '@/components/topnav/topnav'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <div className="flex min-h-screen flex-col bg-background">
        <Topnav />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </DashboardAuthGuard>
  )
}
