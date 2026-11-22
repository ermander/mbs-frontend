'use client'

import { use, useEffect, useState } from 'react'

import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import { getBackofficeOffer } from '@/services/api/backoffice-offers-client'
import type { OfferAdmin } from '@/types/offers'
import { BoBackLink, BoMuted } from '@/components/backoffice/backoffice-ds'
import { OfferEditor } from '@/components/backoffice/offers/offer-editor'
import { DsAlert } from '@/components/profit-tracker/tracker-ds'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; offer: OfferAdmin }
  | { status: 'error'; message: string }

/** Modifica di un'offerta (§14.262): l'editor parte quando la riga è arrivata. */
export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // Lo stato porta l'id che ha caricato: cambiando pagina torna «in caricamento» senza setState nell'effetto.
  const [state, setState] = useState<{ id: string; load: LoadState } | null>(null)

  useEffect(() => {
    let cancelled = false
    getBackofficeOffer(id)
      .then((offer) => {
        if (!cancelled) setState({ id, load: { status: 'ready', offer } })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          getResponseStatus(err) === 404
            ? 'Offerta non trovata: forse è stata eliminata.'
            : getErrorMessage(err) || 'Errore nel caricamento dell’offerta.'
        setState({ id, load: { status: 'error', message } })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const load: LoadState = state?.id === id ? state.load : { status: 'loading' }

  if (load.status === 'ready') return <OfferEditor key={load.offer.id} offer={load.offer} />
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <BoBackLink href="/backoffice/offerte">Tutte le offerte</BoBackLink>
      {load.status === 'loading' ? (
        <BoMuted>Caricamento dell’offerta…</BoMuted>
      ) : (
        <DsAlert>{load.message}</DsAlert>
      )}
    </div>
  )
}
