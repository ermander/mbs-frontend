'use client'

import { useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import {
  DsModal,
  GSelect,
  GTextField,
  type GOption,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  TIPO_BONUS_LABEL,
  isMultiplaMarkerLeg,
  legFormErrors,
  legFormPatch,
  legToForm,
  parseDecimal,
  type LegForm,
  type LegPatch,
} from '@/lib/profit-tracker/bet-detail'
import { cn, sanitizeDecimal } from '@/lib/utils'
import type { BetLeg } from '@/types/profit-tracker'

const TIPO_BONUS_OPTIONS = (Object.keys(TIPO_BONUS_LABEL) as BetLeg['tipoBonus'][]).map((v) => ({
  value: v,
  label: TIPO_BONUS_LABEL[v],
}))

const money = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * «Modifica gamba» dal design (§14.283): evento e data, mercato e selezione, conto, tipo bonus,
 * quote, importo, commissione con la responsabilità sotto. Il metodo si legge, non si cambia.
 * Il modulo nasce dalla gamba a ogni apertura (il componente si rimonta con la chiave della
 * gamba); al salvataggio passa solo i campi cambiati.
 */
export function LegEditModal({
  leg,
  multipla,
  accountOptions,
  onClose,
  onSave,
}: {
  leg: BetLeg
  multipla: boolean
  /** Conti per il metodo della gamba (la banca solo sugli exchange), «Book · collaboratore». */
  accountOptions: GOption[]
  onClose: () => void
  onSave: (patch: LegPatch) => Promise<void>
}) {
  const [form, setForm] = useState<LegForm>(() => legToForm(leg))
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof LegForm>(k: K, v: LegForm[K]) => setForm((f) => ({ ...f, [k]: v }))
  const num = (k: keyof LegForm) => (v: string) => set(k, sanitizeDecimal(v))

  const allErrors = legFormErrors(leg, form, multipla)
  // Gli errori dei numeri compaiono appena scritti, gli altri dopo il primo «Salva».
  const errors = tried
    ? allErrors
    : {
        quota: form.quota !== '' ? allErrors.quota : undefined,
        stake: form.stake !== '' ? allErrors.stake : undefined,
        commissione: allErrors.commissione,
        quotaRiferimento: allErrors.quotaRiferimento,
      }

  const isBanca = leg.metodo === 'banca'
  const markerLeg = isMultiplaMarkerLeg(leg)
  const quota = parseDecimal(form.quota)
  const stake = parseDecimal(form.stake)
  const liability =
    isBanca && quota != null && stake != null && quota > 1 ? stake * (quota - 1) : null

  const save = async () => {
    if (Object.keys(allErrors).length > 0) {
      setTried(true)
      return
    }
    const patch = legFormPatch(leg, form)
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    try {
      await onSave(patch)
    } finally {
      setSaving(false)
    }
  }

  const options = accountOptions.some((o) => o.value === leg.accountId)
    ? accountOptions
    : [{ value: leg.accountId, label: 'Conto attuale' }, ...accountOptions]

  return (
    <DsModal
      open
      onOpenChange={(next) => !next && !saving && onClose()}
      title="Modifica gamba"
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <DsBadge tone={isBanca ? 'info' : 'brand'}>{isBanca ? 'Banca' : 'Punta'}</DsBadge>
          {[leg.selezione || leg.mercato, leg.eventoNome].filter(Boolean).join(' · ')}
        </span>
      }
      size="lg"
      footer={
        <>
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
            onClick={() => void save()}
            disabled={saving}
            className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-50')}
          >
            {saving ? 'Salvataggio…' : 'Salva la gamba'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <GTextField
            id="gamba-evento"
            label="Evento"
            value={form.eventoNome}
            onChange={(v) => set('eventoNome', v)}
            error={errors.eventoNome}
          />
          <GTextField
            id="gamba-data"
            label="Data e ora"
            type="datetime-local"
            value={form.eventoDataLocal}
            onChange={(v) => set('eventoDataLocal', v)}
            error={errors.eventoDataLocal}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GTextField
            id="gamba-mercato"
            label="Mercato"
            placeholder="Es. Esito finale 1X2"
            value={form.mercato}
            onChange={(v) => set('mercato', v)}
            error={errors.mercato}
            disabled={markerLeg}
            hint={markerLeg ? 'La punta della multipla resta «Multipla».' : undefined}
          />
          <GTextField
            id="gamba-selezione"
            label="Selezione"
            optional
            placeholder="Es. Over 2,5"
            value={form.selezione}
            onChange={(v) => set('selezione', v)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <GSelect
            id="gamba-conto"
            label="Conto"
            options={options}
            value={form.accountId}
            onChange={(v) => set('accountId', v)}
            error={errors.accountId}
          />
          {isBanca ? (
            <GTextField
              id="gamba-commissione"
              label="Commissione"
              numeric
              suffix="%"
              value={form.commissione}
              onChange={num('commissione')}
              error={errors.commissione}
            />
          ) : (
            <GSelect
              id="gamba-tipo-bonus"
              label="Tipo bonus"
              options={TIPO_BONUS_OPTIONS}
              value={form.tipoBonus}
              onChange={(v) => set('tipoBonus', v as BetLeg['tipoBonus'])}
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GTextField
            id="gamba-quota"
            label={multipla ? (isBanca ? 'Quota banca' : 'Quota totale') : 'Quota'}
            numeric
            placeholder="Es. 1,85"
            value={form.quota}
            onChange={num('quota')}
            error={errors.quota}
          />
          {multipla && leg.metodo !== 'punta' && (
            <GTextField
              id="gamba-quota-punta"
              label="Quota punta"
              numeric
              value={form.quotaRiferimento}
              onChange={num('quotaRiferimento')}
              error={errors.quotaRiferimento}
              hint="Cambia la quota totale della multipla."
            />
          )}
          <GTextField
            id="gamba-importo"
            label={isBanca ? 'Bancata' : 'Puntata'}
            numeric
            suffix="€"
            placeholder="Es. 50"
            value={form.stake}
            onChange={num('stake')}
            error={errors.stake}
            hint={
              isBanca
                ? `Responsabilità ${liability != null ? `${money.format(liability)} €` : '—'}`
                : undefined
            }
          />
          {form.tipoBonus === 'bonus' && !isBanca && (
            <GTextField
              id="gamba-bonus"
              label="Bonus"
              numeric
              suffix="€"
              value={form.bonusValore}
              onChange={num('bonusValore')}
              error={errors.bonusValore}
            />
          )}
          {form.tipoBonus === 'rimborso' && !isBanca && (
            <GTextField
              id="gamba-rimborso"
              label="Rimborso"
              numeric
              suffix="€"
              value={form.rimborsoValore}
              onChange={num('rimborsoValore')}
              error={errors.rimborsoValore}
            />
          )}
        </div>
        {multipla && (
          <p className="ds-body-sm m-0 text-ds-ink-muted">
            Nella multipla, quote, puntata, bonus e rimborso ricalcolano le coperture ancora aperte.
          </p>
        )}
      </div>
    </DsModal>
  )
}
