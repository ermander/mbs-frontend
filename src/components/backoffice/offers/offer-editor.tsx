'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { bookmakerSlugsWithLogo } from '@/lib/bookmakers'
import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import {
  GROUP_SUGGESTIONS,
  OVERRIDE_LABELS,
  VISIBILITY_LABELS,
  cleanInput,
  defaultBookmakerName,
  emptyGuide,
  emptyInput,
  expiryLabel,
  inputFromAdmin,
  previewOffer,
  romeToday,
  suggestedSlug,
  validateInput,
} from '@/lib/offer-editor'
import { OFFER_TYPES } from '@/lib/offers-content'
import { cn } from '@/lib/utils'
import {
  createBackofficeOffer,
  setBackofficeOfferVisibility,
  updateBackofficeOffer,
  validationErrorsOf,
} from '@/services/api/backoffice-offers-client'
import type {
  ExpiryOverride,
  OfferAdmin,
  OfferDifficulty,
  OfferInput,
  OfferType,
  OfferVisibility,
} from '@/types/offers'
import { BoBackLink } from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { OfferDetail } from '@/components/offers/offer-detail'
import { DsSegmented } from '@/components/profit-tracker/tracker-ds'
import {
  CheckboxField,
  EditorSection,
  NumberField,
  SelectField,
  TextField,
} from '@/components/backoffice/offers/editor-fields'
import { GuideFields } from '@/components/backoffice/offers/guide-fields'

/**
 * L'editor di un'offerta nel backoffice (§14.262): la carta dell'elenco, la scadenza e la guida
 * a passi e blocchi, con l'anteprima resa dallo stesso componente della pagina pubblica. Senza
 * `offer` crea una bozza nuova e poi passa alla sua pagina. Pubblicare salva prima le modifiche,
 * così sul sito va sempre quello che si vede qui. Dal §14.365 sul design OddWise: barra in alto su
 * surface, vista Modifica/Anteprima nel Segmented, pulsanti e badge del design.
 */

const VISIBILITY_TONE: Record<OfferVisibility, DsBadgeTone> = {
  draft: 'neutral',
  published: 'profit',
  hidden: 'warning',
}

export function VisibilityBadge({ visibility }: { visibility: OfferVisibility }) {
  return <DsBadge tone={VISIBILITY_TONE[visibility]}>{VISIBILITY_LABELS[visibility]}</DsBadge>
}

const BOOKMAKER_SLUGS = bookmakerSlugsWithLogo()

export function OfferEditor({ offer }: { offer?: OfferAdmin }) {
  const router = useRouter()
  const [saved, setSaved] = useState<OfferAdmin | null>(offer ?? null)
  const [input, setInput] = useState<OfferInput>(() =>
    offer ? inputFromAdmin(offer) : emptyInput(),
  )
  const [baseline, setBaseline] = useState(() => JSON.stringify(input))
  // Su un'offerta nuova lo slug segue sito e titolo finché non lo si scrive a mano.
  const [slugTouched, setSlugTouched] = useState(Boolean(offer))
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [previewDay, setPreviewDay] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const errorsRef = useRef<HTMLDivElement>(null)

  const dirty = JSON.stringify(input) !== baseline

  // Il salvataggio parte dalla barra in alto anche a metà pagina: gli errori vanno portati in vista.
  useEffect(() => {
    if (errors.length > 0)
      errorsRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errors])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (patch: Partial<OfferInput>) => {
    setNotice(null)
    setInput((current) => {
      const next = { ...current, ...patch }
      if (!slugTouched && ('title' in patch || 'bookmakerSlug' in patch)) {
        next.slug = suggestedSlug(next.bookmakerSlug, next.title)
      }
      return next
    })
  }

  const setBookmakerSlug = (slug: string) => {
    const previousDefault = defaultBookmakerName(input.bookmakerSlug)
    const keepName = input.bookmakerName && input.bookmakerName !== previousDefault
    update({
      bookmakerSlug: slug,
      ...(keepName ? {} : { bookmakerName: defaultBookmakerName(slug.trim().toLowerCase()) }),
    })
  }

  /**
   * Salva e restituisce l'offerta salvata, o null se qualcosa non va (gli errori sono a schermo).
   * Un'offerta nuova passa alla sua pagina; chi pubblica subito dopo lo fa da sé a fine giro, così
   * la pagina nuova non legge l'offerta prima della pubblicazione.
   */
  const save = async ({ redirect = true } = {}): Promise<OfferAdmin | null> => {
    const clean = cleanInput(input)
    const found = validateInput(clean)
    setErrors(found)
    setNotice(null)
    if (found.length > 0) return null
    setBusy(true)
    try {
      const result = saved
        ? await updateBackofficeOffer(saved.id, clean)
        : await createBackofficeOffer(clean)
      const next = inputFromAdmin(result)
      setSaved(result)
      setInput(next)
      setBaseline(JSON.stringify(next))
      setSlugTouched(true)
      if (!saved && redirect) router.replace(`/backoffice/offerte/${result.id}`)
      return result
    } catch (err: unknown) {
      const status = getResponseStatus(err)
      if (status === 409) setErrors(['Esiste già un’offerta con questo slug: cambialo.'])
      else if (status === 400 && validationErrorsOf(err).length > 0) {
        setErrors(validationErrorsOf(err))
      } else setErrors([getErrorMessage(err) || 'Errore nel salvataggio.'])
      return null
    } finally {
      setBusy(false)
    }
  }

  const changeVisibility = async (visibility: OfferVisibility) => {
    const isNew = !saved
    const current = dirty || isNew ? await save({ redirect: false }) : saved
    if (!current) return
    setBusy(true)
    try {
      const result = await setBackofficeOfferVisibility(current.id, visibility)
      setSaved(result)
      if (isNew) {
        router.replace(`/backoffice/offerte/${result.id}`)
        return
      }
      setNotice(
        visibility === 'published'
          ? 'Pubblicata.'
          : visibility === 'hidden'
            ? 'Nascosta: non è più sul sito.'
            : 'Riportata in bozza.',
      )
    } catch (err: unknown) {
      setErrors([getErrorMessage(err) || 'Errore nel cambio di visibilità.'])
    } finally {
      setBusy(false)
    }
  }

  const visibility = saved?.visibility ?? 'draft'
  const groupSuggestions = GROUP_SUGGESTIONS[input.type]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col pb-24">
      <BoBackLink href="/backoffice/offerte">Tutte le offerte</BoBackLink>

      <div className="sticky top-(--topnav-h) z-20 -mx-4 mt-3 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ds-line bg-ds-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ds-heading m-0 truncate">{input.title || 'Nuova offerta'}</h1>
            <VisibilityBadge visibility={visibility} />
            {saved && <span className="ds-caption text-ds-ink-muted">{expiryLabel(saved)}</span>}
          </div>
          <p className="ds-caption m-0 text-ds-ink-muted">
            {dirty ? 'Modifiche non salvate' : saved ? 'Tutto salvato' : 'Non ancora salvata'}
            {notice && <span className="ml-2 font-semibold text-ds-profit">{notice}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DsSegmented
            label="Vista"
            value={view}
            onChange={(v) => {
              // «Oggi» si legge qui, al clic, e non durante il rendering.
              if (v === 'preview') setPreviewDay(romeToday())
              setView(v)
            }}
            items={[
              { value: 'edit', label: 'Modifica' },
              { value: 'preview', label: 'Anteprima' },
            ]}
          />
          <button
            type="button"
            disabled={busy || (!dirty && Boolean(saved))}
            onClick={() => void save()}
            className={cn(dsButtonClass('secondary', 'md'), 'disabled:opacity-50')}
          >
            {busy ? 'Salvataggio…' : 'Salva'}
          </button>
          {visibility !== 'published' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void changeVisibility('published')}
              className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-60')}
            >
              {dirty || !saved ? 'Salva e pubblica' : 'Pubblica'}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void changeVisibility('hidden')}
              className={cn(dsButtonClass('secondary', 'md'), 'disabled:opacity-50')}
            >
              Nascondi
            </button>
          )}
          {visibility === 'hidden' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void changeVisibility('draft')}
              className={cn(dsButtonClass('ghost', 'md'), 'disabled:opacity-50')}
            >
              Riporta in bozza
            </button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div
          ref={errorsRef}
          role="alert"
          className="mb-6 rounded-ds-md border border-ds-loss/30 bg-ds-loss-soft px-4 py-3 text-ds-loss"
        >
          <p className="m-0 mb-1 text-sm font-semibold">Da sistemare prima di salvare:</p>
          <ul className="m-0 space-y-1 list-disc pl-5 text-sm">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {view === 'preview' && previewDay ? (
        <div className="overflow-hidden rounded-ds-lg border border-ds-line bg-ds-surface shadow-ds-sm">
          <OfferDetail
            offer={previewOffer(input, previewDay)}
            guide={input.guide}
            updatedOn={previewDay}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <EditorSection
            title="Carta dell'elenco"
            hint="Quello che si vede nell'elenco delle offerte e in testa alla pagina."
          >
            <TextField
              label="Titolo *"
              value={input.title}
              onChange={(title) => update({ title })}
              placeholder="Deposita 60 €, ricevi 30 € di bonus"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Sito di scommesse (logo) *"
                value={input.bookmakerSlug}
                onChange={setBookmakerSlug}
                list={BOOKMAKER_SLUGS}
                hint="Lo slug del logo, es. snai, bet365, williamhill. Senza logo compare il nome."
              />
              <TextField
                label="Nome del sito *"
                value={input.bookmakerName}
                onChange={(bookmakerName) => update({ bookmakerName })}
                placeholder="Snai"
              />
              <SelectField<OfferType>
                label="Tipo"
                value={input.type}
                onChange={(type) => update({ type })}
                options={OFFER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
              <TextField
                label="Gruppo"
                value={input.groupLabel ?? ''}
                onChange={(groupLabel) => update({ groupLabel })}
                list={groupSuggestions}
                hint={
                  input.type === 'esclusive'
                    ? 'Le esclusive stanno in una sezione sola: di solito si lascia vuoto.'
                    : 'La sezione dell’elenco: scegli un suggerimento o scrivine uno nuovo.'
                }
              />
              <NumberField
                label="Profitto stimato (€)"
                value={input.profit}
                onChange={(profit) => update({ profit })}
                hint="Vuoto = «Variabile»."
              />
              <SelectField<OfferDifficulty>
                label="Difficoltà"
                value={input.difficulty}
                onChange={(difficulty) => update({ difficulty })}
                options={(['Facile', 'Media', 'Difficile'] as const).map((d) => ({
                  value: d,
                  label: d,
                }))}
              />
              <NumberField
                label="Ordine nella sezione"
                value={input.sortOrder}
                onChange={(sortOrder) => update({ sortOrder: sortOrder ?? 0 })}
                hint="Più basso = più in alto."
                integer
              />
              <TextField
                label="Slug *"
                value={input.slug}
                onChange={(slug) => {
                  setSlugTouched(true)
                  update({ slug })
                }}
                hint={
                  visibility === 'published'
                    ? 'È l’indirizzo /offerte/slug: cambiarlo su un’offerta pubblicata rompe i link già condivisi.'
                    : 'L’indirizzo della pagina: /offerte/slug.'
                }
              />
            </div>
            <CheckboxField
              label="Badge «Nuova»"
              checked={input.isNew}
              onChange={(isNew) => update({ isNew })}
            />
          </EditorSection>

          <EditorSection
            title="Scadenza"
            hint="Dal giorno dopo la data l'offerta passa fra le «Scadute» da sola (ora italiana). La forzatura vince sulla data."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Ultimo giorno valido"
                type="date"
                value={input.expiresOn ?? ''}
                onChange={(expiresOn) => update({ expiresOn: expiresOn || null })}
              />
              <SelectField<'auto' | ExpiryOverride>
                label="Stato"
                value={input.expiryOverride ?? 'auto'}
                onChange={(v) => update({ expiryOverride: v === 'auto' ? null : v })}
                options={(['auto', 'active', 'expired'] as const).map((v) => ({
                  value: v,
                  label: OVERRIDE_LABELS[v],
                }))}
              />
            </div>
          </EditorSection>

          <EditorSection
            title="Guida"
            hint="La pagina di dettaglio. Senza guida la pagina mostra la carta e «guida in preparazione»."
          >
            <CheckboxField
              label="Questa offerta ha una guida"
              checked={input.guide !== null}
              onChange={(on) => {
                if (on) update({ guide: emptyGuide() })
                else if (confirm('Togliere la guida? Il suo contenuto si perde al salvataggio.')) {
                  update({ guide: null })
                }
              }}
            />
          </EditorSection>
          {input.guide && (
            <GuideFields guide={input.guide} onChange={(guide) => update({ guide })} />
          )}
        </div>
      )}
    </div>
  )
}
