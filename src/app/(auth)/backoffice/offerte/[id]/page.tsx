'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'

import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import { getBackofficeOffer } from '@/services/api/backoffice-offers-client'
import type { OfferAdmin } from '@/types/offers'
import { Container } from '@/components/ui/container'
import { OfferEditor } from '@/components/backoffice/offers/offer-editor'

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
    <Container className="max-w-5xl">
      {load.status === 'loading' ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{load.message}</p>
          <Link
            href="/backoffice/offerte"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tutte le offerte
          </Link>
        </div>
      )}
    </Container>
  )
}
