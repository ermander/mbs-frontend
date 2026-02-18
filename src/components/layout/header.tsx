'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  authenticatedNavDropdowns,
  authenticatedNavLinksBeforeDropdowns,
  authenticatedNavLinksAfterDropdowns,
} from '@/lib/nav-config'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/#come-funziona', label: 'Come funziona' },
  { href: '/#strumenti', label: 'Strumenti' },
  { href: '/#prezzi', label: 'Prezzi' },
  { href: '/#faq', label: 'FAQ' },
] as const

const navLinkClass =
  'rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function Header() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleLogout = React.useCallback(() => {
    logout()
    setMobileOpen(false)
    router.push('/')
  }, [logout, router])

  const isAuthenticated = user !== null

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-white/10 bg-white/5 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          MBS
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Menu principale">
          {isAuthenticated ? (
            <>
              {authenticatedNavLinksBeforeDropdowns.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass}>
                  {label}
                </Link>
              ))}
              {authenticatedNavDropdowns.map((dropdown) => (
                <DropdownMenu key={dropdown.label}>
                  <DropdownMenuTrigger
                    className={cn(
                      navLinkClass,
                      'inline-flex items-center gap-1 border-0 bg-transparent p-0',
                    )}
                    aria-haspopup="menu"
                  >
                    {dropdown.label}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[12rem]">
                    {dropdown.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                    {dropdown.label === 'ACCOUNT' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            handleLogout()
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          Logout
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              {authenticatedNavLinksAfterDropdowns.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    navLinkClass,
                    label === 'AGENDA' &&
                      'bg-primary/20 font-medium text-primary hover:bg-primary/30 hover:text-primary',
                  )}
                >
                  {label}
                </Link>
              ))}
            </>
          ) : (
            <>
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass}>
                  {label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Accedi</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registrazione">Registrati</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="border-t border-white/10 bg-background/95 backdrop-blur-md md:hidden"
          role="dialog"
          aria-label="Menu di navigazione"
        >
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Menu mobile">
            {isAuthenticated ? (
              <>
                {authenticatedNavLinksBeforeDropdowns.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                {authenticatedNavDropdowns.map((dropdown) => (
                  <div key={dropdown.label} className="flex flex-col gap-0">
                    <span className="px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                      {dropdown.label}
                    </span>
                    {dropdown.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-md px-5 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    {dropdown.label === 'ACCOUNT' && (
                      <button
                        type="button"
                        className="rounded-md px-5 py-2 text-left text-sm text-destructive hover:bg-white/5"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    )}
                  </div>
                ))}
                {authenticatedNavLinksAfterDropdowns.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground',
                      label === 'AGENDA' && 'bg-primary/20 font-medium text-primary',
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </>
            ) : (
              <>
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                  <Button variant="ghost" asChild className="justify-center">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      Accedi
                    </Link>
                  </Button>
                  <Button asChild className="justify-center">
                    <Link href="/registrazione" onClick={() => setMobileOpen(false)}>
                      Registrati
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
