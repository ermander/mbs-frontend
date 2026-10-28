'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  GSelect,
  GTabs,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { cn, sanitizeDecimal } from '@/lib/utils'
import type {
  BetBonusType,
  BetCategory,
  ModalitaSaldo,
  OngoingBet,
  SportType,
} from '@/types/profit-tracker'

interface SingolaBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** La giocata appena salvata, per l'avviso e il lampo della riga. */
  onSaved?: (bet: OngoingBet) => void
}

const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'calcio', label: 'Calcio' },
  { value: 'basket', label: 'Basket' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'altro', label: 'Altro' },
]

const TIPO_STAKE_OPTIONS: { value: BetBonusType; label: string }[] = [
  { value: 'none', label: 'Reale' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'rimborso', label: 'Rimborso' },
  { value: 'freebet', label: 'Freebet' },
]

const STAKE_LABEL: Record<BetBonusType, string> = {
  none: 'Importo reale',
  bonus: 'Importo bonus',
  rimborso: 'Importo rimborso',
  freebet: 'Importo freebet',
}

const CATEGORY_ITEMS: { value: BetCategory; label: string }[] = [
  { value: 'matched_betting', label: 'Matched betting' },
  { value: 'surebet', label: 'Surebet' },
  { value: 'valuebet', label: 'Valuebet' },
]

function modalitaSaldoFromTipoBonus(tipoBonus: BetBonusType): ModalitaSaldo {
  if (tipoBonus === 'bonus' || tipoBonus === 'freebet') return 'bonus'
  if (tipoBonus === 'rimborso') return 'rimborso'
  return 'reale'
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * «Nuova giocata singola» dal design (§14.281): Evento (sport, squadre, data e ora, mercato,
 * selezione) e Scommessa (categoria a schede, conto, modalità saldo, quota, importo,
 * descrizione). Stessa giocata salvata di prima: una gamba punta in bozza sul conto scelto.
 */
export function SingolaBetModal({ open, onOpenChange, onSaved }: SingolaBetModalProps) {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const allBooks = useProfitTrackerStore((s) => s.allBooks)
  const allHolders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [sport, setSport] = useState<SportType>('calcio')
  const [eventoNome, setEventoNome] = useState('')
  const [eventoDataLocal, setEventoDataLocal] = useState('')
  const [mercato, setMercato] = useState('')
  const [selezione, setSelezione] = useState('')
  const [accountId, setAccountId] = useState('')
  const [quota, setQuota] = useState('')
  const [tipoBonus, setTipoBonus] = useState<BetBonusType>('none')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [stake, setStake] = useState('')
  const [nota, setNota] = useState('')
  const [tried, setTried] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setSport('calcio')
    setEventoNome('')
    setEventoDataLocal('')
    setMercato('')
    setSelezione('')
    setAccountId('')
    setQuota('')
    setTipoBonus('none')
    setCategoria('matched_betting')
    setStake('')
    setNota('')
    setTried(false)
    setIsSaving(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchAllAccounts()
    void fetchAllBooks()
    void fetchAllHolders()
  }, [open, fetchAllAccounts, fetchAllBooks, fetchAllHolders])

  const close = useCallback(() => {
    resetState()
    onOpenChange(false)
  }, [resetState, onOpenChange])

  const accountOptions = useMemo(
    () =>
      allAccounts
        .map((a) => {
          const book = allBooks.find((b) => b.id === a.bookId)
          const holder = allHolders.find((h) => h.id === a.holderId)
          const label = book && holder ? `${book.nome} · ${holder.nome}` : a.nome
          return { value: a.id, label }
        })
        .sort((x, y) => x.label.localeCompare(y.label, 'it')),
    [allAccounts, allBooks, allHolders],
  )

  const stakeNum = parseNum(stake)
  const quotaNum = parseNum(quota)

  // Gli errori compaiono dopo il primo «Salva»; quota e importo anche appena scritti.
  const errors = {
    evento: tried && !eventoNome.trim() ? "Scrivi il nome dell'evento" : undefined,
    data: tried && !eventoDataLocal ? "Indica data e ora dell'evento" : undefined,
    mercato:
      tried && !mercato.trim() ? 'Indica il mercato, ad esempio 1X2 o Over/Under' : undefined,
    conto: tried && !accountId ? 'Scegli il conto su cui hai giocato' : undefined,
    quota:
      (quota !== '' || tried) && (quotaNum == null || quotaNum <= 1)
        ? 'Serve una quota sopra 1'
        : undefined,
    stake:
      (stake !== '' || tried) && (stakeNum == null || stakeNum <= 0)
        ? 'Serve un importo sopra 0 €'
        : undefined,
  }
  const canSave =
    !!eventoNome.trim() &&
    !!mercato.trim() &&
    !!eventoDataLocal &&
    !!accountId &&
    stakeNum != null &&
    stakeNum > 0 &&
    quotaNum != null &&
    quotaNum > 1

  const handleSave = async () => {
    if (!canSave || stakeNum == null || quotaNum == null) {
      setTried(true)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const eventoDataIso = new Date(eventoDataLocal).toISOString()
      const betPayload = {
        eventoData: eventoDataIso,
        categoria,
        sport,
        eventoNome: eventoNome.trim(),
        modalitaSaldo: modalitaSaldoFromTipoBonus(tipoBonus),
        accountId,
        tag: undefined as string | undefined,
        nota: nota.trim() ? nota.trim() : undefined,
      }

      const legPayload = {
        eventoData: eventoDataIso,
        sport,
        eventoNome: eventoNome.trim(),
        competizione: 'N/D',
        mercato: mercato.trim(),
        selezione: selezione.trim() ? selezione.trim() : undefined,
        metodo: 'punta' as const,
        tipoBonus,
        accountId,
        stake: stakeNum,
        quota: quotaNum,
        rischio: 0,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
        posizione: 0,
      }

      const bet = await saveOngoingBetFromCalculator(betPayload, [legPayload])
      close()
      onSaved?.(bet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della giocata')
      setIsSaving(false)
    }
  }

  const sectionLabel = 'ds-label m-0 uppercase text-ds-ink-muted'

  return (
    <DsModal
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Nuova giocata singola"
      description="Una sola scommessa su un conto: evento, mercato, quota e importo."
      size="lg"
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
            {isSaving ? 'Salvataggio…' : 'Salva la giocata'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className={sectionLabel}>Evento</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)]">
            <GSelect
              id="singola-sport"
              label="Sport"
              options={SPORT_OPTIONS}
              value={sport}
              onChange={(v) => setSport(v as SportType)}
            />
            <GTextField
              id="singola-evento"
              label="Squadra o evento"
              placeholder="Es. Juventus – Milan"
              value={eventoNome}
              onChange={setEventoNome}
              error={errors.evento}
            />
            <GTextField
              id="singola-data"
              label="Data e ora dell'evento"
              type="datetime-local"
              value={eventoDataLocal}
              onChange={setEventoDataLocal}
              error={errors.data}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GTextField
              id="singola-mercato"
              label="Mercato"
              placeholder="Es. Esito finale 1X2"
              value={mercato}
              onChange={setMercato}
              error={errors.mercato}
            />
            <GTextField
              id="singola-selezione"
              label="Selezione"
              optional
              placeholder="Es. Over 2,5"
              value={selezione}
              onChange={setSelezione}
            />
          </div>
        </div>

        <div className="h-px bg-ds-line" />

        <div className="flex flex-col gap-2">
          <p className={sectionLabel}>Scommessa</p>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold leading-5 text-ds-ink">Categoria</span>
            <GTabs
              label="Categoria"
              items={CATEGORY_ITEMS}
              value={categoria}
              onChange={setCategoria}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
            <GSelect
              id="singola-conto"
              label="Conto"
              options={[{ value: '', label: 'Scegli un conto', disabled: true }, ...accountOptions]}
              value={accountId}
              onChange={setAccountId}
              error={errors.conto}
            />
            <GSelect
              id="singola-tipo-stake"
              label="Modalità saldo"
              options={TIPO_STAKE_OPTIONS}
              value={tipoBonus}
              onChange={(v) => setTipoBonus(v as BetBonusType)}
            />
            <GTextField
              id="singola-quota"
              label="Quota"
              numeric
              placeholder="Es. 1,85"
              value={quota}
              onChange={(v) => setQuota(sanitizeDecimal(v))}
              error={errors.quota}
            />
            <GTextField
              id="singola-stake"
              label={STAKE_LABEL[tipoBonus]}
              numeric
              suffix="€"
              placeholder="Es. 50"
              value={stake}
              onChange={(v) => setStake(sanitizeDecimal(v))}
              error={errors.stake}
            />
          </div>
          <GTextField
            id="singola-nota"
            label="Descrizione"
            optional
            placeholder="Note sulla giocata, motivazione della valuebet, limiti da verificare"
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
