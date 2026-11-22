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
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  GCheckbox,
  GIconButton,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsBadgeToggle, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import {
  getGlobalPaymentMethods,
  createGlobalPaymentMethod,
  updateGlobalPaymentMethod,
  deleteGlobalPaymentMethod,
} from '@/services/api/backoffice-payment-methods-client'
import type { PaymentMethod } from '@/types/profit-tracker'

interface PaymentMethodFormData {
  nome: string
  descrizione: string
  attivo: boolean
}

const emptyForm: PaymentMethodFormData = { nome: '', descrizione: '', attivo: true }

// Catalogo dei metodi di pagamento (§14.109): ogni collaboratore apre un wallet per
// metodo. Un metodo usato da qualche wallet non si elimina: si disattiva.
export default function BackofficePaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [form, setForm] = useState<PaymentMethodFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<PaymentMethod | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Lo stato cambia solo nei callback della promise: l'effetto di montaggio chiama il fetch così
  // com'è (loading parte già a true), i salvataggi passano da loadMethods, che riaccende il
  // caricamento prima di ripartire (react-hooks/set-state-in-effect).
  const fetchMethods = useCallback(
    () =>
      getGlobalPaymentMethods()
        .then((data) => setMethods(data))
        .catch(() => setError('Errore nel caricamento dei metodi di pagamento.'))
        .finally(() => setLoading(false)),
    [],
  )

  const loadMethods = useCallback(async () => {
    setLoading(true)
    setError(null)
    await fetchMethods()
  }, [fetchMethods])

  useEffect(() => {
    void fetchMethods()
  }, [fetchMethods])

  const openCreateForm = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEditForm = (method: PaymentMethod) => {
    setEditing(method)
    setForm({ nome: method.nome, descrizione: method.descrizione ?? '', attivo: method.attivo })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
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
        attivo: form.attivo,
      }
      if (editing) {
        await updateGlobalPaymentMethod(editing.id, payload)
      } else {
        await createGlobalPaymentMethod(payload)
      }
      closeForm()
      await loadMethods()
    } catch (err: unknown) {
      if (getResponseStatus(err) === 409) {
        setFormError('Esiste già un metodo di pagamento con questo nome.')
      } else {
        setFormError(getErrorMessage(err) || 'Errore nel salvataggio.')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleAttivo = async (method: PaymentMethod) => {
    setError(null)
    setTogglingId(method.id)
    try {
      await updateGlobalPaymentMethod(method.id, { attivo: !method.attivo })
      await loadMethods()
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
      await deleteGlobalPaymentMethod(toDelete.id)
      await loadMethods()
    } catch (err: unknown) {
      // 409 «usato da N wallet: disattivalo invece di eliminarlo»: il messaggio del backend.
      setError(getErrorMessage(err) || 'Errore nella cancellazione del metodo di pagamento.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <DsPageHeader
        title="Metodi di pagamento"
        description="Il catalogo dei wallet: ogni collaboratore può aprirne uno per metodo. Un metodo usato da qualche wallet si disattiva, non si elimina."
        actions={
          <button type="button" onClick={openCreateForm} className={dsButtonClass('primary', 'md')}>
            <Plus className="h-5 w-5" aria-hidden />
            Nuovo metodo
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
              <th className={BO_TH}>Descrizione</th>
              <th className={BO_TH}>Stato</th>
              <th className={cn(BO_TH, 'text-right')}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={BO_EMPTY_CELL}>
                  Caricamento dei metodi di pagamento…
                </td>
              </tr>
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={5} className={BO_EMPTY_CELL}>
                  Nessun metodo di pagamento nel catalogo.
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr key={method.id} className={BO_ROW}>
                  <td className={cn(BO_TD, 'font-semibold text-ds-ink')}>{method.nome}</td>
                  <td className={cn(BO_TD, 'font-mono text-xs text-ds-ink-muted')}>
                    {method.slug}
                  </td>
                  <td className={cn(BO_TD, 'text-ds-ink')}>
                    {method.descrizione || <span className="text-ds-ink-faint">—</span>}
                  </td>
                  <td className={BO_TD}>
                    <DsBadgeToggle
                      tone={method.attivo ? 'profit' : 'neutral'}
                      label={method.attivo ? 'Attivo' : 'Disattivato'}
                      actionLabel={method.attivo ? 'Disattiva il metodo' : 'Riattiva il metodo'}
                      disabled={togglingId === method.id}
                      onClick={() => void toggleAttivo(method)}
                    />
                  </td>
                  <td className={cn(BO_TD, 'text-right')}>
                    <div className="flex justify-end gap-0.5">
                      <GIconButton
                        label={`Modifica il metodo «${method.nome}»`}
                        onClick={() => openEditForm(method)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </GIconButton>
                      <GIconButton
                        label={`Elimina il metodo «${method.nome}»`}
                        danger
                        onClick={() => setToDelete(method)}
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
        title={editing ? 'Modifica metodo di pagamento' : 'Nuovo metodo di pagamento'}
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
              form="bo-pm-form"
              disabled={saving}
              className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-60')}
            >
              {saving ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea'}
            </button>
          </>
        }
      >
        <form id="bo-pm-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <GTextField
            id="pm-nome"
            label="Nome"
            value={form.nome}
            onChange={(nome) => setForm((f) => ({ ...f, nome }))}
            placeholder="es. PayPal"
            hint={
              editing ? 'Rinominare il metodo rinomina anche i wallet che lo usano.' : undefined
            }
            inputProps={{ autoFocus: true }}
          />
          <GTextField
            id="pm-descrizione"
            label="Descrizione"
            optional
            value={form.descrizione}
            onChange={(descrizione) => setForm((f) => ({ ...f, descrizione }))}
          />
          <GCheckbox
            id="pm-attivo"
            label="Attivo"
            hint="Si può aprire un wallet con questo metodo."
            checked={form.attivo}
            onChange={(attivo) => setForm((f) => ({ ...f, attivo }))}
          />
          {formError && <DsAlert>{formError}</DsAlert>}
        </form>
      </DsModal>

      <BoConfirmModal
        open={toDelete !== null}
        title="Eliminare il metodo di pagamento?"
        description={
          toDelete
            ? `«${toDelete.nome}» esce dal catalogo. Se qualche wallet lo usa il backend rifiuta: va disattivato.`
            : ''
        }
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
