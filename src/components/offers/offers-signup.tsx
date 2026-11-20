'use client'

import { Lock } from 'lucide-react'

import { loginHref } from '@/lib/auth-redirects'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { OFFERS_COPY } from '@/lib/offers-content'
import { DsButton } from '@/components/landing/ds-primitives'
import { DsModal } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'

/**
 * §14.351: l'invito a iscriversi che vede chi non è entrato quando apre la guida di un'offerta
 * chiusa: dall'elenco come finestra (OffersSignupDialog), da un indirizzo /offerte/<slug> come
 * pagina (OffersSignupNotice). Porta alla registrazione e, per chi ha già un account, al login
 * che riporta a `from` (`?next=`).
 */
function SignupActions({ from }: { from: string }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <DsButton href={LANDING_ROUTES.register} variant="primary">
        {OFFERS_COPY.signupAction}
      </DsButton>
      <DsButton href={loginHref(from)} variant="ghost">
        {OFFERS_COPY.loginAction}
      </DsButton>
    </div>
  )
}

export function OffersSignupDialog({
  open,
  onOpenChange,
  from,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  from: string
}) {
  return (
    <DsModal
      open={open}
      onOpenChange={onOpenChange}
      title={OFFERS_COPY.signupTitle}
      description={OFFERS_COPY.signupDescription}
    >
      <ul className="ds-body m-0 flex list-disc flex-col gap-1 pl-5 text-ds-ink">
        {OFFERS_COPY.signupPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <SignupActions from={from} />
    </DsModal>
  )
}

export function OffersSignupNotice({ from }: { from: string }) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 py-10 text-center sm:py-16">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="ds-heading m-0">{OFFERS_COPY.signupGuideTitle}</h1>
      <p className="ds-body m-0 text-ds-ink-muted">{OFFERS_COPY.signupDescription}</p>
      <SignupActions from={from} />
      <DsButton href="/offerte" variant="ghost" size="sm">
        {OFFERS_COPY.backToOffers}
      </DsButton>
    </div>
  )
}
