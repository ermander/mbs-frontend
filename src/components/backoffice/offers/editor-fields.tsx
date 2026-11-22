'use client'

import { useId, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import { GIconButton } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { dsFocusRing } from '@/components/landing/ds-primitives'

/**
 * I campi dell'editor delle offerte (§14.262). Dal §14.365 sul design OddWise: riquadri
 * surface-raised, etichetta a 600, campi col contorno line-strong e il fuoco in brand come il
 * TextField del design (GTextField); restano componenti propri per il datalist dei suggerimenti e
 * per il campo numerico che tiene il testo scritto.
 */

/** Il contorno dei campi del design, per input, select e textarea dell'editor. */
export const editorControlClass =
  'w-full rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-3 text-base text-ds-ink outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-ds-ink-faint focus:border-ds-brand focus:shadow-ds-focus'
const controlClass = editorControlClass

/** Un riquadro del modulo con titolo e, se serve, una riga di spiegazione. */
export function EditorSection({
  title,
  hint,
  actions,
  children,
}: {
  title: string
  hint?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={cn(DS_PANEL, 'p-5 sm:p-6')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ds-subheading m-0">{title}</h2>
          {hint && <p className="ds-body-sm m-0 mt-1 text-ds-ink-muted">{hint}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function FieldShell({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ds-ink">
        {label}
      </label>
      {children}
      {hint && <p className="m-0 text-sm leading-5 text-ds-ink-muted">{hint}</p>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  list,
  type = 'text',
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  placeholder?: string
  /** Suggerimenti (datalist): si può comunque scrivere altro. */
  list?: string[]
  type?: 'text' | 'url' | 'date'
  className?: string
}) {
  const id = useId()
  const listId = `${id}-list`
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        list={list?.length ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, 'h-10')}
      />
      {list && list.length > 0 && (
        <datalist id={listId}>
          {list.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  rows?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(controlClass, 'min-h-[72px] resize-y py-2 leading-6')}
      />
    </FieldShell>
  )
}

/**
 * Un importo in euro: si scrive con la virgola o col punto, vuoto vale null. Tiene il testo
 * scritto finché non è un numero (es. «25,» a metà), così il campo non salta sotto le dita.
 */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  integer,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  placeholder?: string
  integer?: boolean
}) {
  const id = useId()
  const [draft, setDraft] = useState(value === null ? '' : String(value).replace('.', ','))
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <input
        id={id}
        className={cn(controlClass, 'h-10 tabular-nums')}
        inputMode={integer ? 'numeric' : 'decimal'}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const text = e.target.value
          setDraft(text)
          const normalized = text.trim().replace(',', '.')
          if (normalized === '') onChange(null)
          else if (/^-?\d+([.]\d*)?$/.test(normalized)) {
            onChange(integer ? Math.trunc(Number(normalized)) : Number(normalized))
          }
        }}
      />
    </FieldShell>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  hint?: string
}) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(controlClass, 'h-10 cursor-pointer py-0')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cn('m-0 h-5 w-5 flex-none cursor-pointer accent-ds-brand', dsFocusRing)}
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-6 font-semibold text-ds-ink">
        {label}
      </label>
    </div>
  )
}

/** Su, giù, togli: i tre comandi di un elemento di una lista (passo, blocco, domanda…). */
export function ItemControls({
  name,
  index,
  count,
  onMove,
  onRemove,
}: {
  /** «il passo 2», «il blocco 1»: per le etichette dei pulsanti. */
  name: string
  index: number
  count: number
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  return (
    <div className="flex shrink-0 gap-0.5">
      <GIconButton label={`Sposta su ${name}`} disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton
        label={`Sposta giù ${name}`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label={`Togli ${name}`} danger onClick={onRemove}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )
}
