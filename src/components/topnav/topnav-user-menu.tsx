'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'

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
import { useHoverMenu } from './use-hover-menu'

function getInitials(name: string | undefined, email: string | undefined): string {
  const source = (name ?? email ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar con le iniziali a destra nella barra; la tendina (anche al passaggio del mouse) porta al profilo e fa il logout. */
export function TopnavUserMenu() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = getInitials(user?.name, user?.email ?? undefined)
  const displayName = user?.name ?? user?.username ?? 'Account'
  const email = user?.email ?? ''
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
          aria-label="Menu account"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md px-1.5 text-left transition-colors',
            'hover:bg-accent data-[state=open]:bg-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-[11px] font-semibold text-foreground"
          >
            {initials}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground lg:block">
            {displayName}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground lg:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          {...hoverProps}
          align="end"
          sideOffset={6}
          className="min-w-[14rem] rounded-xl"
        >
          <div className="px-2 py-1.5">
            <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
            {email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg">
            <Link href={accountNavItem.href} className="flex items-center gap-2">
              <AccountIcon className="h-4 w-4" />
              <span>{accountNavItem.label}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              void handleLogout()
            }}
            className="rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
