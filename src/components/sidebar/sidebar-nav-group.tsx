'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarNavGroupItem {
  label: string
  href: string
}

interface SidebarNavGroupProps {
  label: string
  icon: LucideIcon
  collapsed: boolean
  items: SidebarNavGroupItem[]
  onNavigate?: () => void
}

function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(href + '/')
}

export function SidebarNavGroup({
  label,
  icon: Icon,
  collapsed,
  items,
  onNavigate,
}: SidebarNavGroupProps) {
  const pathname = usePathname()
  const groupActive = items.some((c) => isActiveHref(pathname, c.href))
  const [open, setOpen] = React.useState(groupActive)

  React.useEffect(() => {
    if (groupActive) setOpen(true)
  }, [groupActive])

  if (collapsed) {
    const firstChild = items[0]
    const link = (
      <Link
        href={firstChild.href}
        onClick={onNavigate}
        aria-current={groupActive ? 'page' : undefined}
        aria-label={label}
        className={cn(
          'group relative flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          groupActive && 'bg-accent text-foreground',
        )}
      >
        {groupActive && (
          <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary" />
        )}
        <Icon className={cn('h-4 w-4 shrink-0', groupActive && 'text-primary')} />
      </Link>
    )
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'group relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          groupActive && 'text-foreground',
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', groupActive && 'text-primary')} />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronRight
          className={cn('h-3 w-3 shrink-0 transition-transform duration-150', open && 'rotate-90')}
        />
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-8">
          {items.map((child) => {
            const childActive = isActiveHref(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={childActive ? 'page' : undefined}
                className={cn(
                  'flex h-8 items-center rounded-md px-3 text-sm transition-colors',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  childActive && 'bg-accent text-foreground',
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
