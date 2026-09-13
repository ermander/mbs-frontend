'use client'

import Image from 'next/image'
import { bookmakerLogoSrc, shortBookmakerName } from '@/lib/bookmakers'
import { cn } from '@/lib/utils'

interface BookmakerBadgeProps {
  slug: string
  name: string
  size?: 'sm' | 'md'
  className?: string
}

/** The logo of a bookmaker of the internal engine, its short name when there is no logo file. */
export function BookmakerBadge({ slug, name, size = 'sm', className }: BookmakerBadgeProps) {
  const src = bookmakerLogoSrc(slug)
  const label = shortBookmakerName(name)
  const height = size === 'md' ? 'h-7 max-w-[96px]' : 'h-5 max-w-[72px]'
  if (!src) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded border border-border bg-background px-1.5 font-medium text-foreground',
          size === 'md' ? 'h-7 text-xs' : 'h-5 text-[11px]',
          className,
        )}
        title={label}
      >
        {label}
      </span>
    )
  }
  return (
    <Image
      src={src}
      alt={label}
      title={label}
      width={96}
      height={28}
      className={cn('w-auto object-contain', height, className)}
      loading="lazy"
    />
  )
}
