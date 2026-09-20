import { FAQ } from '@/lib/landing-content'
import { Eyebrow, LandingContainer } from '@/components/landing/landing-primitives'

/** Domande e risposte tutte visibili, come nel mockup: niente accordion. */
export function FaqSection() {
  return (
    <section id="faq" className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8 lg:flex-row lg:gap-16">
        <div className="flex flex-col gap-3 lg:w-[380px] lg:shrink-0">
          <Eyebrow>{FAQ.eyebrow}</Eyebrow>
          <h2 className="text-[28px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text sm:text-[32px] lg:text-[40px]">
            {FAQ.title}
          </h2>
        </div>
        <dl className="flex flex-1 flex-col">
          {FAQ.items.map((item) => (
            <div
              key={item.q}
              className="flex flex-col gap-1.5 border-t border-ow-line py-4 lg:py-5"
            >
              <dt className="text-base font-medium tracking-[-0.012em] text-ow-text">{item.q}</dt>
              <dd className="text-[15px] leading-[1.6] text-ow-text-3">{item.a}</dd>
            </div>
          ))}
        </dl>
      </LandingContainer>
    </section>
  )
}
