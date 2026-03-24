'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

interface BackofficeShellProps {
  children: ReactNode
}

const navItems = [
  { href: '/backoffice/dashboard', label: 'Dashboard' },
  { href: '/backoffice/books', label: 'Bookmaker' },
  { href: '/backoffice/users', label: 'Utenti' },
]

export function BackofficeShell({ children }: BackofficeShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)

  const handleLogout = async () => {
    await logout()
    router.replace('/backoffice/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-surface-1">
        <div className="flex h-16 items-center border-b border-border px-6">
          <span className="text-lg font-semibold tracking-tight">MBS Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-l-2 border-primary bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {user && (
            <div className="mb-2">
              <div className="font-medium text-foreground">{user.email}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {user.role}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-md border border-border px-3 py-1.5 text-left text-xs font-medium text-foreground hover:bg-muted"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border bg-background px-6">
          <h1 className="text-base font-semibold tracking-tight">Backoffice</h1>
        </header>
        <main className="flex-1 bg-muted/30 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
