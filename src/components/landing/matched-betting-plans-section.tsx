import { MATCHED_BETTING_PLANS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'
import { PlanCard } from '@/components/landing/plan-card'

export function MatchedBettingPlansSection() {
  return (
    <section id="piani" className="pb-12 pt-16 lg:pb-16 lg:pt-24">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading
          eyebrow={MATCHED_BETTING_PLANS.eyebrow}
          title={MATCHED_BETTING_PLANS.title}
          text={MATCHED_BETTING_PLANS.text}
          className="max-w-[820px]"
        />
        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {MATCHED_BETTING_PLANS.plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} size="lg" />
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
