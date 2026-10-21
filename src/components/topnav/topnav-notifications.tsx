'use client'

import { Bell } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dsFocusRing } from '@/components/landing/ds-primitives'

/**
 * Contatore FINTO (§14.275): le notifiche non esistono ancora, il numero è quello del design.
 * Va sostituito dal conteggio vero quando ci sarà un servizio di notifiche.
 */
const PLACEHOLDER_UNREAD = 3

/** Campanella della barra con il contatore lime dei non letti, come nel design. */
export function TopnavNotifications() {
  const unread = PLACEHOLDER_UNREAD

  return (
    <button
      type="button"
      aria-label={unread > 0 ? `${unread} notifiche non lette` : 'Notifiche'}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-ds-sm text-ds-ink transition-colors hover:bg-ds-surface-sunken',
        dsFocusRing,
      )}
    >
      <Bell className="h-6 w-6" strokeWidth={2} aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute right-0 top-0.5 box-border h-[18px] min-w-[18px] rounded-full bg-ds-accent px-[5px] text-center text-[11px] font-semibold leading-[18px] text-ds-on-accent shadow-[0_0_0_2px_var(--ds-surface-raised)]"
        >
          {unread}
        </span>
      )}
    </button>
  )
}
