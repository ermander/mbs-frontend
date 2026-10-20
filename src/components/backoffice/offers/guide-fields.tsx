'use client'

import { Plus } from 'lucide-react'

import {
  BLOCK_LABELS,
  BUTTON_KIND_LABELS,
  CALLOUT_TONE_LABELS,
  moveItem,
  newBlock,
  removeAt,
  replaceAt,
} from '@/lib/offer-editor'
import type {
  GuideBlock,
  GuideBlockType,
  GuideButton,
  GuideButtonKind,
  GuideCalloutTone,
  GuideStep,
  OfferGuide,
} from '@/types/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  EditorSection,
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
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            set('steps', [...guide.steps, { title: '', blocks: [newBlock('paragraph')] }])
          }
        >
          <Plus /> Aggiungi passo
        </Button>
      </EditorSection>

      <EditorSection title={`Domande frequenti (${guide.faq.length})`}>
        {guide.faq.map((item, i) => (
          <div key={i} className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Domanda {i + 1}</span>
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
        <Button
          type="button"
          variant="outline"
          onClick={() => set('faq', [...guide.faq, { question: '', answer: '' }])}
        >
          <Plus /> Aggiungi domanda
        </Button>
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
              className="min-w-[220px] flex-[2]"
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
        <Button
          type="button"
          variant="outline"
          onClick={() => setTerms({ rows: [...guide.terms.rows, { label: '', value: '' }] })}
        >
          <Plus /> Aggiungi termine
        </Button>
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
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
    <div className="space-y-4 rounded-md border border-border bg-surface-1/40 p-4">
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

      <div className="space-y-3 border-l-2 border-border pl-4">
        {step.blocks.map((block, j) => (
          <div key={j} className="space-y-3 rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <Button
              key={type}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBlocks([...step.blocks, newBlock(type)])}
            >
              <Plus /> {BLOCK_LABELS[type]}
            </Button>
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
              <Input
                aria-label={`Voce ${k + 1}`}
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...block, items: [...block.items, ''] })}
          >
            <Plus /> Voce
          </Button>
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
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Indirizzo dell'immagine"
            value={block.src}
            onChange={(src) => onChange({ ...block, src })}
            placeholder="https://… oppure /uploads/…"
            hint="Il caricamento dal backoffice arriva con la fase 4: per ora un indirizzo."
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...block,
                  buttons: [...block.buttons, { kind: 'external', label: '', href: '' }],
                })
              }
            >
              <Plus /> Pulsante
            </Button>
          )}
        </div>
      )
  }
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
