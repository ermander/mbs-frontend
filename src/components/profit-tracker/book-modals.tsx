'use client'

import { useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  FieldError,
  GCheckbox,
  GReadOnly,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Book } from '@/types/profit-tracker'

/**
 * Nuovo book e Modifica book della pagina Impostazioni sul design OddWise (§14.361), su DsModal
 * come le modali di Gestione conti (§14.350). Campi e salvataggi come prima; se il backend
 * rifiuta («Esiste già un book con questo nome») l'errore resta nella modale, che non si chiude.
 */

const EXCHANGE_HINT = 'Spunta se su questo sito si banca, come su Betfair Exchange.'

/** Lo store non lancia: l'errore arriva in `booksError`. Lo porta nella modale e lo toglie dallo store. */
function takeBooksError(): string | undefined {
  const failed = useProfitTrackerStore.getState().booksError
  if (failed) useProfitTrackerStore.setState({ booksError: undefined })
  return failed
}

interface BookCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookCreateModal({ open, onOpenChange }: BookCreateModalProps) {
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo book personale">
      {open && <BookCreateForm onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono vuoti a ogni apertura. */
function BookCreateForm({ onClose }: { onClose: () => void }) {
  const addBook = useProfitTrackerStore((s) => s.addBook)

  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [isExchange, setIsExchange] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nome.trim() !== '' && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    await addBook({ nome: nome.trim(), descrizione: descrizione || undefined, isExchange })
    const failed = takeBooksError()
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
          id="book-nome"
          label="Nome"
          placeholder="Es. SportMarket, Pinnacle…"
          value={nome}
          onChange={setNome}
          onEnter={() => void handleSave()}
          error={error ?? undefined}
        />
        <GTextArea
          id="book-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        <GCheckbox
          id="book-exchange"
          label="È un exchange"
          hint={EXCHANGE_HINT}
          checked={isExchange}
          onChange={setIsExchange}
        />
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
          {saving ? 'Salvataggio…' : 'Salva il book'}
        </button>
      </div>
    </>
  )
}

interface BookEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: Book | null
}

/** Modifica book: descrizione ed exchange; il nome resta quello di prima. */
export function BookEditModal({ open, onOpenChange, book }: BookEditModalProps) {
  if (!book) return null
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Modifica book">
      {open && <BookEditForm book={book} onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

function BookEditForm({ book, onClose }: { book: Book; onClose: () => void }) {
  const updateBook = useProfitTrackerStore((s) => s.updateBook)

  const [descrizione, setDescrizione] = useState(book.descrizione ?? '')
  const [isExchange, setIsExchange] = useState<boolean>(book.isExchange ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    await updateBook(book.id, { descrizione: descrizione.trim() || null, isExchange })
    const failed = takeBooksError()
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
        <GReadOnly label="Nome">{book.nome}</GReadOnly>
        <GTextArea
          id="book-edit-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        <GCheckbox
          id="book-edit-exchange"
          label="È un exchange"
          hint={EXCHANGE_HINT}
          checked={isExchange}
          onChange={setIsExchange}
        />
        {error && <FieldError id="book-edit-error">{error}</FieldError>}
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
          disabled={saving}
          className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
        >
          {saving ? 'Salvataggio…' : 'Salva le modifiche'}
        </button>
      </div>
    </>
  )
}
