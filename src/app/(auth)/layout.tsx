'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { DashboardAuthGuard } from './dashboard/dashboard-auth-guard'
import { SidebarProvider } from '@/components/sidebar/sidebar-provider'
import { Sidebar } from '@/components/sidebar/sidebar'
import { SidebarMobileSheet } from '@/components/sidebar/sidebar-mobile-sheet'
import { SidebarMobileTopbar } from '@/components/sidebar/sidebar-mobile-topbar'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBackoffice = pathname?.startsWith('/backoffice')

  return (
    <DashboardAuthGuard>
      {isBackoffice ? (
        children
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen bg-background">
            <Sidebar variant="desktop" />
            <SidebarMobileSheet />
            <div className="flex min-w-0 flex-1 flex-col">
              <SidebarMobileTopbar />
              <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </DashboardAuthGuard>
  )
}
