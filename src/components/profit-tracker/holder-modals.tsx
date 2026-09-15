'use client'

import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/error-utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus, Holder } from '@/types/profit-tracker'

interface HolderCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HolderCreateModal({ open, onOpenChange }: HolderCreateModalProps) {
  const addHolder = useProfitTrackerStore((s) => s.addHolder)
  const holdersError = useProfitTrackerStore((s) => s.holdersError)

  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const handleSave = async () => {
    if (!nome.trim()) return
    await addHolder({
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      stato,
    })
    if (!holdersError) {
      setNome('')
      setDescrizione('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo collaboratore</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="holder-nome">Nome</Label>
            <Input
              id="holder-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Emanuele Bertuol"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holder-desc">Descrizione (opzionale)</Label>
            <textarea
              id="holder-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holder-stato">Stato</Label>
            <select
              id="holder-stato"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={stato}
              onChange={(e) => setStato(e.target.value as EnabledStatus)}
            >
              <option value="abilitato">Abilitato</option>
              <option value="disabilitato">Non abilitato</option>
            </select>
          </div>
          {holdersError && <p className="text-xs text-destructive">{holdersError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!nome.trim()}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface HolderEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holder: Holder | null
}

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica collaboratore</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="holder-edit-nome">Nome</Label>
            <Input
              id="holder-edit-nome"
              value={holder.nome}
              disabled
              className="cursor-default select-none bg-muted/60"
            />
            <p className="text-[11px] text-muted-foreground">
              Il nome del collaboratore non può essere modificato dopo la creazione.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holder-edit-desc">Descrizione (opzionale)</Label>
            <textarea
              id="holder-edit-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="holder-edit-stato">Stato</Label>
            <select
              id="holder-edit-stato"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={stato}
              onChange={(e) => setStato(e.target.value as EnabledStatus)}
            >
              <option value="abilitato">Abilitato</option>
              <option value="disabilitato">Non abilitato</option>
            </select>
          </div>
          {error != null && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
