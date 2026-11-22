'use client'

import { useEffect, useState } from 'react'
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
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoConfirmModal,
} from '@/components/backoffice/backoffice-ds'
import { VisibilityBadge } from '@/components/backoffice/offers/offer-editor'
import { DsButton, dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { GIconButton, GSelect } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'

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
  const [toDelete, setToDelete] = useState<OfferAdmin | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Lo stato cambia solo nei callback della promise; loading parte già a true
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    getBackofficeOffers()
      .then((data) => setOffers(data))
      .catch(() => setError('Errore nel caricamento delle offerte.'))
      .finally(() => setLoading(false))
  }, [])

  const changeVisibility = async (offer: OfferAdmin, next: OfferVisibility) => {
    setError(null)
    try {
      const updated = await setBackofficeOfferVisibility(offer.id, next)
      setOffers((list) => list.map((o) => (o.id === updated.id ? updated : o)))
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel cambio di visibilità.')
    }
  }

  // Elimina chiede conferma nel Modal del design (prima il confirm() del browser).
  const remove = async () => {
    if (!toDelete) return
    const offer = toDelete
    setError(null)
    setDeleting(true)
    try {
      await deleteBackofficeOffer(offer.id)
      setOffers((list) => list.filter((o) => o.id !== offer.id))
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nella cancellazione.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  const shown = offers.filter(
    (o) =>
      (type === 'all' || o.type === type) && (visibility === 'all' || o.visibility === visibility),
  )

  return (
    <>
      <DsPageHeader
        title="Offerte"
        description="Le offerte e le loro guide. Le nuove nascono bozze; sul sito vanno solo le pubblicate."
        actions={
          <DsButton href="/backoffice/offerte/nuova" variant="primary">
            <Plus className="h-5 w-5" aria-hidden />
            Nuova offerta
          </DsButton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <GSelect
          id="bo-offers-type"
          ariaLabel="Tipo"
          size="sm"
          value={type}
          onChange={(v) => setType(v as 'all' | OfferType)}
          options={[
            { value: 'all', label: 'Tutti i tipi' },
            ...OFFER_TYPES.map((t) => ({ value: t.value, label: t.label })),
          ]}
          className="w-48"
        />
        <GSelect
          id="bo-offers-visibility"
          ariaLabel="Visibilità"
          size="sm"
          value={visibility}
          onChange={(v) => setVisibility(v as 'all' | OfferVisibility)}
          options={[
            { value: 'all', label: 'Tutte le visibilità' },
            ...(Object.keys(VISIBILITY_LABELS) as OfferVisibility[]).map((v) => ({
              value: v,
              label: VISIBILITY_LABELS[v],
            })),
          ]}
          className="w-52"
        />
        <span className="ds-body-sm text-ds-ink-muted tabular-nums">
          {shown.length} di {offers.length}
        </span>
      </div>

      {error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Offerta</th>
              <th className={BO_TH}>Tipo</th>
              <th className={BO_TH}>Visibilità</th>
              <th className={BO_TH}>Stato</th>
              <th className={BO_TH}>Guida</th>
              <th className={BO_TH}>Aggiornata</th>
              <th className={cn(BO_TH, 'text-right')}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  Caricamento delle offerte…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  {offers.length === 0
                    ? 'Nessuna offerta: creane una con «Nuova offerta».'
                    : 'Nessuna offerta con questi filtri.'}
                </td>
              </tr>
            ) : (
              shown.map((offer) => (
                <tr key={offer.id} className={BO_ROW}>
                  <td className={BO_TD}>
                    <Link
                      href={`/backoffice/offerte/${offer.id}`}
                      className={cn(
                        'rounded-ds-xs font-semibold text-ds-ink underline-offset-4 hover:text-ds-brand hover:underline',
                        dsFocusRing,
                      )}
                    >
                      {offer.title}
                    </Link>
                    <div className="ds-body-sm text-ds-ink-muted">
                      {offer.bookmakerName} ·{' '}
                      <span className="font-mono text-xs">{offer.slug}</span>
                    </div>
                  </td>
                  <td className={cn(BO_TD, 'text-ds-ink')}>
                    {typeLabel(offer.type)}
                    {offer.groupLabel && (
                      <span className="text-ds-ink-muted"> · {offer.groupLabel}</span>
                    )}
                  </td>
                  <td className={BO_TD}>
                    <VisibilityBadge visibility={offer.visibility} />
                  </td>
                  <td className={cn(BO_TD, 'text-ds-ink')}>{expiryLabel(offer)}</td>
                  <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted')}>
                    {offer.guide ? `${offer.guide.steps.length} passi` : '—'}
                  </td>
                  <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink-muted tabular-nums')}>
                    {dateTime.format(new Date(offer.updatedAt))}
                  </td>
                  <td className={cn(BO_TD, 'text-right')}>
                    <div className="flex items-center justify-end gap-0.5">
                      {offer.visibility === 'published' ? (
                        <button
                          type="button"
                          onClick={() => void changeVisibility(offer, 'hidden')}
                          className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
                        >
                          <EyeOff className="h-4 w-4" aria-hidden />
                          Nascondi
                          <span className="sr-only"> «{offer.title}»</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void changeVisibility(offer, 'published')}
                          className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Pubblica
                          <span className="sr-only"> «{offer.title}»</span>
                        </button>
                      )}
                      <Link
                        href={`/backoffice/offerte/${offer.id}`}
                        aria-label={`Modifica l'offerta «${offer.title}»`}
                        title={`Modifica l'offerta «${offer.title}»`}
                        className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0')}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Link>
                      <GIconButton
                        label={`Elimina l'offerta «${offer.title}»`}
                        danger
                        onClick={() => setToDelete(offer)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </GIconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BoConfirmModal
        open={toDelete !== null}
        title="Eliminare l'offerta?"
        description={
          toDelete
            ? `«${toDelete.title}» (${toDelete.bookmakerName}) sparisce con la sua guida. Non si può annullare.`
            : ''
        }
        busy={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
