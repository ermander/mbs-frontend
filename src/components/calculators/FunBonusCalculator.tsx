'use client'

import { useMemo, useState } from 'react'

import { computeFunBonus } from '@/lib/calculators/engines/fun-bonus-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { AmountField, formatNum } from '@/components/calculators/casino-shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Calcolatore offline del target per un fun bonus: dato il bonus, il
 * rollover, la contribuzione del gioco, l'RTP della slot e quanto è già stato
 * giocato, dice con quale saldo minimo passare a spin bassi per finire il
 * rollover restando, in attesa, con il bonus da convertire.
 */

const DEFAULT_CONTRIBUZIONE = '100'
const DEFAULT_RTP = '95'

interface UnitFieldProps {
  id: string
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}

function UnitField({ id, label, unit, value, onChange, placeholder, hint }: UnitFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          placeholder={placeholder ?? '0'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {unit}
        </span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function FunBonusCalculator() {
  const [bonus, setBonus] = useState('')
  const [rollover, setRollover] = useState('')
  const [contribuzione, setContribuzione] = useState(DEFAULT_CONTRIBUZIONE)
  const [rtp, setRtp] = useState(DEFAULT_RTP)
  const [giaGiocato, setGiaGiocato] = useState('')
  const [bonusMassimo, setBonusMassimo] = useState('')

  const result = useMemo(
    () =>
      computeFunBonus({
        bonus: parseNum(bonus),
        rollover: parseNum(rollover),
        contribuzionePercent: parseNum(contribuzione),
        rtpPercent: parseNum(rtp),
        giaGiocato: parseNum(giaGiocato),
        bonusMassimo: parseNum(bonusMassimo),
      }),
    [bonus, rollover, contribuzione, rtp, giaGiocato, bonusMassimo],
  )

  const contribuzioneNum = parseNum(contribuzione)
  const ridotta = contribuzioneNum != null && contribuzioneNum > 0 && contribuzioneNum < 100

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
        Il target è il saldo minimo con cui iniziare a rollare a spin bassi: il bonus da convertire
        più la perdita attesa (1 − RTP) su quanto resta da giocare. Se la contribuzione del gioco è
        sotto il 100% il rollover effettivo aumenta; quanto hai già giocato riduce il residuo.
      </div>

      <div className="space-y-4 border-b border-border bg-muted/40 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <AmountField id="fb-bonus" label="Bonus erogato" value={bonus} onChange={setBonus} />
          <UnitField
            id="fb-rollover"
            label="Rollover richiesto"
            unit="x"
            value={rollover}
            onChange={setRollover}
            placeholder="35"
          />
          <UnitField
            id="fb-contribuzione"
            label="Contribuzione del gioco"
            unit="%"
            value={contribuzione}
            onChange={setContribuzione}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <UnitField
            id="fb-rtp"
            label="RTP della slot"
            unit="%"
            value={rtp}
            onChange={setRtp}
            hint="La slot con cui farai il rollover a spin bassi."
          />
          <AmountField
            id="fb-gia-giocato"
            label="Già giocato"
            value={giaGiocato}
            onChange={setGiaGiocato}
          />
          <div className="space-y-2">
            <AmountField
              id="fb-bonus-massimo"
              label="Bonus massimo ottenibile"
              value={bonusMassimo}
              onChange={setBonusMassimo}
            />
            <p className="text-xs text-muted-foreground">Vuoto = pari al bonus erogato.</p>
          </div>
        </div>
      </div>

      {result.target != null ? (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            <p>
              Da giocare in totale{' '}
              <span className="font-mono font-medium">{formatNum(result.wagTotale)} €</span>
              <span className="text-muted-foreground">
                {' '}
                ({formatNum(parseNum(bonus))} € × {formatRollover(result.rolloverEffettivo)}
                {ridotta && <> per la contribuzione del {contribuzione}%</>})
              </span>
              .
            </p>
            <p>
              Ancora da giocare{' '}
              <span className="font-mono font-medium">{formatNum(result.wagResiduo)} €</span>
              {parseNum(giaGiocato) ? (
                <span className="text-muted-foreground">
                  {' '}
                  (già giocati {formatNum(parseNum(giaGiocato))} €)
                </span>
              ) : null}
              , con una perdita attesa di{' '}
              <span className="font-mono font-medium text-destructive">
                {formatNum(result.perditaAttesa)} €
              </span>{' '}
              a RTP {rtp}%.
            </p>
            <p>
              Target da raggiungere prima di rollare a spin bassi:{' '}
              <span
                className="font-mono text-lg font-semibold text-primary"
                data-testid="fb-target"
              >
                {formatNum(result.target)} €
              </span>
              <span className="text-muted-foreground">
                {' '}
                ({formatNum(result.bonusConvertibile)} € di bonus +{' '}
                {formatNum(result.perditaAttesa)} € di perdita)
              </span>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="border-b border-border bg-card p-4 text-sm text-muted-foreground">
          Inserisci bonus e rollover per vedere il target.
        </div>
      )}
    </div>
  )
}

function formatRollover(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? `${n}x` : `${n.toFixed(2)}x`
}
