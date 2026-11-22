'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronDown, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { isActiveHref, type NavSubmenuLink } from '@/lib/nav-config'
import { dsFocusRing, dsNavLinkClass } from '@/components/landing/ds-primitives'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHoverMenu } from './use-hover-menu'
import { topnavMenuItem, topnavMenuPanel } from './topnav-ds'

/**
 * La tendina di una voce della barra su desktop: si apre al passaggio del mouse (useHoverMenu),
 * col clic e da tastiera. Nata per Tracker e Backoffice (§14.275); dal §14.358 la usano anche la
 * voce «Offerte» della barra dell'app e quella della landing.
 */
export function NavHoverMenu({
  label,
  items,
  active,
  pathname,
}: {
  label: string
  items: readonly NavSubmenuLink[]
  active: boolean
  pathname: string | null
}) {
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
          {label}
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          {...hoverProps}
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className={cn(
            topnavMenuPanel,
            'max-h-[calc(100dvh-var(--topnav-h)-1rem)] min-w-56 overflow-y-auto',
          )}
        >
          {items.map((item) => {
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

/**
 * La stessa voce nei menu del telefono (§14.358): una riga che si espande e mostra le pagine
 * sotto, rientrate. Parte aperta quando si è già in una di quelle pagine (`active`); i link
 * chiamano `onNavigate`, che chiude il menu. `rowClassName` è lo stile delle righe del menu che
 * la ospita, così la riga che si espande sembra una delle altre.
 */
export function NavExpandable({
  label,
  icon: Icon,
  items,
  active,
  pathname,
  onNavigate,
  rowClassName,
  itemsClassName,
}: {
  label: string
  icon?: LucideIcon
  items: readonly NavSubmenuLink[]
  active: boolean
  pathname: string | null
  onNavigate: () => void
  rowClassName: string
  /** Il rientro delle pagine sotto la riga. */
  itemsClassName?: string
}) {
  const [open, setOpen] = React.useState(active)
  const listId = React.useId()

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(rowClassName, 'w-full text-left', active && 'font-semibold text-ds-ink')}
      >
        {Icon && <Icon aria-hidden className={cn('h-4 w-4 shrink-0', active && 'text-ds-brand')} />}
        <span className="truncate">{label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'ml-auto h-4 w-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <ul
        id={listId}
        hidden={!open}
        className={cn('mt-0.5 flex-col gap-0.5', open ? 'flex' : 'hidden', itemsClassName)}
      >
        {items.map((item) => {
          const itemActive = isActiveHref(pathname, item.href)
          const ItemIcon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={itemActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-ds-sm px-3 py-2 text-sm font-medium text-ds-ink-muted transition-colors hover:bg-ds-surface-sunken hover:text-ds-ink',
                  itemActive && 'bg-ds-brand-soft font-semibold text-ds-ink',
                  dsFocusRing,
                )}
              >
                <ItemIcon
                  aria-hidden
                  className={cn('h-4 w-4 shrink-0', itemActive && 'text-ds-brand')}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
