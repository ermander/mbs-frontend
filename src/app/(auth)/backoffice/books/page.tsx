'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BoConfirmModal,
  boLink,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  GCheckbox,
  GIconButton,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import {
  getGlobalBooks,
  createGlobalBook,
  updateGlobalBook,
  deleteGlobalBook,
} from '@/services/api/backoffice-books-client'
import type { Book } from '@/types/profit-tracker'

interface BookFormData {
  nome: string
  descrizione: string
  isExchange: boolean
  genericUrl: string
  externalId: string
}

const emptyForm: BookFormData = {
  nome: '',
  descrizione: '',
  isExchange: false,
  genericUrl: '',
  externalId: '',
}

export default function BackofficeBooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [form, setForm] = useState<BookFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Book | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Lo stato cambia solo nei callback della promise: l'effetto di montaggio chiama il fetch così
  // com'è (loading parte già a true), i salvataggi passano da loadBooks, che riaccende il
  // caricamento prima di ripartire (react-hooks/set-state-in-effect).
  const fetchBooks = useCallback(
    () =>
      getGlobalBooks()
        .then((data) => setBooks(data))
        .catch(() => setError('Errore nel caricamento dei bookmaker.'))
        .finally(() => setLoading(false)),
    [],
  )

  const loadBooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    await fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    void fetchBooks()
  }, [fetchBooks])

  const openCreateForm = () => {
    setEditingBook(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEditForm = (book: Book) => {
    setEditingBook(book)
    setForm({
      nome: book.nome,
      descrizione: book.descrizione ?? '',
      isExchange: book.isExchange,
      genericUrl: book.genericUrl ?? '',
      externalId: book.externalId ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingBook(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.nome.trim()) {
      setFormError('Il nome è obbligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim() || null,
        isExchange: form.isExchange,
        genericUrl: form.genericUrl.trim() || null,
        externalId: form.externalId.trim() || null,
      }
      if (editingBook) {
        await updateGlobalBook(editingBook.id, payload)
      } else {
        await createGlobalBook(payload)
      }
      closeForm()
      await loadBooks()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      const status = axiosErr.response?.status
      if (status === 409) {
        setFormError('Esiste già un bookmaker globale con questo nome.')
      } else {
        setFormError(axiosErr.response?.data?.message ?? 'Errore nel salvataggio.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Elimina chiede conferma nel Modal del design (prima il confirm() del browser).
  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteGlobalBook(toDelete.id)
      setToDelete(null)
      await loadBooks()
    } catch {
      setToDelete(null)
      setError('Errore nella cancellazione del bookmaker.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DsPageHeader
        title="Bookmaker globali"
        description="La lista dei bookmaker disponibili per tutti gli utenti."
        actions={
          <button type="button" onClick={openCreateForm} className={dsButtonClass('primary', 'md')}>
            <Plus className="h-5 w-5" aria-hidden />
            Nuovo bookmaker
          </button>
        }
      />

      {error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Nome</th>
              <th className={BO_TH}>Tipo</th>
              <th className={BO_TH}>URL</th>
              <th className={BO_TH}>External ID</th>
              <th className={cn(BO_TH, 'text-right')}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={BO_EMPTY_CELL}>
                  Caricamento dei bookmaker…
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={5} className={BO_EMPTY_CELL}>
                  Nessun bookmaker globale configurato.
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr key={book.id} className={BO_ROW}>
                  <td className={cn(BO_TD, 'font-semibold text-ds-ink')}>{book.nome}</td>
                  <td className={BO_TD}>
                    <DsBadge tone={book.isExchange ? 'info' : 'neutral'}>
                      {book.isExchange ? 'Exchange' : 'Bookmaker'}
                    </DsBadge>
                  </td>
                  <td className={cn(BO_TD, 'max-w-[320px] truncate')}>
                    {book.genericUrl ? (
                      <a href={book.genericUrl} target="_blank" rel="noreferrer" className={boLink}>
                        {book.genericUrl}
                      </a>
                    ) : (
                      <span className="text-ds-ink-faint">—</span>
                    )}
                  </td>
                  <td className={cn(BO_TD, 'font-mono text-xs text-ds-ink')}>
                    {book.externalId ?? <span className="text-ds-ink-faint">—</span>}
                  </td>
                  <td className={cn(BO_TD, 'text-right')}>
                    <div className="flex justify-end gap-0.5">
                      <GIconButton
                        label={`Modifica il bookmaker «${book.nome}»`}
                        onClick={() => openEditForm(book)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </GIconButton>
                      <GIconButton
                        label={`Elimina il bookmaker «${book.nome}»`}
                        danger
                        onClick={() => setToDelete(book)}
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

      <DsModal
        open={showForm}
        onOpenChange={(open) => !open && !saving && closeForm()}
        title={editingBook ? 'Modifica bookmaker' : 'Nuovo bookmaker'}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className={dsButtonClass('secondary', 'md')}
            >
              Annulla
            </button>
            <button
              type="submit"
              form="bo-book-form"
              disabled={saving}
              className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-60')}
            >
              {saving ? 'Salvataggio…' : editingBook ? 'Salva modifiche' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="bo-book-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <GTextField
            id="bo-book-nome"
            label="Nome"
            value={form.nome}
            onChange={(nome) => setForm((f) => ({ ...f, nome }))}
            placeholder="es. Betfair"
            inputProps={{ autoFocus: true }}
          />
          <GTextField
            id="bo-book-external"
            label="External ID"
            optional
            value={form.externalId}
            onChange={(externalId) => setForm((f) => ({ ...f, externalId }))}
            placeholder="es. betfair"
          />
          <GTextField
            id="bo-book-url"
            label="URL"
            optional
            value={form.genericUrl}
            onChange={(genericUrl) => setForm((f) => ({ ...f, genericUrl }))}
            placeholder="https://www.betfair.com"
            className="sm:col-span-2"
          />
          <GTextField
            id="bo-book-descrizione"
            label="Descrizione"
            optional
            value={form.descrizione}
            onChange={(descrizione) => setForm((f) => ({ ...f, descrizione }))}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <GCheckbox
              id="bo-book-exchange"
              label="È un exchange"
              hint="Spunta se su questo sito si banca, come su Betfair Exchange."
              checked={form.isExchange}
              onChange={(isExchange) => setForm((f) => ({ ...f, isExchange }))}
            />
          </div>
          {formError && <DsAlert className="sm:col-span-2">{formError}</DsAlert>}
        </form>
      </DsModal>

      <BoConfirmModal
        open={toDelete !== null}
        title="Eliminare il bookmaker?"
        description={toDelete ? `«${toDelete.nome}» sparisce dalla lista di tutti gli utenti.` : ''}
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
