import { WHY_IT_WORKS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'

export function WhyItWorksSection() {
  return (
    <section className="pb-16 pt-14 lg:pb-24 lg:pt-0">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading eyebrow={WHY_IT_WORKS.eyebrow} title={WHY_IT_WORKS.title} />
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
          {WHY_IT_WORKS.items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 border-t border-ow-line-strong pt-5"
            >
              <h3 className="text-lg font-medium tracking-[-0.012em] text-ow-text lg:text-xl">
                {item.title}
              </h3>
              <p className="text-[15px] leading-[1.6] text-ow-text-3">{item.text}</p>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
