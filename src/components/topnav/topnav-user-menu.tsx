'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { accountNavItem } from '@/lib/nav-config'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { dsFocusRing } from '@/components/landing/ds-primitives'
import { useHoverMenu } from './use-hover-menu'
import { topnavMenuItem, topnavMenuPanel } from './topnav-ds'

function getInitials(name: string | undefined, email: string | undefined): string {
  // || e non ??: dalla registrazione del design (§14.253) il nome può essere la stringa vuota.
  const source = (name || email || '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Nome e avatar con le iniziali a destra nella barra (il nome da `xl`, §14.275); la tendina (anche
 * al passaggio del mouse) porta al profilo e fa il logout.
 */
export function TopnavUserMenu() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = getInitials(user?.name, user?.email ?? undefined)
  const displayName = user?.name || user?.username || 'Account'
  const email = user?.email ?? ''
  // Nella barra solo il nome, come nel design («Marco»); nome ed email interi nella tendina.
  const firstName = displayName.split(/\s+/)[0]
  const AccountIcon = accountNavItem.icon
  const { open, onOpenChange, hoverProps, triggerProps } = useHoverMenu()

  const handleLogout = React.useCallback(async () => {
    await logout()
    router.replace('/login')
  }, [logout, router])

  return (
    <div {...hoverProps}>
      <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
        <DropdownMenuTrigger
          {...triggerProps}
          aria-label="Il tuo profilo"
          className={cn(
            'inline-flex h-10 items-center gap-2.5 rounded-full p-0.5 text-left text-sm text-ds-ink transition-colors xl:pl-3 xl:pr-1',
            'hover:bg-ds-surface-sunken data-[state=open]:bg-ds-surface-sunken',
            dsFocusRing,
          )}
        >
          <span className="hidden max-w-[8rem] truncate xl:block">{firstName}</span>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ds-brand-soft text-sm font-semibold text-ds-brand"
          >
            {initials}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          {...hoverProps}
          align="end"
          sideOffset={6}
          className={cn(topnavMenuPanel, 'min-w-[15rem]')}
        >
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-semibold text-ds-ink">{displayName}</div>
            {email && <div className="ds-caption truncate text-ds-ink-muted">{email}</div>}
          </div>
          <DropdownMenuSeparator className="bg-ds-line" />
          <DropdownMenuItem asChild className={topnavMenuItem}>
            <Link href={accountNavItem.href}>
              <AccountIcon aria-hidden className="h-4 w-4 shrink-0 text-ds-ink-muted" />
              <span>{accountNavItem.label}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-ds-line" />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              void handleLogout()
            }}
            className={cn(topnavMenuItem, 'text-ds-loss focus:bg-ds-loss-soft focus:text-ds-loss')}
          >
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
