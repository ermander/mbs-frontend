'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { isActiveHref } from '@/lib/nav-config'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'
import { useNavSections } from './use-nav-sections'
import { topnavDsScope } from './topnav-ds'

interface TopnavMobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Sotto `lg`: cassetto da destra sui token ds-*. Le voci dei gruppi `links` in colonna, quelle
 * delle tendine (Tracker, Backoffice) sotto l'etichetta del gruppo.
 */
export function TopnavMobileSheet({ open, onOpenChange }: TopnavMobileSheetProps) {
  const sections = useNavSections()
  const pathname = usePathname()
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          topnavDsScope,
          'flex w-72 flex-col gap-0 border-l border-ds-line bg-ds-surface-raised p-0 sm:max-w-none lg:hidden',
        )}
        hideClose
      >
        <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
        <SheetDescription className="sr-only">
          Voci di navigazione dell&apos;area autenticata
        </SheetDescription>

        <div className="flex h-[var(--topnav-h)] shrink-0 items-center justify-between border-b border-ds-line px-4">
          <Link
            href={POST_AUTH_REDIRECT}
            onClick={close}
            aria-label="OddWise"
            className={cn('rounded-ds-sm', dsFocusRing)}
          >
            <DsWordmark size="sm" />
          </Link>
          <SheetClose
            aria-label="Chiudi menu"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-ds-sm border border-ds-line-strong text-ds-ink',
              dsFocusRing,
            )}
          >
            <X className="h-5 w-5" aria-hidden />
          </SheetClose>
        </div>

        <nav aria-label="Menu mobile" className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <div key={section.label} className="mb-3 last:mb-0">
              {section.display === 'menu' && (
                <div className="ds-label mb-1 mt-2 px-3 uppercase text-ds-ink-muted">
                  {section.label}
                </div>
              )}
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
                        'flex items-center gap-3 rounded-ds-sm px-3 py-2.5 font-medium text-ds-ink-muted transition-colors hover:bg-ds-surface-sunken hover:text-ds-ink',
                        active && 'bg-ds-brand-soft font-semibold text-ds-ink',
                        dsFocusRing,
                      )}
                    >
                      <Icon
                        aria-hidden
                        className={cn('h-4 w-4 shrink-0', active && 'text-ds-brand')}
                      />
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
