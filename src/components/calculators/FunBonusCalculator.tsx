'use client'

import { useMemo, useState } from 'react'

import { computeFunBonus } from '@/lib/calculators/engines/fun-bonus-engine'
import { parseNum } from '@/lib/calculators/engines/odds'
import { CalcLayout, CalcNote, CalcNumberField, amount } from '@/components/calculators/calc-ds'

/**
 * Calcolatore offline del target per un fun bonus: dato il bonus, il
 * rollover, la contribuzione del gioco, l'RTP della slot e quanto è già stato
 * giocato, dice con quale saldo minimo passare a spin bassi per finire il
 * rollover restando, in attesa, con il bonus da convertire.
 */

const DEFAULT_CONTRIBUZIONE = '100'
const DEFAULT_RTP = '95'

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

  const giaGiocatoNum = parseNum(giaGiocato)
  const rows: [string, string][] =
    result.target != null
      ? [
          [
            ridotta
              ? `Da giocare in totale (${formatRollover(result.rolloverEffettivo)} per la contribuzione del ${contribuzione} %)`
              : `Da giocare in totale (${formatRollover(result.rolloverEffettivo)})`,
            amount(result.wagTotale),
          ],
          ['Già giocato', amount(giaGiocatoNum ?? 0)],
          ['Residuo da giocare', amount(result.wagResiduo)],
          [`Perdita attesa (1 − RTP ${rtp} %)`, amount(result.perditaAttesa)],
          ['Bonus da convertire', amount(result.bonusConvertibile)],
        ]
      : []

  return (
    <div className="flex flex-col gap-8">
      <CalcLayout
        outcomes={
          <>
            <div className="flex flex-col gap-2 rounded-ds-lg border border-ds-line bg-ds-brand-soft p-6">
              <div className="ds-caption text-ds-ink-muted">
                Saldo target per iniziare il rollover a spin bassi
              </div>
              <div
                aria-live="polite"
                data-testid="fb-target"
                className="ds-num-xl text-[40px] leading-[44px] text-ds-brand"
              >
                {amount(result.target)}
              </div>
              <div className="ds-body-sm text-ds-ink-muted">
                Bonus da convertire{' '}
                <b className="ds-num text-ds-ink">{amount(result.bonusConvertibile)}</b> + perdita
                attesa <b className="ds-num text-ds-ink">{amount(result.perditaAttesa)}</b>
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="rounded-ds-md border border-ds-line bg-ds-surface-raised px-5 py-1 shadow-ds-sm">
                {rows.map(([label, value], i) => (
                  <div
                    key={label}
                    className={
                      'flex items-baseline justify-between gap-4 py-3' +
                      (i < rows.length - 1 ? ' border-b border-ds-line' : '')
                    }
                  >
                    <span className="ds-body-sm text-ds-ink-muted">{label}</span>
                    <span className="ds-num whitespace-nowrap">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <CalcNote title="Servono bonus e rollover">
                Il target compare quando bonus erogato e rollover richiesto sono compilati.
              </CalcNote>
            )}

            <p className="ds-body-sm m-0 text-ds-ink-muted">
              Il target è il saldo minimo con cui iniziare a rollare a spin bassi: il bonus da
              convertire più la perdita attesa (1 − RTP) su quanto resta da giocare. Se la
              contribuzione del gioco è sotto il 100 % il rollover effettivo aumenta; quanto hai già
              giocato riduce il residuo.
            </p>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="fb-bonus"
              label="Bonus erogato"
              size="lg"
              suffix="€"
              value={bonus}
              onChange={setBonus}
            />
            <div className="grid grid-cols-2 items-end gap-3">
              <CalcNumberField
                id="fb-rollover"
                label="Rollover richiesto"
                suffix="x"
                placeholder="35"
                value={rollover}
                onChange={setRollover}
              />
              <CalcNumberField
                id="fb-contribuzione"
                label="Contribuzione del gioco"
                suffix="%"
                value={contribuzione}
                onChange={setContribuzione}
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <CalcNumberField
                id="fb-rtp"
                label="RTP della slot"
                suffix="%"
                value={rtp}
                onChange={setRtp}
              />
              <CalcNumberField
                id="fb-gia-giocato"
                label="Già giocato"
                suffix="€"
                value={giaGiocato}
                onChange={setGiaGiocato}
              />
            </div>
            <CalcNumberField
              id="fb-bonus-massimo"
              label="Bonus massimo ottenibile"
              suffix="€"
              placeholder="= bonus erogato"
              value={bonusMassimo}
              onChange={setBonusMassimo}
            />
          </>
        }
      />
    </div>
  )
}

function formatRollover(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? `${n}x` : `${n.toFixed(2).replace('.', ',')}x`
}
