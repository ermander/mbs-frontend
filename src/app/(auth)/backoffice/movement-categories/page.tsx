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
} from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  GCheckbox,
  GIconButton,
  GSelect,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsBadgeToggle, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import {
  getGlobalMovementCategories,
  createGlobalMovementCategory,
  updateGlobalMovementCategory,
  deleteGlobalMovementCategory,
} from '@/services/api/backoffice-movement-categories-client'
import {
  DIREZIONE_LABELS,
  NATURA_LABELS,
  NATURA_TONE,
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
  const [toDelete, setToDelete] = useState<MovementCategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Lo stato cambia solo nei callback della promise: l'effetto di montaggio chiama il fetch così
  // com'è (loading parte già a true), i salvataggi passano da loadCategories, che riaccende il
  // caricamento prima di ripartire (react-hooks/set-state-in-effect).
  const fetchCategories = useCallback(
    () =>
      getGlobalMovementCategories()
        .then((data) => setCategories(data))
        .catch(() => setError('Errore nel caricamento delle categorie.'))
        .finally(() => setLoading(false)),
    [],
  )

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    await fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
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
    setTogglingId(category.id)
    try {
      await updateGlobalMovementCategory(category.id, { attivo: !category.attivo })
      await loadCategories()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel salvataggio.')
    } finally {
      setTogglingId(null)
    }
  }

  // Elimina chiede conferma nel Modal del design (prima il confirm() del browser).
  const handleDelete = async () => {
    if (!toDelete) return
    setError(null)
    setDeleting(true)
    try {
      await deleteGlobalMovementCategory(toDelete.id)
      await loadCategories()
    } catch (err: unknown) {
      // 409 «usata da N movimenti: disattivala invece di eliminarla»: il messaggio del backend.
      setError(getErrorMessage(err) || 'Errore nella cancellazione della categoria.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <DsPageHeader
        title="Categorie movimenti"
        description="Ogni ricarica e ogni spesa di wallet porta una categoria: la natura decide in quale riga del report finisce. Una categoria in uso si disattiva, non si elimina."
        actions={
          <button type="button" onClick={openCreateForm} className={dsButtonClass('primary', 'md')}>
            <Plus className="h-5 w-5" aria-hidden />
            Nuova categoria
          </button>
        }
      />

      {error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Nome</th>
              <th className={BO_TH}>Slug</th>
              <th className={BO_TH}>Direzione</th>
              <th className={BO_TH}>Natura</th>
              <th className={cn(BO_TH, 'text-right')}>In uso</th>
              <th className={BO_TH}>Stato</th>
              <th className={cn(BO_TH, 'text-right')}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  Caricamento delle categorie…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className={BO_EMPTY_CELL}>
                  Nessuna categoria nel catalogo.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className={BO_ROW}>
                  <td className={BO_TD}>
                    <span className="font-semibold text-ds-ink">{category.nome}</span>
                    {category.descrizione && (
                      <span className="ds-body-sm block text-ds-ink-muted">
                        {category.descrizione}
                      </span>
                    )}
                  </td>
                  <td className={cn(BO_TD, 'font-mono text-xs text-ds-ink-muted')}>
                    {category.slug}
                  </td>
                  <td className={cn(BO_TD, 'whitespace-nowrap text-ds-ink')}>
                    {DIREZIONE_LABELS[category.direzione]}
                  </td>
                  <td className={BO_TD}>
                    <DsBadge tone={NATURA_TONE[category.natura]}>
                      {NATURA_LABELS[category.natura]}
                    </DsBadge>
                  </td>
                  <td className={cn(BO_TD, 'text-right text-ds-ink tabular-nums')}>
                    {category.inUso ?? 0}
                  </td>
                  <td className={BO_TD}>
                    <DsBadgeToggle
                      tone={category.attivo ? 'profit' : 'neutral'}
                      label={category.attivo ? 'Attiva' : 'Disattivata'}
                      actionLabel={
                        category.attivo ? 'Disattiva la categoria' : 'Riattiva la categoria'
                      }
                      disabled={togglingId === category.id}
                      onClick={() => void toggleAttivo(category)}
                    />
                  </td>
                  <td className={cn(BO_TD, 'text-right')}>
                    <div className="flex justify-end gap-0.5">
                      <GIconButton
                        label={`Modifica la categoria «${category.nome}»`}
                        onClick={() => openEditForm(category)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </GIconButton>
                      <GIconButton
                        label={`Elimina la categoria «${category.nome}»`}
                        danger
                        onClick={() => setToDelete(category)}
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
        title={editing ? 'Modifica categoria' : 'Nuova categoria'}
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
              form="bo-mc-form"
              disabled={saving}
              className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-60')}
            >
              {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="bo-mc-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <GTextField
            id="mc-nome"
            label="Nome"
            value={form.nome}
            onChange={(nome) => setForm((f) => ({ ...f, nome }))}
            placeholder="es. Compenso identità"
            inputProps={{ autoFocus: true }}
          />
          <GTextField
            id="mc-descrizione"
            label="Descrizione"
            optional
            value={form.descrizione}
            onChange={(descrizione) => setForm((f) => ({ ...f, descrizione }))}
          />
          <GSelect
            id="mc-direzione"
            label="Direzione"
            value={form.direzione}
            disabled={editingLocked}
            onChange={(v) => setDirezione(v as MovementCategoryDirezione)}
            options={(Object.keys(DIREZIONE_LABELS) as MovementCategoryDirezione[]).map((d) => ({
              value: d,
              label: DIREZIONE_LABELS[d],
            }))}
          />
          <GSelect
            id="mc-natura"
            label="Natura (riga del report)"
            value={form.natura}
            disabled={editingLocked}
            onChange={(v) => setForm((f) => ({ ...f, natura: v as MovementCategoryNatura }))}
            options={NATURE_BY_DIREZIONE[form.direzione].map((n) => ({
              value: n,
              label: NATURA_LABELS[n],
            }))}
          />
          {editingLocked && (
            <DsAlert tone="info" className="sm:col-span-2">
              Usata da {editing?.inUso} movimenti: direzione e natura non si cambiano, creane una
              nuova.
            </DsAlert>
          )}
          <div className="sm:col-span-2">
            <GCheckbox
              id="mc-attivo"
              label="Attiva"
              hint="Si può scegliere nelle modali delle ricariche e delle spese."
              checked={form.attivo}
              onChange={(attivo) => setForm((f) => ({ ...f, attivo }))}
            />
          </div>
          {formError && <DsAlert className="sm:col-span-2">{formError}</DsAlert>}
        </form>
      </DsModal>

      <BoConfirmModal
        open={toDelete !== null}
        title="Eliminare la categoria?"
        description={
          toDelete
            ? `«${toDelete.nome}» esce dal catalogo. Se qualche movimento la usa il backend rifiuta: va disattivata.`
            : ''
        }
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
