'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Container } from '@/components/ui/container'
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

  const loadMethods = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMethods(await getGlobalPaymentMethods())
    } catch {
      setError('Errore nel caricamento dei metodi di pagamento.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMethods()
  }, [loadMethods])

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
    try {
      await updateGlobalPaymentMethod(method.id, { attivo: !method.attivo })
      await loadMethods()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel salvataggio.')
    }
  }

  const handleDelete = async (method: PaymentMethod) => {
    if (!confirm(`Eliminare il metodo di pagamento "${method.nome}"?`)) return
    setError(null)
    try {
      await deleteGlobalPaymentMethod(method.id)
      await loadMethods()
    } catch (err: unknown) {
      // 409 «usato da N wallet: disattivalo invece di eliminarlo»: il messaggio del backend.
      setError(getErrorMessage(err) || 'Errore nella cancellazione del metodo di pagamento.')
    }
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Metodi di pagamento
          </h2>
          <p className="text-sm text-muted-foreground">
            Il catalogo dei wallet: ogni collaboratore può aprirne uno per metodo. Un metodo usato
            da qualche wallet si disattiva, non si elimina.
          </p>
        </div>
        <Button onClick={openCreateForm}>Nuovo metodo</Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-medium text-foreground">
            {editing ? 'Modifica metodo di pagamento' : 'Nuovo metodo di pagamento'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pm-nome">Nome *</Label>
                <Input
                  id="pm-nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="es. PayPal"
                />
                {editing && (
                  <p className="text-[11px] text-muted-foreground">
                    Rinominare il metodo rinomina anche i wallet che lo usano.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-descrizione">Descrizione</Label>
                <Input
                  id="pm-descrizione"
                  value={form.descrizione}
                  onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="pm-attivo"
                  type="checkbox"
                  checked={form.attivo}
                  onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="pm-attivo">Attivo (si può aprire un wallet)</Label>
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
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrizione</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Attivo</th>
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
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nessun metodo di pagamento nel catalogo.
                </td>
              </tr>
            ) : (
              methods.map((method) => (
                <tr
                  key={method.id}
                  className="border-t border-border transition-colors hover:bg-accent"
                >
                  <td className="px-4 py-2 font-medium text-foreground">{method.nome}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {method.slug}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {method.descrizione || <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleAttivo(method)}
                      className={
                        'rounded-pill border px-2 py-0.5 text-[11px] font-medium ' +
                        (method.attivo
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                          : 'border-border bg-muted text-muted-foreground')
                      }
                      title={method.attivo ? 'Clicca per disattivare' : 'Clicca per riattivare'}
                    >
                      {method.attivo ? 'Attivo' : 'Disattivato'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(method)}>
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDelete(method)}
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
