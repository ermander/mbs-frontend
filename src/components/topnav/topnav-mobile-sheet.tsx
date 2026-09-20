'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { isActiveHref } from '@/lib/nav-config'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Wordmark } from '@/components/landing/landing-primitives'
import { useNavSections } from './use-nav-sections'

interface TopnavMobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Sotto `lg`: cassetto da sinistra con i gruppi come intestazioni mono e le voci in colonna. */
export function TopnavMobileSheet({ open, onOpenChange }: TopnavMobileSheetProps) {
  const sections = useNavSections()
  const pathname = usePathname()
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-72 flex-col gap-0 p-0 sm:max-w-none lg:hidden"
        hideClose
      >
        <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
        <SheetDescription className="sr-only">
          Voci di navigazione dell&apos;area autenticata
        </SheetDescription>

        <div className="flex h-[var(--topnav-h)] shrink-0 items-center border-b border-border px-4">
          <Link
            href={POST_AUTH_REDIRECT}
            onClick={close}
            aria-label="OddWise"
            className="flex items-center gap-2 rounded-md px-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
        </div>

        <nav aria-label="Menu mobile" className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-4 last:mb-0">
              <div className="mb-1 px-3 font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
                {section.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActiveHref(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9 items-center gap-3 rounded-md px-3 text-[13px] transition-colors',
                        'text-muted-foreground hover:bg-accent hover:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'bg-accent font-medium text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
