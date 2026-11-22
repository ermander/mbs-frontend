'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { isActiveHref, type AuthNavItem } from '@/lib/nav-config'
import { dsNavLinkClass } from '@/components/landing/ds-primitives'
import { useNavSections } from './use-nav-sections'
import { NavHoverMenu } from './nav-submenu'

interface TopnavDesktopNavProps {
  className?: string
}

/**
 * Le voci della barra: i gruppi `links` come link diretti, i gruppi `menu` come tendine. Dal
 * §14.358 anche una voce con `children` (Offerte) è una tendina, al suo posto fra i link.
 */
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
                {item.children ? (
                  <NavHoverMenu
                    label={item.label}
                    items={item.children}
                    active={isActiveHref(pathname, item.href)}
                    pathname={pathname}
                  />
                ) : (
                  <TopnavLink item={item} active={isActiveHref(pathname, item.href)} />
                )}
              </li>
            ))
          ) : (
            <li key={section.label}>
              <NavHoverMenu
                label={section.label}
                items={section.items}
                active={section.items.some((item) => isActiveHref(pathname, item.href))}
                pathname={pathname}
              />
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
