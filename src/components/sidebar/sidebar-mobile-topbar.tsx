'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { useSidebar } from './sidebar-provider'

export function SidebarMobileTopbar() {
  const { setMobileOpen } = useSidebar()

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Apri menu"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors',
          'hover:bg-accent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link
        href={POST_AUTH_REDIRECT}
        className="flex items-center gap-2 text-base font-bold text-foreground"
      >
        <Image
          src="/loghi/mbs-icon.svg"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6"
          priority
        />
        <span className="text-gradient-primary">MBS</span>
      </Link>
    </div>
  )
}
