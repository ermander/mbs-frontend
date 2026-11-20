'use client'

import { useEffect, useMemo, useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcSwitch } from '@/components/calculators/calc-ds'
import { OmDropdown } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  FieldError,
  GReadOnly,
  GSelect,
  GTextArea,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  AccountChip,
  useAccountInfo,
} from '@/components/profit-tracker/giocate-rapide/use-account-info'
import { DsSegmented } from '@/components/profit-tracker/tracker-ds'
import { dashMoney } from '@/lib/profit-tracker/dashboard'
import { cn, sanitizeDecimal } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account, AccountMovementType } from '@/types/profit-tracker'

interface AccountMovementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Quando valorizzato, la modale è aperta da un bottone "Nuovo movimento" legato a
   * uno specifico conto: il conto viene mostrato bloccato e non è possibile sceglierne
   * un altro. Si passa l'oggetto completo (non solo l'id) per non dipendere da
   * `allAccounts`, che è limitato lato backend e potrebbe non contenere conti a saldo basso.
   */
  account?: Account
  /**
   * Conto preselezionato quando la modale è aperta senza conto bloccato (es. dal dettaglio
   * giocata: il conto della giocata). L'utente può comunque sceglierne un altro.
   */
  defaultAccountId?: string
}

const TIPI: { value: AccountMovementType; label: string }[] = [
  { value: 'deposito', label: 'Deposito' },
  { value: 'prelievo', label: 'Prelievo' },
  { value: 'riconciliazione', label: 'Riconciliazione' },
]

/**
 * «Nuovo movimento conto» sul design OddWise (§14.350): metodo, conto (con il logo del book),
 * wallet del collaboratore, importo, data e descrizione. Stesso salvataggio di prima.
 */
export function AccountMovementModal({
  open,
  onOpenChange,
  account,
  defaultAccountId,
}: AccountMovementModalProps) {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const addAccountMovement = useProfitTrackerStore((s) => s.addAccountMovement)
  const isSavingAccountMovement = useProfitTrackerStore((s) => s.isSavingAccountMovement)
  const accountMovementsError = useProfitTrackerStore((s) => s.accountMovementsError)
  const { accountInfo, accountOptions } = useAccountInfo()

  const [accountId, setAccountId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [tipo, setTipo] = useState<AccountMovementType>('deposito')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')
  // §14.109: un prelievo nasce in attesa; con la spunta nasce già pagato e accredita subito il wallet.
  const [giaPagato, setGiaPagato] = useState(false)

  useEffect(() => {
    if (!open) return
    // In modalità "conto bloccato" non serve l'elenco completo dei conti.
    if (!account) void fetchAllAccounts()
    void fetchWallets()
  }, [open, account, fetchAllAccounts, fetchWallets])

  const hasAccount = (id: string | undefined) => !!id && allAccounts.some((a) => a.id === id)
  const effectiveAccountId = account
    ? account.id
    : hasAccount(accountId)
      ? accountId
      : hasAccount(defaultAccountId)
        ? (defaultAccountId as string)
        : (allAccounts[0]?.id ?? '')

  const selectedAccount = useMemo(
    () => account ?? allAccounts.find((a) => a.id === effectiveAccountId),
    [account, allAccounts, effectiveAccountId],
  )

  const holderWallets = useMemo(() => {
    if (!selectedAccount) return wallets
    return wallets.filter((w) => w.holderId === selectedAccount.holderId)
  }, [wallets, selectedAccount])

  const effectiveWalletId =
    holderWallets.length === 0
      ? ''
      : walletId && holderWallets.some((w) => w.id === walletId)
        ? walletId
        : (holderWallets[0]?.id ?? '')

  const importo = Number.parseFloat(valore.replace(',', '.'))
  const canSave =
    !!effectiveAccountId &&
    valore.trim() !== '' &&
    Number.isFinite(importo) &&
    (tipo === 'riconciliazione' || !!effectiveWalletId)

  const handleSave = async () => {
    if (!canSave) return
    await addAccountMovement({
      accountId: effectiveAccountId,
      tipo,
      walletId: tipo === 'riconciliazione' ? undefined : effectiveWalletId,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
      stato: tipo === 'prelievo' && giaPagato ? 'pagato' : undefined,
    })

    // Lo store non lancia: segnala l'errore nello stato. Se c'è, la modale resta aperta
    // e lo mostra, invece di chiudersi come se il movimento fosse stato salvato.
    if (useProfitTrackerStore.getState().accountMovementsError) return

    setValore('')
    setDescrizione('')
    setGiaPagato(false)
    onOpenChange(false)
  }

  const walletOptions = holderWallets.map((w) => ({
    value: w.id,
    label: `${w.nome} · ${dashMoney(w.saldoAttuale, { sign: false })}`,
  }))

  return (
    <DsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nuovo movimento conto"
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || isSavingAccountMovement}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {isSavingAccountMovement ? 'Salvataggio…' : 'Salva il movimento'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm leading-5 font-semibold text-ds-ink">Metodo</span>
          <DsSegmented label="Metodo" items={TIPI} value={tipo} onChange={setTipo} />
        </div>
        {account ? (
          <GReadOnly label="Conto">
            {accountInfo(account.id).book ? (
              <AccountChip info={accountInfo(account.id)} />
            ) : (
              account.nome
            )}
          </GReadOnly>
        ) : (
          <OmDropdown
            id="mov-account"
            label="Conto"
            allLabel="Scegli un conto"
            single
            floating
            alignBelow
            emptyText="Nessun conto con questo nome."
            options={accountOptions}
            selected={effectiveAccountId ? [effectiveAccountId] : []}
            onChange={(next) => next[0] && setAccountId(next[0])}
            className="gap-1"
          />
        )}
        {tipo !== 'riconciliazione' &&
          (walletOptions.length > 0 ? (
            <GSelect
              id="mov-wallet"
              label="Wallet"
              options={walletOptions}
              value={effectiveWalletId}
              onChange={setWalletId}
            />
          ) : (
            <GReadOnly
              label="Wallet"
              hint="Aggiungi un wallet al collaboratore del conto da Gestione conti → Wallets."
            >
              <span className="text-ds-ink-muted">Nessun wallet per questo collaboratore</span>
            </GReadOnly>
          ))}
        {tipo === 'prelievo' && (
          <div className="flex flex-col gap-3 rounded-ds-sm bg-ds-warning-soft px-3 py-3">
            <p className="ds-body-sm m-0 text-ds-ink">
              Il conto scende subito; il wallet riceve l&apos;importo quando segni il prelievo come
              pagato (da Wallets o dallo Storico movimenti).
            </p>
            <CalcSwitch
              label="Già pagato: accredita subito il wallet"
              checked={giaPagato}
              onChange={setGiaPagato}
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="mov-valore"
            label="Movimento"
            numeric
            suffix="€"
            placeholder="0,00"
            value={valore}
            onChange={(v) => setValore(sanitizeDecimal(v))}
          />
          <GTextField
            id="mov-data"
            label="Registrato il"
            type="date"
            value={dataRegistrazione}
            onChange={setDataRegistrazione}
          />
        </div>
        <GTextArea
          id="mov-desc"
          label="Descrizione"
          optional
          value={descrizione}
          onChange={setDescrizione}
        />
        {accountMovementsError && <FieldError id="mov-error">{accountMovementsError}</FieldError>}
      </div>
    </DsModal>
  )
}
