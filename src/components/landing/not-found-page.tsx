import { Eyebrow, LandingButton, LandingContainer } from '@/components/landing/landing-primitives'
import { SiteShell } from '@/components/landing/site-shell'

/** 404 pubblica: stessa grammatica della landing, una CTA piena e una secondaria. */
export function NotFoundPage() {
  return (
    <SiteShell>
      <LandingContainer className="flex flex-col items-start gap-6 py-24 lg:py-32">
        <Eyebrow>Errore 404</Eyebrow>
        <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text lg:text-[40px]">
          Pagina non trovata
        </h1>
        <p className="max-w-[48ch] text-[15px] leading-[1.6] text-ow-text-3 lg:text-base">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="flex flex-wrap gap-3">
          <LandingButton href="/" variant="accent">
            Torna alla home
          </LandingButton>
          <LandingButton href="/contatti" variant="ghost">
            Contatti
          </LandingButton>
        </div>
      </LandingContainer>
    </SiteShell>
  )
}
