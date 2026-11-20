'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { OmDropdown, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  FieldError,
  GReadOnly,
  GSelect,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsSegmented } from '@/components/profit-tracker/tracker-ds'
import { walletOptionLabel } from '@/components/profit-tracker/wallet-transfer-modal'
import { NATURA_HINTS, direzioneForTipo } from '@/lib/profit-tracker/movement-categories'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { WalletMovementType } from '@/types/profit-tracker'

interface WalletTopupExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TopupTipo = Exclude<WalletMovementType, 'trasferimento'>

const TIPI: { value: TopupTipo; label: string }[] = [
  { value: 'ricarica', label: 'Ricarica' },
  { value: 'spesa', label: 'Spesa' },
]

/** Lo slug della categoria che chiede a quale collaboratore va il compenso (§14.111). */
const COMPENSO_SLUG = 'compenso-identita'

/**
 * «Nuova ricarica o spesa» di un wallet sul design OddWise (§14.350): tipo, collaboratore, wallet,
 * categoria del catalogo (§14.111, con il collaboratore del compenso quando serve), importo, data
 * e descrizione. Stesso salvataggio di prima; se non va, la modale resta aperta con l'errore.
 */
export function WalletTopupExpenseModal({ open, onOpenChange }: WalletTopupExpenseModalProps) {
  const fetchMovementCategories = useProfitTrackerStore((s) => s.fetchMovementCategories)

  useEffect(() => {
    if (open) void fetchMovementCategories()
  }, [open, fetchMovementCategories])

  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuova ricarica o spesa">
      {open && <WalletTopupForm onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono vuoti a ogni apertura. */
function WalletTopupForm({ onClose }: { onClose: () => void }) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const movementCategories = useProfitTrackerStore((s) => s.movementCategories)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSaving = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [holderId, setHolderId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [tipo, setTipo] = useState<TopupTipo>('ricarica')
  const [categoryId, setCategoryId] = useState('')
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')
  // L'errore dello store vale solo dopo un salvataggio da questa modale.
  const [tried, setTried] = useState(false)

  const holderOptions: OmOption[] = useMemo(
    () =>
      holders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [holders],
  )

  const effectiveHolderId = holderId || wallets[0]?.holderId || holders[0]?.id || ''
  const holderWallets = useMemo(
    () => wallets.filter((w) => w.holderId === effectiveHolderId),
    [wallets, effectiveHolderId],
  )
  const effectiveWalletId =
    holderWallets.length === 0
      ? ''
      : holderWallets.some((w) => w.id === walletId)
        ? walletId
        : holderWallets[0].id

  // §14.111: solo le categorie della direzione del tipo (entrata per le ricariche, uscita per le
  // spese), nell'ordine del catalogo: il capitale proprio sta in fondo.
  const categories = useMemo(() => {
    const direzione = direzioneForTipo(tipo)
    return movementCategories
      .filter((c) => c.attivo && c.direzione === direzione)
      .sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome, 'it'))
  }, [movementCategories, tipo])
  const effectiveCategoryId = categories.some((c) => c.id === categoryId) ? categoryId : ''
  const selectedCategory = categories.find((c) => c.id === effectiveCategoryId) ?? null
  const asksBeneficiary = selectedCategory?.slug === COMPENSO_SLUG
  const effectiveBeneficiaryId = beneficiaryId || effectiveHolderId

  const importo = Number.parseFloat(valore.replace(',', '.'))
  const canSave =
    !!effectiveWalletId &&
    !!effectiveCategoryId &&
    valore.trim() !== '' &&
    Number.isFinite(importo) &&
    !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setTried(true)
    const ok = await addWalletMovement({
      walletId: effectiveWalletId,
      tipo,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione.trim() || undefined,
      categoryId: effectiveCategoryId,
      // Il collaboratore di riferimento viaggia solo quando è diverso dal proprietario del wallet.
      holderId:
        asksBeneficiary && effectiveBeneficiaryId !== effectiveHolderId
          ? effectiveBeneficiaryId
          : undefined,
    })
    if (!ok) return
    toast.success(tipo === 'ricarica' ? 'Ricarica registrata' : 'Spesa registrata')
    onClose()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm leading-5 font-semibold text-ds-ink">Tipo</span>
          <DsSegmented
            label="Tipo"
            items={TIPI}
            value={tipo}
            onChange={(v) => {
              setTipo(v)
              setCategoryId('')
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OmDropdown
            id="topup-holder"
            label="Collaboratore"
            allLabel="Scegli un collaboratore"
            single
            floating
            alignBelow
            emptyText="Nessun collaboratore con questo nome."
            options={holderOptions}
            selected={effectiveHolderId ? [effectiveHolderId] : []}
            onChange={(next) => next[0] && setHolderId(next[0])}
            className="gap-1"
          />
          {holderWallets.length > 0 ? (
            <GSelect
              id="topup-wallet"
              label="Wallet"
              options={holderWallets.map((w) => ({ value: w.id, label: walletOptionLabel(w) }))}
              value={effectiveWalletId}
              onChange={setWalletId}
            />
          ) : (
            <GReadOnly label="Wallet">
              <span className="text-ds-ink-muted">Nessun wallet</span>
            </GReadOnly>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <GSelect
            id="topup-categoria"
            label="Categoria"
            options={[
              { value: '', label: 'Scegli una categoria' },
              ...categories.map((c) => ({ value: c.id, label: c.nome })),
            ]}
            value={effectiveCategoryId}
            onChange={setCategoryId}
          />
          {selectedCategory ? (
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              {NATURA_HINTS[selectedCategory.natura]}
            </p>
          ) : categories.length === 0 ? (
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              Nessuna categoria attiva per questo tipo: aggiungila dal backoffice.
            </p>
          ) : null}
        </div>
        {asksBeneficiary && (
          <div className="flex flex-col gap-1">
            <OmDropdown
              id="topup-beneficiario"
              label="Per il collaboratore"
              allLabel="Scegli un collaboratore"
              single
              floating
              alignBelow
              emptyText="Nessun collaboratore con questo nome."
              options={holderOptions}
              selected={effectiveBeneficiaryId ? [effectiveBeneficiaryId] : []}
              onChange={(next) => next[0] && setBeneficiaryId(next[0])}
              className="gap-1"
            />
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              Il compenso pesa sul netto di questo collaboratore nel Report.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="topup-valore"
            label="Importo"
            numeric
            suffix="€"
            placeholder="0,00"
            value={valore}
            onChange={(v) => setValore(sanitizeDecimal(v))}
          />
          <GTextField
            id="topup-data"
            label="Registrato il"
            type="date"
            value={dataRegistrazione}
            onChange={setDataRegistrazione}
          />
        </div>
        <GTextArea
          id="topup-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {tried && walletMovementsError && (
          <FieldError id="topup-error">{walletMovementsError}</FieldError>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className={dsButtonClass('ghost', 'md')}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
        >
          {isSaving ? 'Salvataggio…' : tipo === 'ricarica' ? 'Salva la ricarica' : 'Salva la spesa'}
        </button>
      </div>
    </>
  )
}
