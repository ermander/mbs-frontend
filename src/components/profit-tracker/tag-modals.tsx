'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import {
  DsModal,
  FieldError,
  GTextField,
  dsDangerButtonClass,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Tag } from '@/types/profit-tracker'

/**
 * Nuovo tag, Modifica tag ed Elimina tag della pagina Impostazioni sul design OddWise (§14.361),
 * su DsModal. Stessi dieci colori e stessi salvataggi di prima; se il backend rifiuta («Esiste già
 * un tag con questo nome») l'errore resta nella modale, che non si chiude.
 */

const TAG_COLORS = [
  { value: '#6366f1', name: 'indaco' },
  { value: '#8b5cf6', name: 'viola' },
  { value: '#ec4899', name: 'rosa' },
  { value: '#ef4444', name: 'rosso' },
  { value: '#f97316', name: 'arancione' },
  { value: '#eab308', name: 'giallo' },
  { value: '#22c55e', name: 'verde' },
  { value: '#14b8a6', name: 'verde acqua' },
  { value: '#06b6d4', name: 'ciano' },
  { value: '#3b82f6', name: 'blu' },
]

/** Lo store non lancia: l'errore arriva in `tagsError`. Lo porta nella modale e lo toglie dallo store. */
function takeTagsError(): string | undefined {
  const failed = useProfitTrackerStore.getState().tagsError
  if (failed) useProfitTrackerStore.setState({ tagsError: undefined })
  return failed
}

/** I dieci colori come gruppo di scelte: pallino da 28px, la scelta con l'anello e la spunta. */
function TagColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm leading-5 font-semibold text-ds-ink">Colore</legend>
      <div role="radiogroup" aria-label="Colore del tag" className="flex flex-wrap gap-2.5">
        {TAG_COLORS.map((c) => {
          const selected = value.toLowerCase() === c.value
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Colore ${c.name}`}
              title={c.name}
              onClick={() => onChange(c.value)}
              className={cn(
                'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 text-white transition-transform hover:scale-110',
                dsFocusRing,
                selected && 'ring-2 ring-ds-ink ring-offset-2 ring-offset-ds-surface-raised',
              )}
              style={{ backgroundColor: c.value }}
            >
              {selected && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function ModalActions({
  saving,
  canSave,
  label,
  onClose,
  onSave,
}: {
  saving: boolean
  canSave: boolean
  label: string
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className={dsButtonClass('ghost', 'md')}
      >
        Annulla
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
      >
        {saving ? 'Salvataggio…' : label}
      </button>
    </div>
  )
}

interface TagCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagCreateModal({ open, onOpenChange }: TagCreateModalProps) {
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo tag">
      {open && <TagCreateForm onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

/** Montato solo a modale aperta: nome vuoto e primo colore a ogni apertura. */
function TagCreateForm({ onClose }: { onClose: () => void }) {
  const addTag = useProfitTrackerStore((s) => s.addTag)

  const [nome, setNome] = useState('')
  const [colore, setColore] = useState(TAG_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nome.trim() !== '' && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    await addTag({ nome: nome.trim(), colore })
    const failed = takeTagsError()
    setSaving(false)
    if (failed) {
      setError(failed)
      return
    }
    onClose()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <GTextField
          id="tag-nome"
          label="Nome"
          placeholder="Es. Matched Betting, Value Bet…"
          value={nome}
          onChange={setNome}
          onEnter={() => void handleSave()}
          error={error ?? undefined}
        />
        <TagColorPicker value={colore} onChange={setColore} />
      </div>
      <ModalActions
        saving={saving}
        canSave={canSave}
        label="Salva il tag"
        onClose={onClose}
        onSave={() => void handleSave()}
      />
    </>
  )
}

interface TagEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: Tag | null
}

export function TagEditModal({ open, onOpenChange, tag }: TagEditModalProps) {
  if (!tag) return null
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Modifica tag">
      {open && <TagEditForm tag={tag} onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

function TagEditForm({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const updateTag = useProfitTrackerStore((s) => s.updateTag)

  const [nome, setNome] = useState(tag.nome)
  const [colore, setColore] = useState(tag.colore || TAG_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nome.trim() !== '' && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    await updateTag(tag.id, { nome: nome.trim() || undefined, colore })
    const failed = takeTagsError()
    setSaving(false)
    if (failed) {
      setError(failed)
      return
    }
    onClose()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <GTextField
          id="tag-edit-nome"
          label="Nome"
          value={nome}
          onChange={setNome}
          onEnter={() => void handleSave()}
          error={error ?? undefined}
        />
        <TagColorPicker value={colore} onChange={setColore} />
      </div>
      <ModalActions
        saving={saving}
        canSave={canSave}
        label="Salva le modifiche"
        onClose={onClose}
        onSave={() => void handleSave()}
      />
    </>
  )
}

interface TagDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: Tag | null
}

/** La conferma prima di eliminare il tag: le giocate che lo usano restano. */
export function TagDeleteModal({ open, onOpenChange, tag }: TagDeleteModalProps) {
  if (!tag) return null
  return (
    <DsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminare il tag?"
      description={
        <>
          Il tag <b className="font-semibold text-ds-ink">«{tag.nome}»</b> sparisce dall’elenco. Le
          giocate che lo usano non vengono eliminate.
        </>
      }
    >
      {open && <TagDeleteActions tag={tag} onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

function TagDeleteActions({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const deleteTag = useProfitTrackerStore((s) => s.deleteTag)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    await deleteTag(tag.id)
    const failed = takeTagsError()
    setDeleting(false)
    if (failed) {
      setError(failed)
      return
    }
    onClose()
  }

  return (
    <>
      {error && <FieldError id="tag-delete-error">{error}</FieldError>}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className={dsButtonClass('ghost', 'md')}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className={cn(dsDangerButtonClass('md'), 'disabled:opacity-50')}
        >
          {deleting ? 'Eliminazione…' : 'Elimina il tag'}
        </button>
      </div>
    </>
  )
}
