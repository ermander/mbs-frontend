import { TOOLS } from '@/lib/landing-content'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'

export function ToolsSection() {
  return (
    <section id="strumenti" className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8 lg:gap-10">
        <SectionHeading eyebrow={TOOLS.eyebrow} title={TOOLS.title} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.items.map((tool) => (
            <div
              key={tool.n}
              className="flex flex-col gap-3 rounded-ow-card border border-ow-line bg-ow-surface p-5 lg:min-h-[180px]"
            >
              <span className="font-ow-mono text-xs text-ow-text-3">{tool.n}</span>
              <span className="text-base font-medium tracking-[-0.012em] text-ow-text">
                {tool.title}
              </span>
              <span className="text-[13px] leading-[1.6] text-ow-text-3">{tool.text}</span>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  )
}
