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
import type { Account, EnabledStatus } from '@/types/profit-tracker'

interface AccountEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}

/** «Modifica conto» sul design OddWise (§14.350): stato, descrizione e conto bloccato. */
export function AccountEditModal({ open, onOpenChange, account }: AccountEditModalProps) {
  const updateAccount = useProfitTrackerStore((s) => s.updateAccount)

  const [stato, setStato] = useState<EnabledStatus>(account.stato)
  const [descrizione, setDescrizione] = useState(account.descrizione ?? '')
  const [bloccato, setBloccato] = useState<boolean>(account.bloccato === true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // All'apertura, o se il conto cambia mentre è aperta, il modulo riparte dai valori del conto:
  // durante il render, confrontando con l'ultimo valore visto (react-hooks/set-state-in-effect).
  const syncKey = JSON.stringify([
    open,
    account.stato,
    account.descrizione ?? '',
    account.bloccato === true,
  ])
  const [syncedKey, setSyncedKey] = useState(syncKey)
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey)
    if (open) {
      setStato(account.stato)
      setDescrizione(account.descrizione ?? '')
      setBloccato(account.bloccato === true)
      setError(undefined)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen || !isSaving) {
      onOpenChange(nextOpen)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(undefined)
    try {
      await updateAccount(account.id, {
        stato,
        descrizione: descrizione.trim() || null,
        bloccato,
      })
      onOpenChange(false)
    } catch (e) {
      // Il messaggio del backend, non «Request failed with status code …».
      setError(getErrorMessage(e) || 'Errore nel salvataggio del conto')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges =
    stato !== account.stato ||
    (account.descrizione ?? '') !== descrizione.trim() ||
    bloccato !== (account.bloccato === true)

  return (
    <DsModal
      open={open}
      onOpenChange={handleClose}
      title="Modifica conto"
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {isSaving ? 'Salvataggio…' : 'Salva le modifiche'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GReadOnly label="Conto">{account.nome}</GReadOnly>
        <GSelect
          id="edit-account-stato"
          label="Stato"
          options={STATO_OPTIONS}
          value={stato}
          onChange={(v) => setStato(v as EnabledStatus)}
        />
        <GTextArea
          id="edit-account-descrizione"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        <CalcSwitch
          label="Conto bloccato"
          checked={bloccato}
          onChange={setBloccato}
          hint="Segnala che il sito ha bloccato il conto: il saldo finisce in «Saldo bloccato» della Dashboard. Non limita le operazioni."
        />
        {error && <FieldError id="edit-account-error">{error}</FieldError>}
      </div>
    </DsModal>
  )
}
