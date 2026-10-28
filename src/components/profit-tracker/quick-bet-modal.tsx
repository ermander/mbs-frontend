'use client'

import { useCallback, useState } from 'react'
import { Check, CircleX, Search } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcSwitch } from '@/components/calculators/calc-ds'
import { OmBookLogo, OmDropdown } from '@/components/strumenti/scanner-v2/om-ds'
import {
  DsModal,
  GSelect,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { useAccountInfo } from '@/components/profit-tracker/giocate-rapide/use-account-info'
import { QUICK_METHODS } from '@/lib/profit-tracker/categories'
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import { localYmd, parseMovimento } from '@/lib/profit-tracker/quick-bets'
import { getErrorMessage } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { QuickBet, QuickGameMethod } from '@/types/profit-tracker'

interface QuickBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Le giocate create, una per conto. */
  onSaved?: (created: QuickBet[]) => void
}

const METHOD_OPTIONS = QUICK_METHODS.map((m) => ({ value: m.value, label: m.label }))
const DEFAULT_METHOD: QuickGameMethod = 'casino_live'

/**
 * «Nuova giocata rapida» dal design «OddWise Giocate rapide»: conto (o più conti con «Stessa
 * giocata su più conti»), metodo, movimento col segno, giorno, tag e nota. Una POST per conto,
 * come prima; il giorno si salva a mezzanotte come prima.
 */
export function QuickBetModal({ open, onOpenChange, onSaved }: QuickBetModalProps) {
  const { accountInfo, accountOptions } = useAccountInfo()
  const tags = useProfitTrackerStore((s) => s.tags)
  const addQuickBet = useProfitTrackerStore((s) => s.addQuickBet)

  const [accountId, setAccountId] = useState('')
  const [multi, setMulti] = useState(false)
  const [accountIds, setAccountIds] = useState<string[]>([])
  const [contiQ, setContiQ] = useState('')
  const [metodo, setMetodo] = useState<QuickGameMethod>(DEFAULT_METHOD)
  const [importo, setImporto] = useState('')
  const [data, setData] = useState(() => localYmd(new Date().toISOString()))
  const [tag, setTag] = useState('')
  const [nota, setNota] = useState('')
  const [tried, setTried] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setAccountId('')
    setMulti(false)
    setAccountIds([])
    setContiQ('')
    setMetodo(DEFAULT_METHOD)
    setImporto('')
    setData(localYmd(new Date().toISOString()))
    setTag('')
    setNota('')
    setTried(false)
    setIsSaving(false)
    setError(null)
  }, [])

  const close = useCallback(() => {
    resetState()
    onOpenChange(false)
  }, [resetState, onOpenChange])

  const amount = parseMovimento(importo)
  const amountOk = amount != null && amount !== 0
  const targets = multi ? accountIds : accountId ? [accountId] : []

  // Gli errori compaiono dopo il primo «Salva»; il movimento anche appena scritto.
  const errors = {
    conto: tried && !multi && !accountId ? 'Scegli il conto su cui hai giocato' : undefined,
    conti: tried && multi && accountIds.length === 0 ? 'Scegli almeno un conto' : undefined,
    importo:
      (importo.trim() !== '' || tried) && !amountOk
        ? 'Scrivi quanto hai vinto o perso, ad esempio 25 o −15'
        : undefined,
    data: tried && !data ? 'Indica la data della giocata' : undefined,
  }
  const canSave = targets.length > 0 && amountOk && !!data

  const handleSave = async () => {
    if (!canSave || amount == null) {
      setTried(true)
      return
    }
    setIsSaving(true)
    setError(null)
    const dataIso = new Date(data).toISOString()
    const created: QuickBet[] = []
    try {
      for (const id of targets) {
        created.push(
          await addQuickBet({
            accountId: id,
            quickMethod: metodo,
            movimento: amount,
            dataRegistrazione: dataIso,
            tag: tag || undefined,
            nota: nota.trim() || undefined,
          }),
        )
      }
      close()
      onSaved?.(created)
    } catch (err) {
      const message = getErrorMessage(err) ?? 'Errore nel salvataggio della giocata rapida'
      if (created.length > 0) {
        // Le giocate già salvate restano in lista: si tolgono dalla scelta per non doppiarle.
        const saved = new Set(created.map((b) => b.accountId))
        setAccountIds((ids) => ids.filter((id) => !saved.has(id)))
        setError(`Salvate ${created.length} di ${targets.length}. ${message}`)
        onSaved?.(created)
      } else setError(message)
      setIsSaving(false)
    }
  }

  const toggleMulti = (on: boolean) => {
    setMulti(on)
    if (on) setAccountIds(accountId ? [accountId] : [])
    else setAccountId(accountIds[0] ?? accountId)
  }

  const tagOptions = [
    { value: '', label: 'Nessun tag' },
    ...tags.map((t) => ({ value: t.nome, label: t.nome })),
  ]

  const cq = contiQ.trim().toLowerCase()
  const contiShown = accountOptions.filter((o) => !cq || o.label.toLowerCase().includes(cq))
  const picked =
    accountIds.length === 0
      ? 'nessuno scelto'
      : accountIds.length === 1
        ? '1 scelto'
        : `${accountIds.length} scelti`

  const metodoSelect = (
    <GSelect
      id="rapida-metodo"
      label="Metodo"
      options={METHOD_OPTIONS}
      value={metodo}
      onChange={(v) => setMetodo(v as QuickGameMethod)}
    />
  )

  return (
    <DsModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : !isSaving && close())}
      title="Nuova giocata rapida"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className={dsButtonClass('ghost', 'md')}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {isSaving
              ? 'Salvataggio…'
              : multi && accountIds.length > 1
                ? `Salva ${accountIds.length} giocate`
                : 'Salva la giocata'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {multi ? (
          <div className="flex flex-col gap-4">
            {metodoSelect}
            <div
              role="group"
              aria-labelledby="rapida-conti-label"
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  id="rapida-conti-label"
                  className="text-sm font-semibold leading-5 text-ds-ink"
                >
                  Conti <span className="font-normal text-ds-ink-muted">· {picked}</span>
                </span>
                {accountIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAccountIds([])}
                    className={dsButtonClass('ghost', 'sm')}
                  >
                    Deseleziona tutti
                  </button>
                )}
              </div>
              <GTextField
                id="rapida-conti-cerca"
                ariaLabel="Cerca conto o bookmaker"
                type="search"
                placeholder="Cerca conto o bookmaker"
                value={contiQ}
                onChange={setContiQ}
                prefix={<Search className="h-4 w-4" aria-hidden />}
              />
              <div className="grid max-h-[188px] grid-cols-1 gap-1.5 overflow-auto p-px sm:grid-cols-2">
                {contiShown.map((o) => {
                  const on = accountIds.includes(o.value)
                  const info = accountInfo(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={info.label}
                      onClick={() =>
                        setAccountIds((ids) =>
                          on ? ids.filter((x) => x !== o.value) : [...ids, o.value],
                        )
                      }
                      className={cn(
                        'ds-body-sm flex h-10 items-center gap-2.5 rounded-ds-sm border px-2.5 text-left text-ds-ink transition-colors',
                        on
                          ? 'border-ds-brand bg-ds-brand-soft'
                          : 'border-ds-line bg-ds-surface-raised hover:bg-ds-surface-sunken',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded border text-white transition-colors',
                          on
                            ? 'border-ds-brand bg-ds-brand'
                            : 'border-ds-line-strong bg-ds-surface-raised',
                        )}
                      >
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                      </span>
                      {info.book && (
                        <OmBookLogo
                          slug={bookLogoSlug(info.book)}
                          name={info.book.nome}
                          size="sm"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-ds-ink-muted">
                        {info.holderName}
                      </span>
                    </button>
                  )
                })}
              </div>
              {contiShown.length === 0 && (
                <p className="ds-body-sm m-0 py-2 text-ds-ink-muted">
                  Nessun conto con questo nome.
                </p>
              )}
              {errors.conti && <ErrorLine>{errors.conti}</ErrorLine>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1">
              <OmDropdown
                id="rapida-conto"
                label="Conto"
                allLabel="Scegli un conto"
                single
                panelWidth={300}
                emptyText="Nessun conto con questo nome."
                options={accountOptions}
                selected={accountId ? [accountId] : []}
                onChange={(next) => setAccountId(next[0] ?? '')}
              />
              {errors.conto && <ErrorLine>{errors.conto}</ErrorLine>}
            </div>
            {metodoSelect}
          </div>
        )}

        <CalcSwitch
          label="Stessa giocata su più conti"
          checked={multi}
          onChange={toggleMulti}
          hint="Registra lo stesso movimento su ogni conto che scegli."
        />
        <div className="h-px bg-ds-line" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="rapida-importo"
            label="Movimento"
            numeric
            suffix="€"
            placeholder="Es. 25 o −15"
            value={importo}
            onChange={setImporto}
            error={errors.importo}
          />
          <GTextField
            id="rapida-data"
            label="Registrata il"
            type="date"
            value={data}
            onChange={setData}
            error={errors.data}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <GSelect id="rapida-tag" label="Tag" options={tagOptions} value={tag} onChange={setTag} />
          <GTextField
            id="rapida-nota"
            label="Nota"
            optional
            placeholder="Es. Blackjack, tavolo da 5 €"
            value={nota}
            onChange={setNota}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="ds-body-sm m-0 rounded-ds-sm bg-ds-loss-soft px-3 py-2 text-ds-loss"
          >
            {error}
          </p>
        )}
      </div>
    </DsModal>
  )
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="m-0 flex items-center gap-1 text-sm leading-5 text-ds-loss">
      <CircleX className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}
