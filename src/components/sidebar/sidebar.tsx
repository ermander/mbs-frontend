'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { useSidebar } from './sidebar-provider'
import { SidebarNav } from './sidebar-nav'
import { SidebarUserChip } from './sidebar-user-chip'
import { SidebarToggleButton } from './sidebar-toggle-button'

interface SidebarProps {
  variant?: 'desktop' | 'mobile'
}

export function Sidebar({ variant = 'desktop' }: SidebarProps) {
  const { collapsed, toggle, setMobileOpen } = useSidebar()
  const isMobile = variant === 'mobile'
  const effectiveCollapsed = isMobile ? false : collapsed

  const handleNavigate = React.useCallback(() => {
    if (isMobile) setMobileOpen(false)
  }, [isMobile, setMobileOpen])

  return (
    <TooltipProvider delayDuration={150} disableHoverableContent>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card',
          isMobile
            ? 'w-full'
            : [
                'sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 ease-out md:flex',
                effectiveCollapsed ? 'w-16' : 'w-64',
              ],
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2 border-b border-border px-3',
            effectiveCollapsed && !isMobile && 'justify-center px-0',
          )}
        >
          <Link
            href={POST_AUTH_REDIRECT}
            onClick={handleNavigate}
            className="flex items-center gap-2 rounded-md px-1 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/loghi/mbs-icon.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0"
              priority
            />
            {!effectiveCollapsed && <span className="text-gradient-primary">MBS</span>}
          </Link>
          {!isMobile && !effectiveCollapsed && (
            <div className="ml-auto">
              <SidebarToggleButton collapsed={collapsed} onToggle={toggle} />
            </div>
          )}
        </div>

        {!isMobile && effectiveCollapsed && (
          <div className="flex justify-center border-b border-border py-2">
            <SidebarToggleButton collapsed={collapsed} onToggle={toggle} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav collapsed={effectiveCollapsed} onNavigate={handleNavigate} />
        </div>

        <div
          className={cn('border-t border-border p-2', effectiveCollapsed && !isMobile && 'px-1')}
        >
          <SidebarUserChip collapsed={effectiveCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  )
}
