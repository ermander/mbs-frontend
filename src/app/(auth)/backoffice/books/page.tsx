'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Container } from '@/components/ui/container'
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

  const loadBooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getGlobalBooks()
      setBooks(data)
    } catch {
      setError('Errore nel caricamento dei bookmaker.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setFormError('Il nome è obbligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        nome: form.nome.trim(),
        descrizione: form.descrizione.trim() || undefined,
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

  const handleDelete = async (book: Book) => {
    if (!confirm(`Eliminare il bookmaker "${book.nome}"?`)) return
    try {
      await deleteGlobalBook(book.id)
      await loadBooks()
    } catch {
      setError('Errore nella cancellazione del bookmaker.')
    }
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Bookmaker globali
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestisci la lista di bookmaker disponibili per tutti gli utenti.
          </p>
        </div>
        <Button onClick={openCreateForm}>Nuovo bookmaker</Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-medium text-foreground">
            {editingBook ? 'Modifica bookmaker' : 'Nuovo bookmaker'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="es. Betfair"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalId">External ID</Label>
                <Input
                  id="externalId"
                  value={form.externalId}
                  onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                  placeholder="es. betfair"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="genericUrl">URL</Label>
                <Input
                  id="genericUrl"
                  value={form.genericUrl}
                  onChange={(e) => setForm((f) => ({ ...f, genericUrl: e.target.value }))}
                  placeholder="https://www.betfair.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Input
                  id="descrizione"
                  value={form.descrizione}
                  onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isExchange"
                  type="checkbox"
                  checked={form.isExchange}
                  onChange={(e) => setForm((f) => ({ ...f, isExchange: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="isExchange">Exchange</Label>
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvataggio...' : editingBook ? 'Salva modifiche' : 'Crea'}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Annulla
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Exchange</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">URL</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">External ID</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun bookmaker globale configurato.
                </td>
              </tr>
            ) : (
              books.map((book) => (
                <tr
                  key={book.id}
                  className="border-t border-border transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-2 font-medium text-foreground">{book.nome}</td>
                  <td className="px-4 py-2 text-foreground">{book.isExchange ? 'Sì' : 'No'}</td>
                  <td className="px-4 py-2">
                    {book.genericUrl ? (
                      <a
                        href={book.genericUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {book.genericUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {book.externalId ?? <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(book)}>
                        Modifica
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(book)}>
                        Elimina
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}
