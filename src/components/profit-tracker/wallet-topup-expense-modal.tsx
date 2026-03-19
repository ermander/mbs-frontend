'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { sanitizeDecimal } from '@/lib/utils'
import type { WalletMovementType } from '@/types/profit-tracker'

interface WalletTopupExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletTopupExpenseModal({ open, onOpenChange }: WalletTopupExpenseModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSavingWalletMovement = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [holderId, setHolderId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [tipo, setTipo] = useState<WalletMovementType>('ricarica')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setHolderId('')
        setWalletId('')
        setTipo('ricarica')
        setValore('')
        setDataRegistrazione(new Date().toISOString().slice(0, 10))
        setDescrizione('')
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  const effectiveHolderId =
    holderId || (wallets.length > 0 ? wallets[0].holderId : holders.length > 0 ? holders[0].id : '')

  const holderWallets = useMemo(() => {
    if (!effectiveHolderId) return wallets
    return wallets.filter((w) => w.holderId === effectiveHolderId)
  }, [wallets, effectiveHolderId])

  const effectiveWalletId =
    holderWallets.length === 0
      ? ''
      : walletId && holderWallets.some((w) => w.id === walletId)
        ? walletId
        : (holderWallets[0]?.id ?? '')

  const holderOptions = useMemo(
    () => holders.map((h) => ({ value: h.id, label: h.nome })),
    [holders],
  )

  const handleSave = async () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (!effectiveWalletId || !Number.isFinite(importo)) return

    const success = await addWalletMovement({
      walletId: effectiveWalletId,
      tipo,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
    })

    if (success) {
      const label = tipo === 'ricarica' ? 'Ricarica' : 'Spesa'
      toast.success(`${label} registrata con successo`)
      handleOpenChange(false)
    } else {
      toast.error(
        useProfitTrackerStore.getState().walletMovementsError ||
          'Errore nel salvataggio del movimento',
      )
    }
  }

  const canSave =
    effectiveHolderId &&
    effectiveWalletId &&
    valore.trim() !== '' &&
    Number.isFinite(Number.parseFloat(valore.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {/* Portal container for SearchableSelect dropdowns inside the modal */}
        <div
          ref={setDropdownPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
        <DialogHeader>
          <DialogTitle>Nuova ricarica/spesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="topup-holder">Intestatario</Label>
            <SearchableSelect
              id="topup-holder"
              options={holderOptions}
              value={effectiveHolderId}
              onChange={setHolderId}
              allowEmpty={false}
              placeholder="Seleziona intestatario"
              searchPlaceholder="Cerca intestatario..."
              portalContainer={dropdownPortalEl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-tipo">Metodo</Label>
            <select
              id="topup-tipo"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as WalletMovementType)}
            >
              <option value="ricarica">Ricarica</option>
              <option value="spesa">Spesa</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-wallet">Wallet</Label>
            <select
              id="topup-wallet"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveWalletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              {holderWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nome} ({w.saldoAttuale.toFixed(2)} €)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-valore">Movimento (€)</Label>
            <Input
              id="topup-valore"
              type="text"
              inputMode="decimal"
              value={valore}
              onChange={(e) => setValore(sanitizeDecimal(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-data">Registrato il</Label>
            <Input
              id="topup-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-desc">Descrizione (opzionale)</Label>
            <textarea
              id="topup-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          {walletMovementsError && (
            <p className="text-xs text-destructive">{walletMovementsError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || isSavingWalletMovement}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
