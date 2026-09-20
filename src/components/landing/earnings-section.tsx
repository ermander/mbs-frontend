import { EARNINGS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'

export function EarningsSection() {
  return (
    <section className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading eyebrow={EARNINGS.eyebrow} title={EARNINGS.title} />
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {EARNINGS.items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-2 rounded-ow-card border border-ow-line bg-ow-surface p-6"
            >
              <span className="text-[13px] text-ow-text-3">{item.label}</span>
              <span className="whitespace-nowrap font-ow-mono text-[28px] font-medium tabular-nums leading-[1.1] text-ow-text xl:text-[32px]">
                {item.value}
              </span>
              <span className="text-[13px] leading-[1.5] text-ow-text-3">{item.note}</span>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
