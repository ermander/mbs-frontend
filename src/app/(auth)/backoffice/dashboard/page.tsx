'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { authNavSections } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

/** Le voci della tendina «Backoffice» della barra, tranne questa pagina. */
const SECTIONS =
  authNavSections
    .find((s) => s.label === 'Backoffice')
    ?.items.filter((item) => item.href !== '/backoffice/dashboard') ?? []

/**
 * Ingresso del Backoffice sul design OddWise (§14.365): il titolo e una scheda per ogni sezione,
 * con le stesse icone e lo stesso ordine della tendina della barra. Prima era una riga di testo.
 */
export default function BackofficeDashboardPage() {
  return (
    <>
      <DsPageHeader
        title="Backoffice"
        description="Il pannello di amministrazione: raccolta quote, cataloghi, offerte e utenti."
      />
      <nav aria-label="Sezioni del backoffice">
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-0">
          {SECTIONS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  DS_PANEL,
                  'group flex items-center gap-3 px-4 py-3.5 text-ds-ink transition-colors hover:border-ds-line-strong',
                  dsFocusRing,
                )}
              >
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 font-semibold">{label}</span>
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 flex-none text-ds-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ds-brand"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
