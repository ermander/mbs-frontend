'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { OmDropdown, type OmOption } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  FieldError,
  GSelect,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { STATO_OPTIONS } from '@/components/profit-tracker/account-create-modal'
import { getErrorMessage, getResponseStatus } from '@/lib/error-utils'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus } from '@/types/profit-tracker'

interface WalletCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultHolderId?: string
}

/**
 * «Nuovo wallet» sul design OddWise (§14.350). §14.109: niente nome libero, il wallet è un
 * collaboratore × un metodo di pagamento del catalogo, uno solo per coppia: la scelta del metodo
 * esclude quelli già aperti. Se il backend rifiuta, l'errore resta nella modale.
 */
export function WalletCreateModal({ open, onOpenChange, defaultHolderId }: WalletCreateModalProps) {
  const fetchPaymentMethods = useProfitTrackerStore((s) => s.fetchPaymentMethods)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  useEffect(() => {
    if (!open) return
    void fetchPaymentMethods()
    void fetchWallets()
  }, [open, fetchPaymentMethods, fetchWallets])

  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo wallet">
      {open && (
        <WalletCreateForm
          key={defaultHolderId ?? 'nessuno'}
          defaultHolderId={defaultHolderId}
          onClose={() => onOpenChange(false)}
        />
      )}
    </DsModal>
  )
}

/** Montato solo a modale aperta: i campi ripartono dai valori di serie a ogni apertura. */
function WalletCreateForm({
  defaultHolderId,
  onClose,
}: {
  defaultHolderId?: string
  onClose: () => void
}) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const paymentMethods = useProfitTrackerStore((s) => s.paymentMethods)
  const addWallet = useProfitTrackerStore((s) => s.addWallet)

  const [holderId, setHolderId] = useState(defaultHolderId || '')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saldoIniziale, setSaldoIniziale] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveHolderId = holderId || holders[0]?.id || ''

  const holderOptions: OmOption[] = useMemo(
    () =>
      holders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [holders],
  )
  const availableMethods = useMemo(() => {
    const used = new Set(
      wallets.filter((w) => w.holderId === effectiveHolderId).map((w) => w.paymentMethodId),
    )
    return paymentMethods.filter((m) => m.attivo && !used.has(m.id))
  }, [paymentMethods, wallets, effectiveHolderId])
  const methodOptions: OmOption[] = useMemo(
    () =>
      availableMethods
        .map((m) => ({ value: m.id, label: m.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [availableMethods],
  )
  const effectiveMethodId = availableMethods.some((m) => m.id === paymentMethodId)
    ? paymentMethodId
    : (methodOptions[0]?.value ?? '')

  const canSave = !!effectiveHolderId && !!effectiveMethodId && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await addWallet({
        holderId: effectiveHolderId,
        paymentMethodId: effectiveMethodId,
        descrizione: descrizione.trim() || undefined,
        saldoIniziale: Number.parseFloat(saldoIniziale.replace(',', '.')) || 0,
        stato,
      })
      toast.success('Wallet creato')
      onClose()
    } catch (err: unknown) {
      setError(
        getResponseStatus(err) === 409
          ? 'Il collaboratore ha già un wallet per questo metodo di pagamento.'
          : getErrorMessage(err) || 'Errore nel salvataggio del wallet.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <OmDropdown
          id="wallet-holder"
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
        <div className="flex flex-col gap-1">
          <OmDropdown
            id="wallet-method"
            label="Metodo di pagamento"
            allLabel="Scegli un metodo"
            single
            floating
            alignBelow
            disabled={availableMethods.length === 0}
            emptyText="Nessun metodo con questo nome."
            options={methodOptions}
            selected={effectiveMethodId ? [effectiveMethodId] : []}
            onChange={(next) => next[0] && setPaymentMethodId(next[0])}
            className="gap-1"
          />
          {availableMethods.length === 0 && (
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              {paymentMethods.length === 0
                ? 'Nessun metodo di pagamento nel catalogo: un amministratore può aggiungerlo nel backoffice.'
                : 'Il collaboratore ha già un wallet per ogni metodo del catalogo.'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="wallet-saldo"
            label="Saldo iniziale"
            optional
            numeric
            suffix="€"
            placeholder="0,00"
            value={saldoIniziale}
            onChange={(v) => setSaldoIniziale(sanitizeDecimal(v))}
          />
          <GSelect
            id="wallet-stato"
            label="Stato"
            options={STATO_OPTIONS}
            value={stato}
            onChange={(v) => setStato(v as EnabledStatus)}
          />
        </div>
        <GTextArea
          id="wallet-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {error && <FieldError id="wallet-create-error">{error}</FieldError>}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
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
          {saving ? 'Salvataggio…' : 'Salva il wallet'}
        </button>
      </div>
    </>
  )
}
