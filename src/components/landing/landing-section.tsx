import { cn } from '@/lib/utils'

export type LandingSectionAccent = 'none' | 'cyan-wash' | 'blue-wash'

const accentClass: Record<LandingSectionAccent, string> = {
  none: '',
  'cyan-wash':
    'before:bg-[radial-gradient(ellipse_85%_60%_at_50%_0%,rgba(82,254,202,0.045),transparent_58%)]',
  'blue-wash':
    'before:bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(59,130,246,0.04),transparent_55%)]',
}

type LandingSectionProps = {
  children: React.ReactNode
  id?: string
  className?: string
  /** Subtle semantic light pool behind headings — does not add a new image layer */
  accent?: LandingSectionAccent
  /** Ultra-thin luminous line at section top (softens previous boundary) */
  hairlineTop?: boolean
}

export function LandingSection({
  children,
  id,
  className,
  accent = 'none',
  hairlineTop = false,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative py-20 sm:py-28',
        accent !== 'none' && [
          'before:pointer-events-none before:absolute before:inset-0 before:z-0',
          accentClass[accent],
        ],
        className,
      )}
    >
      {hairlineTop && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-80"
          aria-hidden
        />
      )}
      <div className="relative z-10">{children}</div>
    </section>
  )
}
