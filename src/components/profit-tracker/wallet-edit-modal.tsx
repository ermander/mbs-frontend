'use client'

import { useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcSwitch } from '@/components/calculators/calc-ds'
import { STATO_OPTIONS } from '@/components/profit-tracker/account-create-modal'
import {
  DsModal,
  FieldError,
  GReadOnly,
  GSelect,
  GTextArea,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { getErrorMessage } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus, Wallet } from '@/types/profit-tracker'

interface WalletEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
}

/** «Modifica wallet» sul design OddWise (§14.350): descrizione, stato e wallet bloccato. */
export function WalletEditModal({ open, onOpenChange, wallet }: WalletEditModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)

  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [bloccato, setBloccato] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const holderName =
    wallet != null ? (holders.find((h) => h.id === wallet.holderId)?.nome ?? '—') : ''

  // All'apertura, o se il wallet cambia mentre è aperta, il modulo riparte dai valori del wallet:
  // durante il render, confrontando con l'ultimo valore visto (react-hooks/set-state-in-effect).
  const [synced, setSynced] = useState({ open, wallet })
  if (synced.open !== open || synced.wallet !== wallet) {
    setSynced({ open, wallet })
    if (open && wallet) {
      setDescrizione(wallet.descrizione ?? '')
      setStato(wallet.stato)
      setBloccato(wallet.bloccato === true)
      setError(null)
    }
  }

  const handleSave = async () => {
    if (!wallet) return
    setSaving(true)
    setError(null)
    try {
      await updateWallet(wallet.id, {
        descrizione: descrizione.trim() || null,
        stato,
        bloccato,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Errore nel salvataggio del wallet.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && saving) return
    onOpenChange(nextOpen)
  }

  const hasChanges =
    wallet != null &&
    (stato !== wallet.stato ||
      (wallet.descrizione ?? '') !== descrizione.trim() ||
      bloccato !== (wallet.bloccato === true))

  return (
    <DsModal
      open={open}
      onOpenChange={handleClose}
      title="Modifica wallet"
      footer={
        <>
          <button
            type="button"
            onClick={() => handleClose(false)}
            disabled={saving}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !hasChanges}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {saving ? 'Salvataggio…' : 'Salva le modifiche'}
          </button>
        </>
      }
    >
      {wallet == null ? (
        <p className="ds-body m-0 text-ds-ink-muted">Nessun wallet selezionato.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GReadOnly label="Metodo">{wallet.nome}</GReadOnly>
            <GReadOnly label="Collaboratore">{holderName}</GReadOnly>
          </div>
          <GSelect
            id="wallet-edit-stato"
            label="Stato"
            options={STATO_OPTIONS}
            value={stato}
            onChange={(v) => setStato(v as EnabledStatus)}
          />
          <GTextArea
            id="wallet-edit-desc"
            label="Descrizione"
            optional
            value={descrizione}
            onChange={setDescrizione}
          />
          <CalcSwitch
            label="Wallet bloccato"
            checked={bloccato}
            onChange={setBloccato}
            hint="Segnala che il provider ha bloccato il wallet: il saldo finisce in «Saldo bloccato» della Dashboard. Non limita le operazioni."
          />
          {error && <FieldError id="wallet-edit-error">{error}</FieldError>}
        </div>
      )}
    </DsModal>
  )
}
