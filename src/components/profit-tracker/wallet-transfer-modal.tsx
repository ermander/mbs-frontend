'use client'

import { useMemo, useState } from 'react'
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
import { dashMoney } from '@/lib/profit-tracker/dashboard'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Wallet } from '@/types/profit-tracker'

interface WalletTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** «Nuovo trasferimento» fra due wallet sul design OddWise (§14.350). */
export function WalletTransferModal({ open, onOpenChange }: WalletTransferModalProps) {
  return (
    <DsModal open={open} onOpenChange={onOpenChange} title="Nuovo trasferimento">
      {open && <WalletTransferForm onClose={() => onOpenChange(false)} />}
    </DsModal>
  )
}

export const walletOptionLabel = (w: Wallet) =>
  `${w.nome} · ${dashMoney(w.saldoAttuale, { sign: false })}`

/** Montato solo a modale aperta: i campi ripartono vuoti a ogni apertura. */
function WalletTransferForm({ onClose }: { onClose: () => void }) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSaving = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [fromHolderId, setFromHolderId] = useState('')
  const [toHolderId, setToHolderId] = useState('')
  const [fromWalletId, setFromWalletId] = useState('')
  const [toWalletId, setToWalletId] = useState('')
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

  const firstHolder = wallets[0]?.holderId ?? holders[0]?.id ?? ''
  const effectiveFromHolderId = fromHolderId || firstHolder
  const effectiveToHolderId = toHolderId || firstHolder

  const fromWallets = useMemo(
    () => wallets.filter((w) => w.holderId === effectiveFromHolderId),
    [wallets, effectiveFromHolderId],
  )
  const toWallets = useMemo(
    () => wallets.filter((w) => w.holderId === effectiveToHolderId),
    [wallets, effectiveToHolderId],
  )
  const pick = (list: Wallet[], id: string) =>
    list.length === 0 ? '' : list.some((w) => w.id === id) ? id : list[0].id
  const effectiveFromWalletId = pick(fromWallets, fromWalletId)
  // L'arrivo parte dal primo wallet diverso dalla partenza, se il collaboratore ne ha un altro.
  const effectiveToWalletId = toWallets.some((w) => w.id === toWalletId)
    ? toWalletId
    : (toWallets.find((w) => w.id !== effectiveFromWalletId)?.id ?? toWallets[0]?.id ?? '')

  const sameWallet = !!effectiveFromWalletId && effectiveFromWalletId === effectiveToWalletId
  const importo = Number.parseFloat(valore.replace(',', '.'))
  const canSave =
    !!effectiveFromWalletId &&
    !!effectiveToWalletId &&
    !sameWallet &&
    valore.trim() !== '' &&
    Number.isFinite(importo) &&
    !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setTried(true)
    const ok = await addWalletMovement({
      tipo: 'trasferimento',
      fromWalletId: effectiveFromWalletId,
      toWalletId: effectiveToWalletId,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione.trim() || undefined,
    })
    // Lo store non lancia: se il salvataggio non va, la modale resta aperta con l'errore.
    if (!ok) return
    toast.success('Trasferimento registrato')
    onClose()
  }

  const walletField = (
    id: string,
    label: string,
    list: Wallet[],
    value: string,
    onChange: (v: string) => void,
  ) =>
    list.length > 0 ? (
      <GSelect
        id={id}
        label={label}
        options={list.map((w) => ({ value: w.id, label: walletOptionLabel(w) }))}
        value={value}
        onChange={onChange}
      />
    ) : (
      <GReadOnly label={label}>
        <span className="text-ds-ink-muted">Nessun wallet</span>
      </GReadOnly>
    )

  return (
    <>
      <div className="flex flex-col gap-4">
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="ds-label mb-1 p-0 text-ds-ink-muted uppercase">Da</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <OmDropdown
              id="from-holder"
              label="Collaboratore"
              allLabel="Scegli un collaboratore"
              single
              floating
              alignBelow
              emptyText="Nessun collaboratore con questo nome."
              options={holderOptions}
              selected={effectiveFromHolderId ? [effectiveFromHolderId] : []}
              onChange={(next) => next[0] && setFromHolderId(next[0])}
              className="gap-1"
            />
            {walletField(
              'from-wallet',
              'Wallet',
              fromWallets,
              effectiveFromWalletId,
              setFromWalletId,
            )}
          </div>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="ds-label mb-1 p-0 text-ds-ink-muted uppercase">A</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <OmDropdown
              id="to-holder"
              label="Collaboratore"
              allLabel="Scegli un collaboratore"
              single
              floating
              alignBelow
              emptyText="Nessun collaboratore con questo nome."
              options={holderOptions}
              selected={effectiveToHolderId ? [effectiveToHolderId] : []}
              onChange={(next) => next[0] && setToHolderId(next[0])}
              className="gap-1"
            />
            {walletField('to-wallet', 'Wallet', toWallets, effectiveToWalletId, setToWalletId)}
          </div>
          {sameWallet && (
            <p className="m-0 text-sm leading-5 text-ds-ink-muted">
              Scegli due wallet diversi: partenza e arrivo coincidono.
            </p>
          )}
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="transfer-valore"
            label="Importo"
            numeric
            suffix="€"
            placeholder="0,00"
            value={valore}
            onChange={(v) => setValore(sanitizeDecimal(v))}
          />
          <GTextField
            id="transfer-data"
            label="Registrato il"
            type="date"
            value={dataRegistrazione}
            onChange={setDataRegistrazione}
          />
        </div>
        <GTextArea
          id="transfer-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {tried && walletMovementsError && (
          <FieldError id="transfer-error">{walletMovementsError}</FieldError>
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
          {isSaving ? 'Salvataggio…' : 'Salva il trasferimento'}
        </button>
      </div>
    </>
  )
}
