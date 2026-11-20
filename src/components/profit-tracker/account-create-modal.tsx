'use client'

import { useEffect, useMemo, useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { OmBookLogo, OmDropdown, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  FieldError,
  GSelect,
  GTextArea,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus } from '@/types/profit-tracker'

interface AccountCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultHolderId?: string
}

export const STATO_OPTIONS = [
  { value: 'abilitato', label: 'Abilitato' },
  { value: 'disabilitato', label: 'Non abilitato' },
]

/**
 * «Nuovo conto» sul design OddWise (§14.350): collaboratore e book da menu con ricerca (il book
 * con il logo), descrizione e stato. Stesso salvataggio di prima; se il backend rifiuta, l'errore
 * resta nella modale invece di chiuderla.
 */
export function AccountCreateModal({
  open,
  onOpenChange,
  defaultHolderId,
}: AccountCreateModalProps) {
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)

  useEffect(() => {
    if (!open) return
    void fetchAllBooks()
  }, [open, fetchAllBooks])

  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo conto">
      {open && (
        <AccountCreateForm
          key={defaultHolderId ?? 'nessuno'}
          defaultHolderId={defaultHolderId}
          onClose={() => onOpenChange(false)}
        />
      )}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono dai valori di serie a ogni apertura. */
function AccountCreateForm({
  defaultHolderId,
  onClose,
}: {
  defaultHolderId?: string
  onClose: () => void
}) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const addAccount = useProfitTrackerStore((s) => s.addAccount)

  const [holderId, setHolderId] = useState(defaultHolderId || holders[0]?.id || '')
  const [bookId, setBookId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveHolderId = holderId || holders[0]?.id || ''
  const effectiveBookId =
    bookId && books.some((b) => b.id === bookId) ? bookId : (books[0]?.id ?? '')

  const holderOptions: OmOption[] = useMemo(
    () =>
      holders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [holders],
  )
  const bookOptions: OmOption[] = useMemo(
    () =>
      books
        .map((b) => ({
          value: b.id,
          label: b.nome,
          render: (
            <span className="flex min-w-0 items-center gap-2.5">
              <OmBookLogo slug={bookLogoSlug(b)} name={b.nome} size="sm" />
              <span className="truncate">{b.nome}</span>
            </span>
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [books],
  )

  const canSave = !!effectiveHolderId && !!effectiveBookId && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    await addAccount({
      holderId: effectiveHolderId,
      bookId: effectiveBookId,
      descrizione: descrizione.trim() || undefined,
      stato,
    })
    // Lo store non lancia: segnala l'errore nello stato.
    const failed = useProfitTrackerStore.getState().accountsError
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
        <OmDropdown
          id="acc-holder"
          label="Collaboratore"
          allLabel="Scegli un collaboratore"
          single
          floating
          alignBelow
          emptyText="Nessun collaboratore con questo nome."
          options={holderOptions}
          selected={effectiveHolderId ? [effectiveHolderId] : []}
          onChange={(next) => next[0] && setHolderId(next[0])}
          className="gap-1"
        />
        <div className="flex flex-col gap-1">
          <OmDropdown
            id="acc-book"
            label="Book"
            allLabel="Scegli un book"
            single
            floating
            alignBelow
            disabled={books.length === 0}
            emptyText="Nessun book con questo nome."
            options={bookOptions}
            selected={effectiveBookId ? [effectiveBookId] : []}
            onChange={(next) => next[0] && setBookId(next[0])}
            className="gap-1"
          />
          {books.length === 0 && (
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              Nessun book disponibile: aggiungilo da Impostazioni.
            </p>
          )}
        </div>
        <GTextArea
          id="acc-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        <GSelect
          id="acc-stato"
          label="Stato"
          options={STATO_OPTIONS}
          value={stato}
          onChange={(v) => setStato(v as EnabledStatus)}
        />
        {error && <FieldError id="acc-error">{error}</FieldError>}
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
          {saving ? 'Salvataggio…' : 'Salva il conto'}
        </button>
      </div>
    </>
  )
}
