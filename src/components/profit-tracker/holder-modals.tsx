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
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus, Holder } from '@/types/profit-tracker'

interface HolderCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HolderCreateModal({ open, onOpenChange }: HolderCreateModalProps) {
  const addHolder = useProfitTrackerStore((s) => s.addHolder)

  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const handleSave = () => {
    if (!nome.trim()) return
    addHolder({
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      stato,
    })
    setNome('')
    setDescrizione('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo intestatario</DialogTitle>
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

  const [nome, setNome] = useState(holder?.nome ?? '')
  const [descrizione, setDescrizione] = useState(holder?.descrizione ?? '')
  const [stato, setStato] = useState<EnabledStatus>(holder?.stato ?? 'abilitato')

  if (!holder) return null

  const handleSave = () => {
    if (!nome.trim()) return
    updateHolder(holder.id, {
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      stato,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica intestatario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="holder-edit-nome">Nome</Label>
            <Input id="holder-edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
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
