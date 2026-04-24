'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarNavItemProps {
  href: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  onNavigate?: () => void
}

function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: SidebarNavItemProps) {
  const pathname = usePathname()
  const active = isActiveHref(pathname, href)

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active && 'bg-accent text-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && (
        <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary" />
      )}
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
