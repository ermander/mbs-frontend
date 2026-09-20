import { SUREBET_PLANS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'
import { PlanCard } from '@/components/landing/plan-card'

export function SurebetPlansSection() {
  return (
    <section id="piani-surebet" className="pb-16 pt-4 lg:pb-24 lg:pt-8">
      <LandingContainer className="flex flex-col gap-7 lg:gap-9">
        <SectionHeading
          eyebrow={SUREBET_PLANS.eyebrow}
          title={SUREBET_PLANS.title}
          size="md"
          className="max-w-[820px]"
        />
        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {SUREBET_PLANS.plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} size="md" />
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
