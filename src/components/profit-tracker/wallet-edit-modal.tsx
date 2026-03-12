'use client'

import { useState, useEffect } from 'react'

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
import { updateWallet as apiUpdateWallet } from '@/services/api/profit-tracker-client'
import type { EnabledStatus, Wallet } from '@/types/profit-tracker'

interface WalletEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
}

export function WalletEditModal({ open, onOpenChange, wallet }: WalletEditModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)

  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const holderName =
    wallet != null ? (holders.find((h) => h.id === wallet.holderId)?.nome ?? '—') : ''

  useEffect(() => {
    if (open && wallet) {
      setDescrizione(wallet.descrizione ?? '')
      setStato(wallet.stato)
      setError(null)
    }
  }, [open, wallet])

  const handleSave = async () => {
    if (!wallet) return
    setSaving(true)
    setError(null)
    try {
      const updated = await apiUpdateWallet(wallet.id, {
        descrizione: descrizione.trim() || null,
        stato,
      })
      updateWallet(wallet.id, {
        descrizione: updated.descrizione ?? undefined,
        stato: updated.stato,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Wallet: {wallet?.nome ?? ''}</DialogTitle>
        </DialogHeader>
        {wallet == null ? (
          <div className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Nessun wallet selezionato.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-4 pt-0 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="wallet-edit-holder">Intestatario</Label>
                <Input
                  id="wallet-edit-holder"
                  value={holderName}
                  readOnly
                  className="h-9 bg-muted/50 read-only:cursor-default"
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-edit-nome">Nome</Label>
                <Input
                  id="wallet-edit-nome"
                  value={wallet.nome}
                  readOnly
                  className="h-9 bg-muted/50 read-only:cursor-default"
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-edit-desc">Descrizione</Label>
                <textarea
                  id="wallet-edit-desc"
                  className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  placeholder="Opzionale"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-edit-stato">Stato</Label>
                <select
                  id="wallet-edit-stato"
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
              <Button variant="outline" type="button" onClick={handleClose} disabled={saving}>
                Chiudi
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
