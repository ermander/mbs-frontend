import Image from 'next/image'

import { allBookmakerLogoSrcs } from '@/lib/bookmakers'
import { BETTING_SITES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { LandingContainer, SectionHeading } from '@/components/landing/landing-primitives'

/**
 * Una fila del carosello: due copie dei 35 loghi una dietro l'altra, la fila scorre di
 * metà della sua larghezza (keyframes ow-marquee, 70s) e riparte senza salto. Solo CSS;
 * con prefers-reduced-motion resta ferma. I loghi sono in scala di grigi e attenuati, come
 * una striscia clienti: l'unico colore della pagina resta l'accento.
 */
function LogoRow({ reverse = false }: { reverse?: boolean }) {
  const logos = allBookmakerLogoSrcs()
  return (
    <div
      className={cn(
        'flex w-max animate-ow-marquee motion-reduce:[animation-play-state:paused]',
        reverse && '[animation-delay:-35s] [animation-direction:reverse]',
      )}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          className="flex shrink-0 items-center gap-4 pr-4"
          aria-hidden={copy === 1 ? true : undefined}
        >
          {logos.map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={160}
              height={40}
              unoptimized
              className="h-8 w-auto rounded opacity-70 grayscale lg:h-9"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function BettingSitesCarousel() {
  return (
    <section className="py-16 lg:py-24">
      <LandingContainer className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={BETTING_SITES.eyebrow}
            title={BETTING_SITES.title}
            className="lg:max-w-[900px]"
          />
          <span className="text-[13px] text-ow-text-3 lg:shrink-0">{BETTING_SITES.aside}</span>
        </div>
        <div
          role="img"
          aria-label={BETTING_SITES.logosAlt}
          className="relative flex flex-col gap-4 overflow-hidden"
        >
          <LogoRow />
          <LogoRow reverse />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ow-bg to-transparent lg:w-[140px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ow-bg to-transparent lg:w-[140px]"
          />
        </div>
      </LandingContainer>
    </section>
  )
}
