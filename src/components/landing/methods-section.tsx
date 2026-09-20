import { METHODS } from '@/lib/landing-content'
import {
  Eyebrow,
  LandingButton,
  LandingContainer,
  SectionHeading,
} from '@/components/landing/landing-primitives'

const card =
  'flex flex-col gap-4 rounded-ow-card border border-ow-line bg-ow-surface p-6 text-ow-text md:min-h-[280px] lg:p-8'
const title = 'text-[26px] font-medium leading-[1.1] tracking-[-0.022em] lg:text-[32px]'
const text = 'max-w-[460px] text-[15px] leading-[1.6] text-ow-text-3 lg:text-base'
const cta = 'mt-auto w-full md:w-auto md:self-start'

/** I due metodi, Matched Betting e Surebet: stessa card, stesso pulsante secondario. */
export function MethodsSection() {
  return (
    <section id="matched" className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading eyebrow={METHODS.eyebrow} title={METHODS.title} />
        <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
          <div className={card}>
            <Eyebrow>{METHODS.matched.eyebrow}</Eyebrow>
            <h3 className={title}>{METHODS.matched.title}</h3>
            <p className={text}>{METHODS.matched.text}</p>
            <LandingButton href={METHODS.matched.href} variant="ghost" className={cta}>
              {METHODS.matched.cta}
            </LandingButton>
          </div>
          <div id="surebet" className={card}>
            <Eyebrow>{METHODS.surebet.eyebrow}</Eyebrow>
            <h3 className={title}>{METHODS.surebet.title}</h3>
            <p className={text}>{METHODS.surebet.text}</p>
            <LandingButton href={METHODS.surebet.href} variant="ghost" className={cta}>
              {METHODS.surebet.cta}
            </LandingButton>
          </div>
        </div>
      </LandingContainer>
    </section>
  )
}
