'use client'

import { useId, useRef, useState } from 'react'
import { ImageUp, Plus } from 'lucide-react'

import {
  BLOCK_LABELS,
  BUTTON_KIND_LABELS,
  CALLOUT_TONE_LABELS,
  IMAGE_TYPES,
  imageFileError,
  isSitePath,
  moveItem,
  newBlock,
  removeAt,
  replaceAt,
} from '@/lib/offer-editor'
import { getErrorMessage } from '@/lib/error-utils'
import { uploadOfferImage } from '@/services/api/backoffice-offers-client'
import type {
  GuideBlock,
  GuideBlockType,
  GuideButton,
  GuideButtonKind,
  GuideCalloutTone,
  GuideStep,
  OfferGuide,
} from '@/types/offers'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { cn } from '@/lib/utils'
import {
  EditorSection,
  editorControlClass,
  ItemControls,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/backoffice/offers/editor-fields'

/**
 * La guida nell'editor (§14.262): i campi fissi della pagina di dettaglio e i passi fatti di
 * blocchi, che si aggiungono, spostano e tolgono. Ogni modifica passa da `onChange` con la guida
 * intera: lo stato vive nell'editor, qui solo campi.
 */

const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as GuideBlockType[]
const MAX_BUTTONS = 4

const HREF_PLACEHOLDER: Record<GuideButtonKind, string> = {
  external: 'https://www.sito.it/promo',
  oddsmatcher: '/odds-scanner',
  calculator: '/calcolatori?expand=punta-banca',
  link: '/guide',
}

export function GuideFields({
  guide,
  onChange,
}: {
  guide: OfferGuide
  onChange: (guide: OfferGuide) => void
}) {
  const set = <K extends keyof OfferGuide>(key: K, value: OfferGuide[K]) =>
    onChange({ ...guide, [key]: value })
  const setFacts = (patch: Partial<OfferGuide['facts']>) =>
    set('facts', { ...guide.facts, ...patch })
  const setTerms = (patch: Partial<OfferGuide['terms']>) =>
    set('terms', { ...guide.terms, ...patch })
  const setStep = (i: number, step: GuideStep) => set('steps', replaceAt(guide.steps, i, step))

  return (
    <div className="space-y-6">
      <EditorSection
        title="Dati chiave"
        hint="Le celle sotto il titolo; quelle vuote non compaiono. Profitto e difficoltà vengono dalla carta."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Budget necessario (€)"
            value={guide.facts.budget}
            onChange={(budget) => setFacts({ budget })}
            placeholder="120"
          />
          <TextField
            label="Tempo"
            value={guide.facts.time}
            onChange={(time) => setFacts({ time })}
            placeholder="45 min, in due momenti"
          />
          <TextField
            label="Quota minima"
            value={guide.facts.minOdds}
            onChange={(minOdds) => setFacts({ minOdds })}
            placeholder="Nessuna"
          />
          <TextField
            label="Deposito entro"
            value={guide.facts.depositWithin}
            onChange={(depositWithin) => setFacts({ depositWithin })}
            placeholder="7 giorni dalla registrazione"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Pulsante di registrazione"
        hint="Il pulsante verde sotto i dati chiave; lascia vuoti i due campi per non mostrarlo. Sparisce da solo quando l'offerta scade."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Testo"
            value={guide.signup?.label ?? ''}
            onChange={(label) => set('signup', { label, url: guide.signup?.url ?? '' })}
            placeholder="Registrati su Snai"
          />
          <TextField
            label="Link"
            type="url"
            value={guide.signup?.url ?? ''}
            onChange={(url) => set('signup', { label: guide.signup?.label ?? '', url })}
            placeholder="https://www.snai.it/"
          />
        </div>
      </EditorSection>

      <EditorSection title="Introduzione" hint="Nei testi, **così** diventa grassetto.">
        <TextAreaField
          label="Introduzione"
          value={guide.intro}
          onChange={(intro) => set('intro', intro)}
          rows={4}
        />
        <TextAreaField
          label="Cosa serve"
          value={guide.requirement}
          onChange={(requirement) => set('requirement', requirement)}
          hint="Riga in grigio sotto l'introduzione, es. il conto exchange e la liquidità."
          rows={2}
        />
        <TextAreaField
          label="Avviso"
          value={guide.warning}
          onChange={(warning) => set('warning', warning)}
          hint="Riquadro giallo «Attenzione»; vuoto non compare."
          rows={2}
        />
      </EditorSection>

      <EditorSection
        title={`Passi (${guide.steps.length})`}
        hint="Ogni passo ha un titolo e una serie di blocchi, nell'ordine in cui compaiono."
      >
        {guide.steps.map((step, i) => (
          <StepFields
            key={i}
            index={i}
            count={guide.steps.length}
            step={step}
            onChange={(next) => setStep(i, next)}
            onMove={(delta) => set('steps', moveItem(guide.steps, i, delta))}
            onRemove={() => {
              if (
                step.blocks.length === 0 ||
                confirm(`Togliere il passo ${i + 1} con i suoi blocchi?`)
              ) {
                set('steps', removeAt(guide.steps, i))
              }
            }}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            set('steps', [...guide.steps, { title: '', blocks: [newBlock('paragraph')] }])
          }
          className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
        >
          <Plus className="h-4 w-4" aria-hidden /> Aggiungi passo
        </button>
      </EditorSection>

      <EditorSection title={`Domande frequenti (${guide.faq.length})`}>
        {guide.faq.map((item, i) => (
          <div key={i} className="space-y-3 rounded-ds-md border border-ds-line p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ds-ink">Domanda {i + 1}</span>
              <ItemControls
                name={`la domanda ${i + 1}`}
                index={i}
                count={guide.faq.length}
                onMove={(delta) => set('faq', moveItem(guide.faq, i, delta))}
                onRemove={() => set('faq', removeAt(guide.faq, i))}
              />
            </div>
            <TextField
              label="Domanda"
              value={item.question}
              onChange={(question) => set('faq', replaceAt(guide.faq, i, { ...item, question }))}
            />
            <TextAreaField
              label="Risposta"
              value={item.answer}
              onChange={(answer) => set('faq', replaceAt(guide.faq, i, { ...item, answer }))}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => set('faq', [...guide.faq, { question: '', answer: '' }])}
          className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
        >
          <Plus className="h-4 w-4" aria-hidden /> Aggiungi domanda
        </button>
      </EditorSection>

      <EditorSection
        title={`Termini in breve (${guide.terms.rows.length})`}
        hint="La tabella «Termini del sito di scommesse, in breve»; senza righe la sezione non compare."
      >
        {guide.terms.rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <TextField
              label="Voce"
              value={row.label}
              onChange={(label) =>
                setTerms({ rows: replaceAt(guide.terms.rows, i, { ...row, label }) })
              }
              className="min-w-[160px] flex-1"
            />
            <TextField
              label="Valore"
              value={row.value}
              onChange={(value) =>
                setTerms({ rows: replaceAt(guide.terms.rows, i, { ...row, value }) })
              }
              className="min-w-[220px] flex-2"
            />
            <ItemControls
              name={`il termine ${i + 1}`}
              index={i}
              count={guide.terms.rows.length}
              onMove={(delta) => setTerms({ rows: moveItem(guide.terms.rows, i, delta) })}
              onRemove={() => setTerms({ rows: removeAt(guide.terms.rows, i) })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTerms({ rows: [...guide.terms.rows, { label: '', value: '' }] })}
          className={dsButtonClass('secondary', 'sm')}
        >
          <Plus className="h-4 w-4" aria-hidden /> Aggiungi termine
        </button>
        <div className="grid gap-4 border-t border-ds-line pt-4 sm:grid-cols-3">
          <TextField
            label="Verificati il"
            type="date"
            value={guide.terms.verifiedOn ?? ''}
            onChange={(verifiedOn) => setTerms({ verifiedOn: verifiedOn || null })}
          />
          <TextField
            label="Link ai termini completi"
            type="url"
            value={guide.terms.url ?? ''}
            onChange={(url) => setTerms({ url })}
            placeholder="https://www.snai.it/termini"
          />
          <TextField
            label="Testo del link"
            value={guide.terms.linkLabel}
            onChange={(linkLabel) => setTerms({ linkLabel })}
            placeholder="Termini completi su snai.it"
          />
        </div>
      </EditorSection>
    </div>
  )
}

function StepFields({
  index,
  count,
  step,
  onChange,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  step: GuideStep
  onChange: (step: GuideStep) => void
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  const setBlocks = (blocks: GuideBlock[]) => onChange({ ...step, blocks })
  return (
    <div className="space-y-4 rounded-ds-md border border-ds-line bg-ds-surface-sunken/40 p-4">
      <div className="flex items-end gap-3">
        <TextField
          label={`Passo ${index + 1}: titolo`}
          value={step.title}
          onChange={(title) => onChange({ ...step, title })}
          placeholder="Registrati su Snai"
          className="flex-1"
        />
        <ItemControls
          name={`il passo ${index + 1}`}
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>

      <div className="space-y-3 border-l-2 border-ds-line pl-4">
        {step.blocks.map((block, j) => (
          <div
            key={j}
            className="space-y-3 rounded-ds-md border border-ds-line bg-ds-surface-raised p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="ds-label text-ds-ink-muted uppercase">
                {BLOCK_LABELS[block.type]}
              </span>
              <ItemControls
                name={`il blocco ${j + 1} del passo ${index + 1}`}
                index={j}
                count={step.blocks.length}
                onMove={(delta) => setBlocks(moveItem(step.blocks, j, delta))}
                onRemove={() => setBlocks(removeAt(step.blocks, j))}
              />
            </div>
            <BlockFields
              block={block}
              onChange={(next) => setBlocks(replaceAt(step.blocks, j, next))}
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setBlocks([...step.blocks, newBlock(type)])}
              className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
            >
              <Plus className="h-4 w-4" aria-hidden /> {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BlockFields({
  block,
  onChange,
}: {
  block: GuideBlock
  onChange: (block: GuideBlock) => void
}) {
  switch (block.type) {
    case 'paragraph':
      return (
        <TextAreaField
          label="Testo"
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          rows={4}
        />
      )
    case 'checklist':
      return (
        <div className="space-y-2">
          {block.items.map((item, k) => (
            <div key={k} className="flex items-center gap-2">
              <input
                aria-label={`Voce ${k + 1}`}
                className={cn(editorControlClass, 'h-10')}
                value={item}
                onChange={(e) =>
                  onChange({ ...block, items: replaceAt(block.items, k, e.target.value) })
                }
              />
              <ItemControls
                name={`la voce ${k + 1}`}
                index={k}
                count={block.items.length}
                onMove={(delta) => onChange({ ...block, items: moveItem(block.items, k, delta) })}
                onRemove={() => onChange({ ...block, items: removeAt(block.items, k) })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...block, items: [...block.items, ''] })}
            className={cn(dsButtonClass('ghost', 'sm'), 'disabled:opacity-50')}
          >
            <Plus className="h-4 w-4" aria-hidden /> Voce
          </button>
        </div>
      )
    case 'callout':
      return (
        <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
          <SelectField<GuideCalloutTone>
            label="Tipo"
            value={block.tone}
            onChange={(tone) => onChange({ ...block, tone })}
            options={(Object.keys(CALLOUT_TONE_LABELS) as GuideCalloutTone[]).map((tone) => ({
              value: tone,
              label: CALLOUT_TONE_LABELS[tone],
            }))}
          />
          <TextAreaField
            label="Testo"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
          />
        </div>
      )
    case 'image':
      return <ImageBlockFields block={block} onChange={onChange} />
    case 'buttons':
      return (
        <div className="space-y-3">
          {block.buttons.map((button, k) => (
            <ButtonFields
              key={k}
              index={k}
              count={block.buttons.length}
              button={button}
              onChange={(next) =>
                onChange({ ...block, buttons: replaceAt(block.buttons, k, next) })
              }
              onMove={(delta) => onChange({ ...block, buttons: moveItem(block.buttons, k, delta) })}
              onRemove={() => onChange({ ...block, buttons: removeAt(block.buttons, k) })}
            />
          ))}
          {block.buttons.length < MAX_BUTTONS && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...block,
                  buttons: [...block.buttons, { kind: 'external', label: '', href: '' }],
                })
              }
              className={dsButtonClass('ghost', 'sm')}
            >
              <Plus className="h-4 w-4" aria-hidden /> Pulsante
            </button>
          )}
        </div>
      )
  }
}

/**
 * Il blocco immagine (§14.264): «Carica immagine» manda il file al backend e mette nel blocco
 * l'indirizzo che torna; in alternativa si scrive un indirizzo a mano. La miniatura compare solo
 * per gli indirizzi del sito: quelli esterni la CSP li blocca anche sulla pagina pubblica.
 */
function ImageBlockFields({
  block,
  onChange,
}: {
  block: Extract<GuideBlock, { type: 'image' }>
  onChange: (block: GuideBlock) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File | undefined) => {
    if (!file) return
    const problem = imageFileError(file)
    setError(problem)
    if (problem) return
    setUploading(true)
    try {
      const src = await uploadOfferImage(file)
      onChange({ ...block, src, alt: block.alt || file.name.replace(/\.[^.]+$/, '') })
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Caricamento non riuscito.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
        >
          <ImageUp className="h-4 w-4" aria-hidden />{' '}
          {uploading ? 'Caricamento…' : block.src ? 'Sostituisci immagine' : 'Carica immagine'}
        </button>
        <span className="ds-body-sm text-ds-ink-muted">PNG, JPEG, WebP o GIF, fino a 5 MB.</span>
        {error && (
          <span role="alert" className="ds-body-sm text-ds-loss">
            {error}
          </span>
        )}
      </div>
      {block.src && isSitePath(block.src) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt=""
          className="max-h-48 w-auto max-w-full rounded-ds-sm border border-ds-line sm:col-span-2"
        />
      )}
      <TextField
        label="Indirizzo dell'immagine"
        value={block.src}
        onChange={(src) => onChange({ ...block, src })}
        placeholder="Si compila da solo col caricamento"
        hint="Un indirizzo esterno (https://…) non si vede sul sito: la CSP lo blocca. Meglio caricarla."
        className="sm:col-span-2"
      />
      <TextField
        label="Testo alternativo"
        value={block.alt}
        onChange={(alt) => onChange({ ...block, alt })}
        hint="Cosa mostra l'immagine, per chi non la vede."
      />
      <TextField
        label="Didascalia"
        value={block.caption}
        onChange={(caption) => onChange({ ...block, caption })}
      />
    </div>
  )
}

function ButtonFields({
  index,
  count,
  button,
  onChange,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  button: GuideButton
  onChange: (button: GuideButton) => void
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-[200px]">
        <SelectField<GuideButtonKind>
          label={`Pulsante ${index + 1}`}
          value={button.kind}
          onChange={(kind) => onChange({ ...button, kind })}
          options={(Object.keys(BUTTON_KIND_LABELS) as GuideButtonKind[]).map((kind) => ({
            value: kind,
            label: BUTTON_KIND_LABELS[kind],
          }))}
        />
      </div>
      <TextField
        label="Testo"
        value={button.label}
        onChange={(label) => onChange({ ...button, label })}
        className="min-w-[160px] flex-1"
      />
      <TextField
        label="Link"
        value={button.href}
        onChange={(href) => onChange({ ...button, href })}
        placeholder={HREF_PLACEHOLDER[button.kind]}
        className="min-w-[200px] flex-1"
      />
      <ItemControls
        name={`il pulsante ${index + 1}`}
        index={index}
        count={count}
        onMove={onMove}
        onRemove={onRemove}
      />
    </div>
  )
}
