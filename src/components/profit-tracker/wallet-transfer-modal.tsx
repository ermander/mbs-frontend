'use client'

import { useMemo, useState } from 'react'

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

interface WalletTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletTransferModal({ open, onOpenChange }: WalletTransferModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSavingWalletMovement = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [fromHolderId, setFromHolderId] = useState('')
  const [toHolderId, setToHolderId] = useState('')
  const [fromWalletId, setFromWalletId] = useState('')
  const [toWalletId, setToWalletId] = useState('')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const holderOptions = useMemo(
    () => holders.map((h) => ({ value: h.id, label: h.nome })),
    [holders],
  )

  const firstHolderOrWalletHolder =
    wallets.length > 0 ? wallets[0].holderId : holders.length > 0 ? holders[0].id : ''

  const effectiveFromHolderId = fromHolderId || firstHolderOrWalletHolder
  const effectiveToHolderId = toHolderId || firstHolderOrWalletHolder

  const fromHolderWallets = useMemo(() => {
    if (!effectiveFromHolderId) return wallets
    return wallets.filter((w) => w.holderId === effectiveFromHolderId)
  }, [wallets, effectiveFromHolderId])

  const toHolderWallets = useMemo(() => {
    if (!effectiveToHolderId) return wallets
    return wallets.filter((w) => w.holderId === effectiveToHolderId)
  }, [wallets, effectiveToHolderId])

  const effectiveFromWalletId =
    fromHolderWallets.length === 0
      ? ''
      : fromWalletId && fromHolderWallets.some((w) => w.id === fromWalletId)
        ? fromWalletId
        : (fromHolderWallets[0]?.id ?? '')

  const effectiveToWalletId =
    toHolderWallets.length === 0
      ? ''
      : toWalletId && toHolderWallets.some((w) => w.id === toWalletId)
        ? toWalletId
        : (toHolderWallets[0]?.id ?? '')

  const handleSave = async () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (
      !effectiveFromHolderId ||
      !effectiveToHolderId ||
      !effectiveFromWalletId ||
      !effectiveToWalletId ||
      effectiveFromWalletId === effectiveToWalletId ||
      !Number.isFinite(importo)
    ) {
      return
    }

    await addWalletMovement({
      tipo: 'trasferimento',
      fromWalletId: effectiveFromWalletId,
      toWalletId: effectiveToWalletId,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
    })

    setValore('')
    setDescrizione('')
    onOpenChange(false)
  }

  const canSave =
    effectiveFromHolderId &&
    effectiveToHolderId &&
    effectiveFromWalletId &&
    effectiveToWalletId &&
    effectiveFromWalletId !== effectiveToWalletId &&
    valore.trim() !== '' &&
    Number.isFinite(Number.parseFloat(valore.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div
          ref={setDropdownPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
        <DialogHeader>
          <DialogTitle>Nuovo trasferimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="from-holder">Da intestatario</Label>
            <SearchableSelect
              id="from-holder"
              options={holderOptions}
              value={effectiveFromHolderId}
              onChange={setFromHolderId}
              allowEmpty={false}
              placeholder="Seleziona intestatario"
              searchPlaceholder="Cerca intestatario..."
              portalContainer={dropdownPortalEl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from-wallet">Da wallet</Label>
            <select
              id="from-wallet"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveFromWalletId}
              onChange={(e) => setFromWalletId(e.target.value)}
            >
              {fromHolderWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nome} ({w.saldoAttuale.toFixed(2)} €)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-holder">A intestatario</Label>
            <SearchableSelect
              id="to-holder"
              options={holderOptions}
              value={effectiveToHolderId}
              onChange={setToHolderId}
              allowEmpty={false}
              placeholder="Seleziona intestatario"
              searchPlaceholder="Cerca intestatario..."
              portalContainer={dropdownPortalEl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-wallet">A wallet</Label>
            <select
              id="to-wallet"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveToWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
            >
              {toHolderWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nome} ({w.saldoAttuale.toFixed(2)} €)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-valore">Movimento (€)</Label>
            <Input
              id="transfer-valore"
              type="text"
              inputMode="decimal"
              value={valore}
              onChange={(e) => setValore(sanitizeDecimal(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-data">Registrato il</Label>
            <Input
              id="transfer-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-desc">Descrizione (opzionale)</Label>
            <textarea
              id="transfer-desc"
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
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
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
