'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { NATURA_HINTS, direzioneForTipo } from '@/lib/profit-tracker/movement-categories'
import type { WalletMovementType } from '@/types/profit-tracker'

interface WalletTopupExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TopupTipo = Exclude<WalletMovementType, 'trasferimento'>

/** Lo slug della categoria che chiede a quale collaboratore va il compenso (§14.111). */
const COMPENSO_SLUG = 'compenso-identita'

export function WalletTopupExpenseModal({ open, onOpenChange }: WalletTopupExpenseModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const movementCategories = useProfitTrackerStore((s) => s.movementCategories)
  const fetchMovementCategories = useProfitTrackerStore((s) => s.fetchMovementCategories)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSavingWalletMovement = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [holderId, setHolderId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [tipo, setTipo] = useState<TopupTipo>('ricarica')
  const [categoryId, setCategoryId] = useState('')
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) void fetchMovementCategories()
  }, [open, fetchMovementCategories])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setHolderId('')
        setWalletId('')
        setTipo('ricarica')
        setCategoryId('')
        setBeneficiaryId('')
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

  // §14.111: solo le categorie della direzione del tipo (entrata per le ricariche, uscita
  // per le spese), nell'ordine del catalogo: il capitale proprio sta in fondo.
  const categoryOptions = useMemo(() => {
    const direzione = direzioneForTipo(tipo)
    return movementCategories
      .filter((c) => c.attivo && c.direzione === direzione)
      .sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome, 'it'))
  }, [movementCategories, tipo])

  const effectiveCategoryId =
    categoryId && categoryOptions.some((c) => c.id === categoryId) ? categoryId : ''
  const selectedCategory = categoryOptions.find((c) => c.id === effectiveCategoryId) ?? null
  const asksBeneficiary = selectedCategory?.slug === COMPENSO_SLUG
  const effectiveBeneficiaryId = beneficiaryId || effectiveHolderId

  const holderOptions = useMemo(
    () => holders.map((h) => ({ value: h.id, label: h.nome })),
    [holders],
  )

  const handleSave = async () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (!effectiveWalletId || !effectiveCategoryId || !Number.isFinite(importo)) return

    const success = await addWalletMovement({
      walletId: effectiveWalletId,
      tipo,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
      categoryId: effectiveCategoryId,
      // Il collaboratore di riferimento viaggia solo quando è diverso dal proprietario del wallet.
      holderId:
        asksBeneficiary && effectiveBeneficiaryId !== effectiveHolderId
          ? effectiveBeneficiaryId
          : undefined,
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
    effectiveCategoryId &&
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
            <Label htmlFor="topup-holder">Collaboratore</Label>
            <SearchableSelect
              id="topup-holder"
              options={holderOptions}
              value={effectiveHolderId}
              onChange={setHolderId}
              allowEmpty={false}
              placeholder="Seleziona collaboratore"
              searchPlaceholder="Cerca collaboratore..."
              portalContainer={dropdownPortalEl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-tipo">Tipo</Label>
            <select
              id="topup-tipo"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TopupTipo)
                setCategoryId('')
              }}
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
            <Label htmlFor="topup-categoria">Categoria *</Label>
            <select
              id="topup-categoria"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveCategoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Seleziona categoria</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {selectedCategory ? (
              <p className="text-[11px] text-muted-foreground">
                {NATURA_HINTS[selectedCategory.natura]}
              </p>
            ) : categoryOptions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nessuna categoria attiva per questo tipo: aggiungila dal backoffice.
              </p>
            ) : null}
          </div>
          {asksBeneficiary && (
            <div className="space-y-1.5">
              <Label htmlFor="topup-beneficiario">Per il collaboratore</Label>
              <SearchableSelect
                id="topup-beneficiario"
                options={holderOptions}
                value={effectiveBeneficiaryId}
                onChange={setBeneficiaryId}
                allowEmpty={false}
                placeholder="Seleziona collaboratore"
                searchPlaceholder="Cerca collaboratore..."
                portalContainer={dropdownPortalEl}
              />
              <p className="text-[11px] text-muted-foreground">
                Il compenso pesa sul netto di questo collaboratore nel report.
              </p>
            </div>
          )}
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
