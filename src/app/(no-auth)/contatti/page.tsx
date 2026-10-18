import { ContactForm } from '@/components/contact/contact-form'
import { DsContainer, DsEyebrow, DsTextLink } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'

const CONTACT_EMAIL = 'info@example.com'

export default function ContattiPage() {
  return (
    <SiteShell>
      <DsContainer className="py-16 lg:py-24">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <div className="flex flex-col gap-3">
              <DsEyebrow>Contatti</DsEyebrow>
              <h1 className="ds-display">Scrivici</h1>
              <p className="ds-body text-ds-ink-muted">
                Per domande, supporto o collaborazioni puoi scriverci o usare il modulo.
              </p>
            </div>
            <dl className="flex flex-col gap-4 border-t border-ds-line pt-5">
              <div className="flex flex-col gap-1">
                <dt className="ds-body-sm text-ds-ink-muted">Email</dt>
                <dd className="ds-body">
                  <DsTextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</DsTextLink>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="ds-body-sm text-ds-ink-muted">Altri recapiti</dt>
                <dd className="ds-body text-ds-ink">[Indirizzo o altri recapiti da aggiornare]</dd>
              </div>
            </dl>
          </div>

          <div className="flex w-full max-w-[480px] flex-col gap-6 lg:flex-1">
            <div className="flex flex-col gap-1.5">
              <h2 className="ds-heading">Invia un messaggio</h2>
              <p className="ds-body text-ds-ink-muted">
                Compila il modulo e ti risponderemo al più presto.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </DsContainer>
    </SiteShell>
  )
}
