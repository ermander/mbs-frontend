'use client'

import * as React from 'react'
import { Globe } from 'lucide-react'

import { dsFocusRing } from '@/components/landing/ds-primitives'
import { resolveCompetitionFlag } from '@/lib/country-flags'
import { cn } from '@/lib/utils'

/** Small pieces shared by the panels of Best Odds (§14.390). */

/**
 * A choice among a few: the chosen one in brand-soft like the DsSegmented of the design, the
 * others outlined. Used for the sports, the market types and the lines.
 */
export function chipClass(active: boolean): string {
  return cn(
    'inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm leading-5 whitespace-nowrap transition-colors duration-150',
    active
      ? 'border-ds-brand bg-ds-brand-soft font-semibold text-ds-brand'
      : 'border-ds-line-strong bg-ds-surface-raised font-medium text-ds-ink hover:bg-ds-surface-sunken',
    dsFocusRing,
  )
}

/** The number next to a chip's label: how many events, how many sites. */
export function ChipCount({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('ds-caption tabular-nums', active ? 'text-ds-brand' : 'text-ds-ink-muted')}>
      {children}
    </span>
  )
}

/**
 * The flag of a nation, or of Europe for a UEFA competition filed under no country; a globe when
 * there is none or when it does not load, so the names stay aligned.
 */
export function NationFlag({
  code,
  name,
  competitionName,
  label,
}: {
  code: string | null
  name: string | null
  competitionName?: string | null
  /** The nation in Italian, for the tooltip. */
  label?: string
}) {
  const flag = resolveCompetitionFlag(code, name, competitionName ?? null)
  // The address of a flag that did not load: the globe takes its place, not an empty frame.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)
  if (!flag || flag.url === failedUrl) {
    return <Globe className="h-3.5 w-4 flex-none text-ds-ink-faint" aria-hidden />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flag.url}
      alt=""
      title={label ?? (flag.label || undefined)}
      width={16}
      height={12}
      loading="lazy"
      onError={() => setFailedUrl(flag.url)}
      className="inline-block h-3 w-4 flex-none rounded-[2px] border border-ds-line object-cover"
    />
  )
}

/** A grey bar of a skeleton. */
export function Bone({ className }: { className?: string }) {
  return <div className={cn('rounded-ds-xs bg-ds-surface-sunken', className)} />
}
