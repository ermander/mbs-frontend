'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

interface SidebarUserChipProps {
  collapsed: boolean
}

function getInitials(name: string | undefined, email: string | undefined): string {
  const source = (name ?? email ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function SidebarUserChip({ collapsed }: SidebarUserChipProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = getInitials(user?.name, user?.email)
  const displayName = user?.name ?? user?.username ?? 'Account'
  const email = user?.email ?? ''

  const handleLogout = React.useCallback(async () => {
    await logout()
    router.replace('/login')
  }, [logout, router])

  const avatar = (
    <div
      aria-hidden
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-xs font-semibold text-foreground',
      )}
    >
      {initials}
    </div>
  )

  const trigger = (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'justify-center p-1.5',
      )}
      aria-label="Menu account"
    >
      {avatar}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
          {email && <div className="truncate text-xs text-muted-foreground">{email}</div>}
        </div>
      )}
    </button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">{displayName}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={collapsed ? 'start' : 'end'}
        side="top"
        sideOffset={8}
        className="min-w-[14rem] rounded-xl"
      >
        <DropdownMenuItem asChild className="rounded-lg">
          <Link href="/account/profilo" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>Profilo</span>
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
  )
}
