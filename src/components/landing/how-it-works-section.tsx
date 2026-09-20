import { HOW_IT_WORKS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'

export function HowItWorksSection() {
  return (
    <section id="come" className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading eyebrow={HOW_IT_WORKS.eyebrow} title={HOW_IT_WORKS.title} />
        <ol className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {HOW_IT_WORKS.steps.map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-3 rounded-ow-card border border-ow-line bg-ow-surface p-6 lg:min-h-[200px]"
            >
              <span className="font-ow-mono text-xs text-ow-text-3">{step.n}</span>
              <h3 className="text-lg font-medium tracking-[-0.012em] text-ow-text lg:text-xl">
                {step.title}
              </h3>
              <p className="text-[15px] leading-[1.6] text-ow-text-3">{step.text}</p>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  )
}
