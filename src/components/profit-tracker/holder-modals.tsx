'use client'

import { useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { STATO_OPTIONS } from '@/components/profit-tracker/account-create-modal'
import {
  DsModal,
  FieldError,
  GReadOnly,
  GSelect,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { getErrorMessage } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus, Holder } from '@/types/profit-tracker'

interface HolderCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * «Nuovo collaboratore» sul design OddWise (§14.350): nome e descrizione. Il backend crea il
 * collaboratore abilitato (lo stato si cambia da Modifica), quindi la modale non lo chiede più:
 * prima la tendina c'era ma il valore non partiva. Se il nome esiste già l'errore resta qui.
 */
export function HolderCreateModal({ open, onOpenChange }: HolderCreateModalProps) {
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo collaboratore">
      {open && <HolderCreateForm onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono vuoti a ogni apertura. */
function HolderCreateForm({ onClose }: { onClose: () => void }) {
  const addHolder = useProfitTrackerStore((s) => s.addHolder)

  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nome.trim() !== '' && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    await addHolder({
      nome: nome.trim(),
      descrizione: descrizione.trim() || undefined,
      stato: 'abilitato',
    })
    // Lo store non lancia: segnala l'errore nello stato. Lo si porta nella modale e lo si toglie
    // dallo store, che lo userebbe anche come errore di caricamento dell'elenco.
    const failed = useProfitTrackerStore.getState().holdersError
    setSaving(false)
    if (failed) {
      useProfitTrackerStore.setState({ holdersError: undefined })
      setError(failed)
      return
    }
    onClose()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <GTextField
          id="holder-nome"
          label="Nome"
          placeholder="Es. Mario Rossi"
          value={nome}
          onChange={setNome}
          onEnter={() => void handleSave()}
        />
        <GTextArea
          id="holder-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {error && <FieldError id="holder-create-error">{error}</FieldError>}
      </div>
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
          onClick={() => void handleSave()}
          disabled={!canSave}
          className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
        >
          {saving ? 'Salvataggio…' : 'Salva il collaboratore'}
        </button>
      </div>
    </>
  )
}

interface HolderEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holder: Holder | null
}

/** «Modifica collaboratore» sul design OddWise (§14.350): stato e descrizione; il nome resta. */
export function HolderEditModal({ open, onOpenChange, holder }: HolderEditModalProps) {
  const updateHolder = useProfitTrackerStore((s) => s.updateHolder)

  // Lo stato parte dal collaboratore scelto: la pagina monta la modale con key = id.
  const [descrizione, setDescrizione] = useState(holder?.descrizione ?? '')
  const [stato, setStato] = useState<EnabledStatus>(holder?.stato ?? 'abilitato')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!holder) return null

  const hasChanges = stato !== holder.stato || descrizione.trim() !== (holder.descrizione ?? '')

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && isSaving) return
    onOpenChange(nextOpen)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await updateHolder(holder.id, {
        descrizione: descrizione.trim() || null,
        stato,
      })
      onOpenChange(false)
    } catch (e) {
      setError(getErrorMessage(e) || 'Errore nel salvataggio del collaboratore')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DsModal
      open={open}
      onOpenChange={handleClose}
      title="Modifica collaboratore"
      footer={
        <>
          <button
            type="button"
            onClick={() => handleClose(false)}
            disabled={isSaving}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {isSaving ? 'Salvataggio…' : 'Salva le modifiche'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GReadOnly label="Nome" hint="Il nome del collaboratore non si cambia dopo la creazione.">
          {holder.nome}
        </GReadOnly>
        <GSelect
          id="holder-edit-stato"
          label="Stato"
          options={STATO_OPTIONS}
          value={stato}
          onChange={(v) => setStato(v as EnabledStatus)}
        />
        <GTextArea
          id="holder-edit-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {error && <FieldError id="holder-edit-error">{error}</FieldError>}
      </div>
    </DsModal>
  )
}
