'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { getErrorMessage } from '@/lib/error-utils'
import { VISIBILITY_LABELS, expiryLabel } from '@/lib/offer-editor'
import { OFFER_TYPES } from '@/lib/offers-content'
import {
  deleteBackofficeOffer,
  getBackofficeOffers,
  setBackofficeOfferVisibility,
} from '@/services/api/backoffice-offers-client'
import type { OfferAdmin, OfferType, OfferVisibility } from '@/types/offers'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { VisibilityBadge } from '@/components/backoffice/offers/offer-editor'

const dateTime = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const typeLabel = (type: OfferType) => OFFER_TYPES.find((t) => t.value === type)?.label ?? type

// Le offerte e le loro guide (§14.262): tutte, qualunque visibilità, filtrabili per tipo e
// visibilità. Si scrivono nell'editor; da qui si pubblicano, nascondono o eliminano.
export default function BackofficeOffersPage() {
  const [offers, setOffers] = useState<OfferAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'all' | OfferType>('all')
  const [visibility, setVisibility] = useState<'all' | OfferVisibility>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOffers(await getBackofficeOffers())
    } catch {
      setError('Errore nel caricamento delle offerte.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changeVisibility = async (offer: OfferAdmin, next: OfferVisibility) => {
    setError(null)
    try {
      const updated = await setBackofficeOfferVisibility(offer.id, next)
      setOffers((list) => list.map((o) => (o.id === updated.id ? updated : o)))
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel cambio di visibilità.')
    }
  }

  const remove = async (offer: OfferAdmin) => {
    if (!confirm(`Eliminare «${offer.title}» (${offer.bookmakerName})? Non si può annullare.`))
      return
    setError(null)
    try {
      await deleteBackofficeOffer(offer.id)
      setOffers((list) => list.filter((o) => o.id !== offer.id))
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nella cancellazione.')
    }
  }

  const shown = offers.filter(
    (o) =>
      (type === 'all' || o.type === type) && (visibility === 'all' || o.visibility === visibility),
  )
  const selectClass =
    'h-9 rounded-md border border-border bg-surface-1 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20'

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Offerte</h2>
          <p className="text-sm text-muted-foreground">
            Le offerte e le loro guide. Le nuove nascono bozze; sul sito vanno solo le pubblicate.
          </p>
        </div>
        <Button asChild>
          <Link href="/backoffice/offerte/nuova">Nuova offerta</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as 'all' | OfferType)}
          className={selectClass}
        >
          <option value="all">Tutti i tipi</option>
          {OFFER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Visibilità"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'all' | OfferVisibility)}
          className={selectClass}
        >
          <option value="all">Tutte le visibilità</option>
          {(Object.keys(VISIBILITY_LABELS) as OfferVisibility[]).map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-muted-foreground">
          {shown.length} di {offers.length}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Offerta</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Visibilità</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Stato</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Guida</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Aggiornata</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  {offers.length === 0
                    ? 'Nessuna offerta: creane una con «Nuova offerta».'
                    : 'Nessuna offerta con questi filtri.'}
                </td>
              </tr>
            ) : (
              shown.map((offer) => (
                <tr
                  key={offer.id}
                  className="border-t border-border transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/backoffice/offerte/${offer.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {offer.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {offer.bookmakerName} · <span className="font-mono">{offer.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {typeLabel(offer.type)}
                    {offer.groupLabel && (
                      <span className="text-muted-foreground"> · {offer.groupLabel}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <VisibilityBadge visibility={offer.visibility} />
                  </td>
                  <td className="px-4 py-2 text-foreground">{expiryLabel(offer)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {offer.guide ? `${offer.guide.steps.length} passi` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {dateTime.format(new Date(offer.updatedAt))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/backoffice/offerte/${offer.id}`}>Modifica</Link>
                      </Button>
                      {offer.visibility === 'published' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void changeVisibility(offer, 'hidden')}
                        >
                          Nascondi
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => void changeVisibility(offer, 'published')}
                        >
                          Pubblica
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => void remove(offer)}>
                        Elimina
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}
