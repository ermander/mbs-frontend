'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { isActiveHref, type AuthNavItem, type AuthNavSection } from '@/lib/nav-config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavSections } from './use-nav-sections'
import { useHoverMenu } from './use-hover-menu'

const entryClass = cn(
  'flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
  'text-muted-foreground hover:bg-accent hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
)

interface TopnavDesktopNavProps {
  className?: string
}

/** Le voci della barra: i gruppi `links` come link diretti, i gruppi `menu` come tendine. */
export function TopnavDesktopNav({ className }: TopnavDesktopNavProps) {
  const sections = useNavSections()
  const pathname = usePathname()

  return (
    <nav aria-label="Navigazione principale" className={cn('items-center gap-0.5', className)}>
      {sections.map((section) => (
        <React.Fragment key={section.label}>
          {section.display === 'links' ? (
            section.items.map((item) => (
              <TopnavLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
            ))
          ) : (
            <TopnavMenu section={section} pathname={pathname} />
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

function TopnavLink({ item, active }: { item: AuthNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(entryClass, active && 'bg-accent text-foreground')}
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
            entryClass,
            'group data-[state=open]:bg-accent data-[state=open]:text-foreground',
            active && 'bg-accent text-foreground',
          )}
        >
          {section.label}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          {...hoverProps}
          align="start"
          sideOffset={6}
          className="max-h-[calc(100dvh-var(--topnav-h)-1rem)] min-w-[13rem] overflow-y-auto rounded-xl"
        >
          {section.items.map((item) => {
            const itemActive = isActiveHref(pathname, item.href)
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className={cn('rounded-lg', itemActive && 'bg-accent/60 text-foreground')}
              >
                <Link
                  href={item.href}
                  aria-current={itemActive ? 'page' : undefined}
                  className="flex items-center gap-2"
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground',
                      itemActive && 'text-primary',
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
