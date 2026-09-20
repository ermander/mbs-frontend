import { ContactForm } from '@/components/contact/contact-form'
import { Eyebrow, LandingContainer, TextLink } from '@/components/landing/landing-primitives'
import { SiteShell } from '@/components/landing/site-shell'

const CONTACT_EMAIL = 'info@example.com'

export default function ContattiPage() {
  return (
    <SiteShell>
      <LandingContainer className="py-16 lg:py-24">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <div className="flex flex-col gap-3">
              <Eyebrow>Contatti</Eyebrow>
              <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text lg:text-[40px]">
                Scrivici
              </h1>
              <p className="text-[15px] leading-[1.6] text-ow-text-3 lg:text-base">
                Per domande, supporto o collaborazioni puoi scriverci o usare il modulo.
              </p>
            </div>
            <dl className="flex flex-col gap-4 border-t border-ow-line pt-5">
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-ow-text-3">Email</dt>
                <dd className="text-[15px]">
                  <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-ow-text-3">Altri recapiti</dt>
                <dd className="text-[15px] text-ow-text-2">
                  [Indirizzo o altri recapiti da aggiornare]
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex w-full max-w-[480px] flex-col gap-6 lg:flex-1">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-medium tracking-[-0.012em] text-ow-text lg:text-xl">
                Invia un messaggio
              </h2>
              <p className="text-[15px] leading-[1.6] text-ow-text-3">
                Compila il modulo e ti risponderemo al più presto.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </LandingContainer>
    </SiteShell>
  )
}
