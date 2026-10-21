'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { isActiveHref, type AuthNavItem, type AuthNavSection } from '@/lib/nav-config'
import { dsNavLinkClass } from '@/components/landing/ds-primitives'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavSections } from './use-nav-sections'
import { useHoverMenu } from './use-hover-menu'
import { topnavMenuItem, topnavMenuPanel } from './topnav-ds'

interface TopnavDesktopNavProps {
  className?: string
}

/** Le voci della barra: i gruppi `links` come link diretti, i gruppi `menu` come tendine. */
export function TopnavDesktopNav({ className }: TopnavDesktopNavProps) {
  const sections = useNavSections()
  const pathname = usePathname()

  return (
    <nav aria-label="Principale" className={className}>
      <ul className="flex h-full items-center gap-1">
        {sections.map((section) =>
          section.display === 'links' ? (
            section.items.map((item) => (
              <li key={item.href}>
                <TopnavLink item={item} active={isActiveHref(pathname, item.href)} />
              </li>
            ))
          ) : (
            <li key={section.label}>
              <TopnavMenu section={section} pathname={pathname} />
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}

function TopnavLink({ item, active }: { item: AuthNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(dsNavLinkClass(active), 'whitespace-nowrap')}
    >
      {item.label}
    </Link>
  )
}

function TopnavMenu({ section, pathname }: { section: AuthNavSection; pathname: string | null }) {
  const active = section.items.some((item) => isActiveHref(pathname, item.href))
  const { open, onOpenChange, hoverProps, triggerProps } = useHoverMenu()

  return (
    <div {...hoverProps}>
      <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
        <DropdownMenuTrigger
          {...triggerProps}
          className={cn(
            dsNavLinkClass(active),
            'group gap-1 whitespace-nowrap data-[state=open]:text-ds-ink',
          )}
        >
          {section.label}
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          {...hoverProps}
          align="start"
          sideOffset={4}
          className={cn(
            topnavMenuPanel,
            'max-h-[calc(100dvh-var(--topnav-h)-1rem)] min-w-[14rem] overflow-y-auto',
          )}
        >
          {section.items.map((item) => {
            const itemActive = isActiveHref(pathname, item.href)
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className={cn(topnavMenuItem, itemActive && 'bg-ds-brand-soft font-semibold')}
              >
                <Link href={item.href} aria-current={itemActive ? 'page' : undefined}>
                  <Icon
                    aria-hidden
                    className={cn(
                      'h-4 w-4 shrink-0 text-ds-ink-muted',
                      itemActive && 'text-ds-brand',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
