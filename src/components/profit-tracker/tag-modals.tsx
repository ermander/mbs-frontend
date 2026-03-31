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
import type { Tag } from '@/types/profit-tracker'

const TAG_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

interface TagCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagCreateModal({ open, onOpenChange }: TagCreateModalProps) {
  const addTag = useProfitTrackerStore((s) => s.addTag)
  const tagsError = useProfitTrackerStore((s) => s.tagsError)

  const [nome, setNome] = useState('')
  const [colore, setColore] = useState(TAG_COLORS[0])

  const handleSave = async () => {
    if (!nome.trim()) return
    await addTag({ nome: nome.trim(), colore })
    if (!tagsError) {
      setNome('')
      setColore(TAG_COLORS[0])
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="tag-nome">Nome</Label>
            <Input
              id="tag-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Matched Betting, Value Bet..."
            />
            {tagsError && <p className="text-xs text-destructive">{tagsError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Colore</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: colore === c ? 'white' : 'transparent',
                  }}
                  onClick={() => setColore(c)}
                  aria-label={`Colore ${c}`}
                />
              ))}
            </div>
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

interface TagEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: Tag | null
}

export function TagEditModal({ open, onOpenChange, tag }: TagEditModalProps) {
  const updateTag = useProfitTrackerStore((s) => s.updateTag)
  const tagsError = useProfitTrackerStore((s) => s.tagsError)

  const [nome, setNome] = useState(tag?.nome ?? '')
  const [colore, setColore] = useState(tag?.colore ?? TAG_COLORS[0])
  const [isSaving, setIsSaving] = useState(false)

  if (!tag) return null

  const handleSave = async () => {
    setIsSaving(true)
    await updateTag(tag.id, {
      nome: nome.trim() || undefined,
      colore,
    })
    setIsSaving(false)
    if (!tagsError) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="tag-edit-nome">Nome</Label>
            <Input id="tag-edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            {tagsError && <p className="text-xs text-destructive">{tagsError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Colore</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: colore === c ? 'white' : 'transparent',
                  }}
                  onClick={() => setColore(c)}
                  aria-label={`Colore ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !nome.trim()}>
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TagDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: Tag | null
}

export function TagDeleteModal({ open, onOpenChange, tag }: TagDeleteModalProps) {
  const deleteTag = useProfitTrackerStore((s) => s.deleteTag)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!tag) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteTag(tag.id)
    setIsDeleting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Elimina tag</DialogTitle>
        </DialogHeader>
        <div className="p-4 pt-0 text-sm text-muted-foreground">
          Sei sicuro di voler eliminare il tag{' '}
          <span className="font-medium text-foreground">&quot;{tag.nome}&quot;</span>?
          <br />
          Le giocate che lo utilizzano non verranno eliminate.
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button variant="destructive" type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
