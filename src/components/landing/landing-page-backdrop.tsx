import type { CSSProperties } from 'react'
import Image from 'next/image'

import { cn } from '@/lib/utils'

/**
 * Full-height atmospheric stack for the home landing `<main>`.
 * Images are soft zones (masked, overlapping) — not full-width section banners.
 */
export function LandingPageBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Base depth */}
      <div className="absolute inset-0 bg-[hsl(220_14%_4%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_18%_5%)] via-[hsl(225_22%_7%)] via-[hsl(228_20%_6%)] to-[hsl(218_16%_5%)]" />
      {/* Continuity glows (scroll-length) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_55%_at_50%_-8%,rgba(82,254,202,0.07),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_45%_at_50%_102%,rgba(59,130,246,0.06),transparent_48%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_35%_at_15%_40%,rgba(34,211,238,0.04),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_35%_at_85%_65%,rgba(82,254,202,0.035),transparent_55%)]" />

      {/* Thematic image zones — vertical fade masks + overlap for seamless flow */}
      <BackdropZone
        src="/images/hero-bg.webp"
        className="top-0 h-[min(78vh,56rem)] opacity-[0.48]"
        priority
        sizes="100vw"
        mask="strong-bottom"
      />
      <BackdropZone
        src="/images/section-value.webp"
        className="top-[9%] h-[min(40vh,32rem)] opacity-[0.2]"
        sizes="100vw"
        mask="both"
      />
      <BackdropZone
        src="/images/section-how-it-works.webp"
        className="top-[21%] h-[min(42vh,34rem)] opacity-[0.18]"
        sizes="100vw"
        mask="both"
      />
      <BackdropZone
        src="/images/section-features.webp"
        className="top-[34%] h-[min(44vh,36rem)] opacity-[0.2]"
        sizes="100vw"
        mask="both"
      />
      <BackdropZone
        src="/images/section-social.webp"
        className="top-[47%] h-[min(38vh,32rem)] opacity-[0.17]"
        sizes="100vw"
        mask="both"
      />
      <BackdropZone
        src="/images/section-pricing.webp"
        className="top-[60%] h-[min(40vh,34rem)] opacity-[0.2]"
        sizes="100vw"
        mask="both"
      />
      <BackdropZone
        src="/images/section-cta.webp"
        className="top-[78%] h-[min(36vh,30rem)] opacity-[0.26]"
        sizes="100vw"
        mask="strong-top"
      />

      {/* Side vignette + light vertical wash — ties zones together */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_14%_4%/0.55)_0%,transparent_14%,transparent_86%,hsl(220_14%_4%/0.55)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/35" />
    </div>
  )
}

const maskStyles: Record<string, CSSProperties> = {
  'strong-bottom': {
    maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
  },
  both: {
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
  },
  'strong-top': {
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 55%, black 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 55%, black 100%)',
  },
}

function BackdropZone({
  src,
  className,
  priority,
  sizes,
  mask,
}: {
  src: string
  className?: string
  priority?: boolean
  sizes: string
  mask: keyof typeof maskStyles
}) {
  return (
    <div className={cn('absolute left-0 right-0', className)} style={maskStyles[mask]}>
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        quality={82}
        sizes={sizes}
        className="object-cover object-center"
      />
    </div>
  )
}
