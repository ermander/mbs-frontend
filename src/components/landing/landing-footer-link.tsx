'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isCurrentPage } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { dsFocusRing } from '@/components/landing/ds-primitives'

/**
 * Voce del piè di pagina: ink-muted, brand sottolineato al passaggio; la pagina che si sta
 * leggendo resta in brand sottolineato (come «Termini» nel design dei termini) con aria-current.
 */
export function LandingFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const current = isCurrentPage(href, usePathname())
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'rounded-sm transition-colors',
        current
          ? 'text-ds-brand underline hover:text-ds-brand-hover'
          : 'hover:text-ds-brand hover:underline',
        dsFocusRing,
      )}
    >
      {children}
    </Link>
  )
}
