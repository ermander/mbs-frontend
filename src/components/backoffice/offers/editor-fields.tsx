'use client'

import { useId, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** I campi dell'editor delle offerte (§14.262), sui componenti ui del backoffice. */

const controlClass =
  'w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20'

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
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
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
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        list={list?.length ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
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
        className={cn(controlClass, 'min-h-[72px] resize-y leading-relaxed')}
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
      <Input
        id={id}
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
        className={cn(controlClass, 'h-9 py-0')}
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
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      <Label htmlFor={id}>{label}</Label>
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
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Sposta su ${name}`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Sposta giù ${name}`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Togli ${name}`}
        onClick={onRemove}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  )
}
