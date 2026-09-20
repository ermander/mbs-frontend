'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Container } from '@/components/ui/container'
import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import {
  getGlobalMovementCategories,
  createGlobalMovementCategory,
  updateGlobalMovementCategory,
  deleteGlobalMovementCategory,
} from '@/services/api/backoffice-movement-categories-client'
import {
  DIREZIONE_LABELS,
  NATURA_BADGE_CLASS,
  NATURA_LABELS,
} from '@/lib/profit-tracker/movement-categories'
import type {
  MovementCategory,
  MovementCategoryDirezione,
  MovementCategoryNatura,
} from '@/types/profit-tracker'

interface CategoryFormData {
  nome: string
  descrizione: string
  direzione: MovementCategoryDirezione
  natura: MovementCategoryNatura
  attivo: boolean
}

const emptyForm: CategoryFormData = {
  nome: '',
  descrizione: '',
  direzione: 'uscita',
  natura: 'costo_attivita',
  attivo: true,
}

const NATURE_BY_DIREZIONE: Record<MovementCategoryDirezione, MovementCategoryNatura[]> = {
  entrata: ['reddito', 'capitale'],
  uscita: ['costo_attivita', 'spesa_personale', 'capitale'],
}

// Catalogo delle categorie dei movimenti di wallet (§14.111): ogni ricarica e ogni spesa
// ne porta una, e la natura decide la riga del report. Una categoria in uso non si
// elimina e non cambia direzione o natura: si disattiva o se ne crea una nuova.
export default function BackofficeMovementCategoriesPage() {
  const [categories, setCategories] = useState<MovementCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MovementCategory | null>(null)
  const [form, setForm] = useState<CategoryFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCategories(await getGlobalMovementCategories())
    } catch {
      setError('Errore nel caricamento delle categorie.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const openCreateForm = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEditForm = (category: MovementCategory) => {
    setEditing(category)
    setForm({
      nome: category.nome,
      descrizione: category.descrizione ?? '',
      direzione: category.direzione,
      natura: category.natura,
      attivo: category.attivo,
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const setDirezione = (direzione: MovementCategoryDirezione) =>
    setForm((f) => ({
      ...f,
      direzione,
      natura: NATURE_BY_DIREZIONE[direzione].includes(f.natura)
        ? f.natura
        : NATURE_BY_DIREZIONE[direzione][0],
    }))

  const editingLocked = Boolean(editing && (editing.inUso ?? 0) > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setFormError('Il nome è obbligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updateGlobalMovementCategory(editing.id, {
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          attivo: form.attivo,
          // Direzione e natura viaggiano solo se la categoria non è in uso (il backend le rifiuta comunque).
          ...(editingLocked ? {} : { direzione: form.direzione, natura: form.natura }),
        })
      } else {
        await createGlobalMovementCategory({
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          direzione: form.direzione,
          natura: form.natura,
          attivo: form.attivo,
        })
      }
      closeForm()
      await loadCategories()
    } catch (err: unknown) {
      if (getResponseStatus(err) === 409) {
        setFormError(getErrorMessage(err) || 'Esiste già una categoria con questo nome.')
      } else {
        setFormError(getErrorMessage(err) || 'Errore nel salvataggio.')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleAttivo = async (category: MovementCategory) => {
    setError(null)
    try {
      await updateGlobalMovementCategory(category.id, { attivo: !category.attivo })
      await loadCategories()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel salvataggio.')
    }
  }

  const handleDelete = async (category: MovementCategory) => {
    if (!confirm(`Eliminare la categoria "${category.nome}"?`)) return
    setError(null)
    try {
      await deleteGlobalMovementCategory(category.id)
      await loadCategories()
    } catch (err: unknown) {
      // 409 «usata da N movimenti: disattivala invece di eliminarla»: il messaggio del backend.
      setError(getErrorMessage(err) || 'Errore nella cancellazione della categoria.')
    }
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Categorie movimenti
          </h2>
          <p className="text-sm text-muted-foreground">
            Ogni ricarica e ogni spesa di wallet porta una categoria: la natura decide in quale riga
            del report finisce. Una categoria in uso si disattiva, non si elimina.
          </p>
        </div>
        <Button onClick={openCreateForm}>Nuova categoria</Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-medium text-foreground">
            {editing ? 'Modifica categoria' : 'Nuova categoria'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mc-nome">Nome *</Label>
                <Input
                  id="mc-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="es. Compenso identità"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-descrizione">Descrizione</Label>
                <Input
                  id="mc-descrizione"
                  value={form.descrizione}
                  onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-direzione">Direzione</Label>
                <select
                  id="mc-direzione"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                  value={form.direzione}
                  disabled={editingLocked}
                  onChange={(e) => setDirezione(e.target.value as MovementCategoryDirezione)}
                >
                  {(Object.keys(DIREZIONE_LABELS) as MovementCategoryDirezione[]).map((d) => (
                    <option key={d} value={d}>
                      {DIREZIONE_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-natura">Natura (riga del report)</Label>
                <select
                  id="mc-natura"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                  value={form.natura}
                  disabled={editingLocked}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, natura: e.target.value as MovementCategoryNatura }))
                  }
                >
                  {NATURE_BY_DIREZIONE[form.direzione].map((n) => (
                    <option key={n} value={n}>
                      {NATURA_LABELS[n]}
                    </option>
                  ))}
                </select>
                {editingLocked && (
                  <p className="text-[11px] text-muted-foreground">
                    Usata da {editing?.inUso} movimenti: direzione e natura non si cambiano, creane
                    una nuova.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="mc-attivo"
                  type="checkbox"
                  checked={form.attivo}
                  onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="mc-attivo">Attiva (si può scegliere nelle modali)</Label>
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea'}
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
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Direzione</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Natura</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">In uso</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Attiva</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Nessuna categoria nel catalogo.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-t border-border transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-2 font-medium text-foreground">
                    {category.nome}
                    {category.descrizione && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {category.descrizione}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {category.slug}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">
                    {DIREZIONE_LABELS[category.direzione]}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${NATURA_BADGE_CLASS[category.natura]}`}
                    >
                      {NATURA_LABELS[category.natura]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                    {category.inUso ?? 0}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleAttivo(category)}
                      className={
                        'rounded-pill border px-2 py-0.5 text-[11px] font-medium ' +
                        (category.attivo
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                          : 'border-border bg-muted text-muted-foreground')
                      }
                      title={category.attivo ? 'Clicca per disattivare' : 'Clicca per riattivare'}
                    >
                      {category.attivo ? 'Attiva' : 'Disattivata'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(category)}>
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDelete(category)}
                      >
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
