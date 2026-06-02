'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, Menu, X, User } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
  'relative px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const navLinkActiveClass = 'text-foreground'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const logout = useAuthStore((s) => s.logout)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)
  const [scrolled, setScrolled] = React.useState(false)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDropdownWithClear = React.useCallback((label: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpenDropdown(label)
  }, [])

  const closeDropdownWithDelay = React.useCallback((label: string) => {
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown((current) => (current === label ? null : current))
    }, 150)
  }, [])

  const handleLogout = React.useCallback(() => {
    logout()
    setMobileOpen(false)
    router.push('/')
  }, [logout, router])

  const isAuthenticated = isLoggedIn || user !== null

  const userRole = user?.role
  const visibleDropdowns = React.useMemo(
    () =>
      authenticatedNavDropdowns.filter((d) => {
        if (d.requiresRole && d.requiresRole !== userRole) return false
        if (d.hiddenForRoles && userRole && d.hiddenForRoles.includes(userRole)) return false
        return true
      }),
    [userRole],
  )

  // Track scroll for pill border effect
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (!mobileOpen) return
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      window.scrollTo(0, scrollY)
    }
  }, [mobileOpen])

  return (
    <>
      {/* Spacer: reserves space in document flow since the header is fixed */}
      <div className="h-20" aria-hidden />
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div
            className={cn(
              'pointer-events-auto flex h-12 items-center justify-between rounded-full px-4 transition-all duration-300',
              'border bg-background/60 backdrop-blur-2xl',
              scrolled
                ? 'border-border/80 shadow-[0_0_15px_rgba(82,254,202,0.06)]'
                : 'border-border/40',
            )}
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full px-1 text-base font-bold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/loghi/mbs-icon.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7"
                priority
              />
              <span className="text-gradient-primary">MBS</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Menu principale">
              {isAuthenticated ? (
                <>
                  {authenticatedNavLinksBeforeDropdowns.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        navLinkClass,
                        'rounded-full hover:bg-accent',
                        pathname === href && navLinkActiveClass,
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                  {visibleDropdowns
                    .filter((d) => d.label !== 'ACCOUNT')
                    .map((dropdown) => (
                      <div
                        key={dropdown.label}
                        className="relative"
                        onMouseEnter={() => openDropdownWithClear(dropdown.label)}
                        onMouseLeave={() => closeDropdownWithDelay(dropdown.label)}
                      >
                        <DropdownMenu
                          open={openDropdown === dropdown.label}
                          onOpenChange={(open) =>
                            setOpenDropdown((current) =>
                              open ? dropdown.label : current === dropdown.label ? null : current,
                            )
                          }
                          modal={false}
                        >
                          <DropdownMenuTrigger
                            className={cn(
                              navLinkClass,
                              'inline-flex items-center gap-1 rounded-full border-0 bg-transparent p-0 px-3 py-1.5 hover:bg-accent',
                            )}
                            aria-haspopup="menu"
                          >
                            {dropdown.label}
                            <ChevronDown
                              className={cn(
                                'h-3 w-3 transition-transform duration-200',
                                openDropdown === dropdown.label && 'rotate-180',
                              )}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={8}
                            className="min-w-[12rem] rounded-xl border-border/60 bg-card/95 backdrop-blur-2xl"
                            onMouseEnter={() => openDropdownWithClear(dropdown.label)}
                            onMouseLeave={() => closeDropdownWithDelay(dropdown.label)}
                          >
                            {dropdown.items.map((item) => (
                              <DropdownMenuItem
                                key={item.href}
                                asChild
                                className="rounded-lg focus:bg-accent"
                              >
                                <Link href={item.href}>{item.label}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  {authenticatedNavLinksAfterDropdowns.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        navLinkClass,
                        'rounded-full hover:bg-accent',
                        pathname === href && navLinkActiveClass,
                      )}
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
                      className={cn(navLinkClass, 'rounded-full hover:bg-accent')}
                    >
                      {label}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* Right side: CTA or account */}
            <div className="hidden items-center gap-2 md:flex">
              {isAuthenticated ? (
                <div
                  className="relative"
                  onMouseEnter={() => openDropdownWithClear('ACCOUNT')}
                  onMouseLeave={() => closeDropdownWithDelay('ACCOUNT')}
                >
                  <DropdownMenu
                    open={openDropdown === 'ACCOUNT'}
                    onOpenChange={(open) =>
                      setOpenDropdown((current) =>
                        open ? 'ACCOUNT' : current === 'ACCOUNT' ? null : current,
                      )
                    }
                    modal={false}
                  >
                    <DropdownMenuTrigger
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-accent text-muted-foreground transition-all duration-200',
                        'hover:border-primary/30 hover:text-foreground hover:shadow-glow-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                      aria-label="Account"
                    >
                      <User className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="min-w-[12rem] rounded-xl border-border/60 bg-card/95 backdrop-blur-2xl"
                      onMouseEnter={() => openDropdownWithClear('ACCOUNT')}
                      onMouseLeave={() => closeDropdownWithDelay('ACCOUNT')}
                    >
                      {authenticatedNavDropdowns
                        .find((d) => d.label === 'ACCOUNT')
                        ?.items.map((item) => (
                          <DropdownMenuItem
                            key={item.href}
                            asChild
                            className="rounded-lg focus:bg-accent"
                          >
                            <Link href={item.href}>{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          handleLogout()
                        }}
                        className="rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="h-8 text-[13px]" asChild>
                    <Link href="/login">Accedi</Link>
                  </Button>
                  <Button size="sm" className="h-8 text-[13px]" asChild>
                    <Link href="/registrazione">Registrati</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-colors md:hidden',
                'text-muted-foreground hover:bg-accent hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div
            className="pointer-events-auto fixed inset-0 top-0 z-40 overflow-y-auto bg-background/95 backdrop-blur-2xl md:hidden"
            role="dialog"
            aria-label="Menu di navigazione"
          >
            {/* Close button area at top */}
            <div className="mx-auto flex h-20 max-w-6xl items-center justify-end px-8">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setMobileOpen(false)}
                aria-label="Chiudi menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mx-auto flex max-w-sm flex-col gap-1 px-6" aria-label="Menu mobile">
              {isAuthenticated ? (
                <>
                  {authenticatedNavLinksBeforeDropdowns.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                  <Accordion type="multiple" className="w-full gap-0">
                    {visibleDropdowns.map((dropdown) => (
                      <AccordionItem
                        key={dropdown.label}
                        value={dropdown.label}
                        className="border-0 bg-transparent"
                      >
                        <AccordionTrigger className="rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:bg-accent hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          {dropdown.label}
                        </AccordionTrigger>
                        <AccordionContent className="pb-1 pt-0">
                          <div className="flex flex-col gap-0">
                            {dropdown.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-xl px-6 py-2.5 text-[15px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                onClick={() => setMobileOpen(false)}
                              >
                                {item.label}
                              </Link>
                            ))}
                            {dropdown.label === 'ACCOUNT' && (
                              <button
                                type="button"
                                className="rounded-xl px-6 py-2.5 text-left text-[15px] text-destructive hover:bg-destructive/10"
                                onClick={handleLogout}
                              >
                                Logout
                              </button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {authenticatedNavLinksAfterDropdowns.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                      className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      asChild
                      className="justify-center rounded-xl"
                    >
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        Accedi
                      </Link>
                    </Button>
                    <Button size="lg" asChild className="justify-center rounded-xl">
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
    </>
  )
}
