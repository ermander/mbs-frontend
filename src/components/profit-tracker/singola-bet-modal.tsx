'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsMoney } from '@/components/landing/ds-data'
import {
  DsModal,
  GSelect,
  GTabs,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { valoreAttesoGamba, vantaggioPercentuale } from '@/lib/profit-tracker/expected-value'
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

/** L'importo che non è saldo reale: bonus e freebet vanno in `bonusValore`, il rimborso in `rimborsoValore`. */
const VALORE_LABEL: Record<Exclude<BetBonusType, 'none'>, string> = {
  bonus: 'Importo bonus',
  rimborso: 'Importo rimborso',
  freebet: 'Importo freebet',
}

const VALORE_HINT: Record<Exclude<BetBonusType, 'none'>, string> = {
  bonus: 'Saldo bonus giocato insieme al reale: metti 0 € nel reale se hai usato solo il bonus.',
  rimborso: 'Quanto ti viene rimborsato se la scommessa perde.',
  freebet: 'Valore della freebet: metti 0 € nel reale se hai giocato solo quella.',
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

const pct = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * «Nuova giocata singola» dal design (§14.281): Evento (sport, squadre, data e ora, mercato,
 * selezione) e Scommessa (categoria a schede, conto, modalità saldo, quota, importo,
 * descrizione). Stessa giocata salvata di prima: una gamba punta in bozza sul conto scelto.
 * Con bonus, freebet o rimborso si scrivono due importi: il reale giocato (anche 0 €) e il
 * valore del bonus, della freebet o del rimborso, che la gamba tiene separato dal reale.
 * Nella categoria Valuebet (§14.337) c'è anche la quota reale (fair), opzionale: con quota e
 * importo la modale mostra il valore atteso e il vantaggio, e la gamba la salva in `quotaReale`.
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
  const [quotaReale, setQuotaReale] = useState('')
  const [tipoBonus, setTipoBonus] = useState<BetBonusType>('none')
  const [categoria, setCategoria] = useState<BetCategory>('matched_betting')
  const [stakeReale, setStakeReale] = useState('')
  const [valore, setValore] = useState('')
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
    setQuotaReale('')
    setTipoBonus('none')
    setCategoria('matched_betting')
    setStakeReale('')
    setValore('')
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

  const quotaNum = parseNum(quota)
  // Con un saldo diverso dal reale il campo reale può restare vuoto: vale 0 €.
  const realeNum = tipoBonus === 'none' ? parseNum(stakeReale) : (parseNum(stakeReale) ?? 0)
  const valoreNum = tipoBonus === 'none' ? 0 : parseNum(valore)
  // Reale e rimborso si giocano con soldi veri: il reale deve esserci. Bonus e freebet possono
  // essere giocati da soli, ma il loro importo deve esserci.
  const realeMin = tipoBonus === 'none' || tipoBonus === 'rimborso' ? 0 : -1
  const realeOk = realeNum != null && realeNum > realeMin
  const valoreOk = tipoBonus === 'none' || (valoreNum != null && valoreNum > 0)
  // La quota reale vale solo per le valuebet ed è facoltativa: se c'è, deve essere sopra 1.
  const isValuebet = categoria === 'valuebet'
  const quotaRealeNum = isValuebet ? parseNum(quotaReale) : null
  const quotaRealeOk = !isValuebet || quotaReale.trim() === '' || (quotaRealeNum ?? 0) > 1
  const valoreAtteso =
    isValuebet && realeOk && valoreOk && quotaNum != null && quotaNum > 1 && quotaRealeOk
      ? valoreAttesoGamba({
          metodo: 'punta',
          stake: realeNum ?? 0,
          quota: quotaNum,
          quotaReale: quotaRealeNum,
          tipoBonus,
          bonusValore: valoreNum ?? 0,
          commissionePercentuale: 0,
        })
      : null
  const vantaggio =
    quotaNum != null && quotaRealeOk ? vantaggioPercentuale(quotaNum, quotaRealeNum) : null

  // Gli errori compaiono dopo il primo «Salva»; quota e importi anche appena scritti.
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
    reale:
      (stakeReale !== '' || tried) && !realeOk
        ? realeMin === 0
          ? 'Serve un importo sopra 0 €'
          : 'Serve un importo da 0 € in su'
        : undefined,
    valore: (valore !== '' || tried) && !valoreOk ? 'Serve un importo sopra 0 €' : undefined,
    quotaReale: !quotaRealeOk ? 'Serve una quota sopra 1' : undefined,
  }
  const canSave =
    !!eventoNome.trim() &&
    !!mercato.trim() &&
    !!eventoDataLocal &&
    !!accountId &&
    realeOk &&
    valoreOk &&
    quotaRealeOk &&
    quotaNum != null &&
    quotaNum > 1

  const handleSave = async () => {
    if (!canSave || realeNum == null || quotaNum == null) {
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
        // Solo il reale nella puntata (§14.115): bonus e freebet in bonusValore, il rimborso in
        // rimborsoValore, come fanno i calcolatori.
        stake: realeNum,
        quota: quotaNum,
        quotaReale: quotaRealeNum != null && quotaRealeNum > 1 ? quotaRealeNum : undefined,
        rischio: 0,
        bonusValore:
          (tipoBonus === 'bonus' || tipoBonus === 'freebet') && valoreNum ? valoreNum : undefined,
        rimborsoValore: tipoBonus === 'rimborso' && valoreNum ? valoreNum : undefined,
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
            <span className="text-sm leading-5 font-semibold text-ds-ink">Categoria</span>
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
              label="Importo reale"
              numeric
              suffix="€"
              placeholder={tipoBonus === 'none' ? 'Es. 50' : 'Es. 0'}
              value={stakeReale}
              onChange={(v) => setStakeReale(sanitizeDecimal(v))}
              error={errors.reale}
            />
          </div>
          {isValuebet && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GTextField
                id="singola-quota-reale"
                label="Quota reale"
                optional
                numeric
                placeholder="Es. 1,75"
                value={quotaReale}
                onChange={(v) => setQuotaReale(sanitizeDecimal(v))}
                error={errors.quotaReale}
                hint="La quota giusta secondo te, senza il margine del book: serve per il valore atteso."
              />
              <div
                className="flex min-w-0 flex-col gap-1 rounded-ds-sm border border-ds-line bg-ds-surface-sunken px-3 py-2"
                aria-live="polite"
              >
                <span className="text-sm leading-5 font-semibold text-ds-ink">Valore atteso</span>
                {valoreAtteso != null ? (
                  <>
                    <DsMoney value={valoreAtteso} size="md" />
                    <span className="ds-caption text-ds-ink-muted">
                      {vantaggio != null
                        ? `Vantaggio ${pct.format(vantaggio)} % sulla quota reale`
                        : ''}
                      {tipoBonus === 'rimborso' ? ' · il rimborso non è contato' : ''}
                    </span>
                  </>
                ) : (
                  <span className="ds-caption text-ds-ink-muted">
                    Scrivi quota, importo e quota reale per vederlo.
                  </span>
                )}
              </div>
            </div>
          )}
          {tipoBonus !== 'none' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GTextField
                id="singola-valore"
                label={VALORE_LABEL[tipoBonus]}
                numeric
                suffix="€"
                placeholder="Es. 50"
                value={valore}
                onChange={(v) => setValore(sanitizeDecimal(v))}
                error={errors.valore}
                hint={VALORE_HINT[tipoBonus]}
              />
            </div>
          )}
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
