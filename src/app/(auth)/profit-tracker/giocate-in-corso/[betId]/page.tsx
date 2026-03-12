'use client'

import { useMemo } from 'react'
import { notFound, useParams } from 'next/navigation'

import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { calcolaMovimento } from '@/lib/profit-tracker/calcs'
import type { BetLeg, OngoingBet } from '@/types/profit-tracker'

export default function BetDetailPage() {
  const params = useParams<{ betId: string }>()
  const betId =
    typeof params.betId === 'string'
      ? params.betId
      : Array.isArray(params.betId)
        ? params.betId[0]
        : ''

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allLegs = useProfitTrackerStore((s) => s.betLegs)

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])
  const legs = useMemo(() => allLegs.filter((l) => l.betId === betId), [allLegs, betId])
  const updateBet = useProfitTrackerStore((s) => s.updateOngoingBet)

  if (!betId) {
    notFound()
  }

  if (!bet) {
    notFound()
  }

  const handleLegChange = (
    legId: string,
    field: 'stake' | 'quota' | 'commissionePercentuale',
    value: number,
  ) => {
    useProfitTrackerStore.setState((state) => ({
      betLegs: state.betLegs.map((leg): BetLeg => {
        if (leg.id !== legId) return leg
        const patch: BetLeg = { ...leg, [field]: value } as BetLeg
        const stake = field === 'stake' ? value : leg.stake
        const quota = field === 'quota' ? value : leg.quota
        const comm = field === 'commissionePercentuale' ? value : (leg.commissionePercentuale ?? 0)
        patch.movimento = calcolaMovimento(stake, quota, comm)
        return patch
      }),
    }))
  }

  const handleStatoChange = (stato: OngoingBet['statoEvento']) => {
    updateBet(bet.id, { statoEvento: stato })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dettaglio puntata {bet.eventoNome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestisci le informazioni complete della giocata, inclusi stake, quota, comm% e movimento.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ID giocata
            </p>
            <p className="font-mono text-sm text-foreground">{bet.id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stato evento
            </p>
            <select
              value={bet.statoEvento}
              onChange={(e) => handleStatoChange(e.target.value)}
              className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="bozza">Bozza</option>
              <option value="in_corso">In corso</option>
              <option value="vinto">Vinto</option>
              <option value="perso">Perso</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Sport</th>
              <th className="px-3 py-2 text-left">Competizione</th>
              <th className="px-3 py-2 text-left">Mercato</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tipo bonus</th>
              <th className="px-3 py-2 text-left">Stake</th>
              <th className="px-3 py-2 text-left">Quota</th>
              <th className="px-3 py-2 text-left">Comm %</th>
              <th className="px-3 py-2 text-left">Movimento</th>
              <th className="px-3 py-2 text-left">Tag</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg) => (
              <tr key={leg.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(leg.eventoData).toLocaleString('it-IT')}
                </td>
                <td className="px-3 py-2 text-xs uppercase text-muted-foreground">{leg.sport}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.competizione}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.mercato}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.metodo}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.tipoBonus}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={leg.stake}
                    onChange={(e) => handleLegChange(leg.id, 'stake', Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={leg.quota}
                    onChange={(e) => handleLegChange(leg.id, 'quota', Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    value={leg.commissionePercentuale ?? 0}
                    onChange={(e) =>
                      handleLegChange(leg.id, 'commissionePercentuale', Number(e.target.value))
                    }
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium text-foreground">
                  {leg.movimento.toFixed(2)} €
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.tag ?? '—'}</td>
              </tr>
            ))}
            {legs.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={11}>
                  Nessun esito registrato per questa giocata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
