'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  getEventTree,
  getCompetitionEvents,
  getOddsStats,
} from '@/services/api/odds-collection-client'
import type { TreeSport, CompetitionEvent, OddsCollectionStats } from '@/types/odds-collection'

export default function EventiSportradarPage() {
  const [tree, setTree] = useState<TreeSport[]>([])
  const [stats, setStats] = useState<OddsCollectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected competition → events
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null)
  const [selectedCompName, setSelectedCompName] = useState<string>('')
  const [events, setEvents] = useState<CompetitionEvent[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsOffset, setEventsOffset] = useState(0)
  const EVENTS_LIMIT = 50

  const loadTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [treeData, statsData] = await Promise.all([getEventTree(), getOddsStats()])
      setTree(treeData.tree)
      setStats(statsData)
    } catch {
      setError("Errore nel caricamento dell'alberatura.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  const loadEvents = useCallback(async (compId: string, offset: number) => {
    setEventsLoading(true)
    try {
      const data = await getCompetitionEvents(compId, { limit: EVENTS_LIMIT, offset })
      setEvents(data.events)
      setEventsTotal(data.total)
      setEventsOffset(offset)
    } catch {
      setEvents([])
      setEventsTotal(0)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  const selectCompetition = (compId: string, compName: string) => {
    setSelectedCompId(compId)
    setSelectedCompName(compName)
    setEventsOffset(0)
    void loadEvents(compId, 0)
  }

  const totalEvents = tree.reduce(
    (sum, s) =>
      sum +
      s.categories.reduce(
        (cSum, cat) => cSum + cat.competitions.reduce((compSum, c) => compSum + c.eventCount, 0),
        0,
      ),
    0,
  )

  return (
    <Container>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Alberatura Eventi Sportradar
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualizzazione gerarchica degli eventi ingeriti dal reference provider.
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Sport" value={stats.sports} />
          <StatCard label="Categorie" value={stats.categories} />
          <StatCard label="Competizioni" value={stats.competitions} />
          <StatCard label="Eventi totali" value={stats.events_total} />
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Caricamento...</p>
      ) : tree.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Nessun dato disponibile. Verifica che l&apos;ingestione Sportradar sia attiva.
        </p>
      ) : (
        /* Tree: Sport → Category → Competitions */
        <Accordion type="multiple" className="space-y-2">
          {tree.map((sport) => (
            <AccordionItem key={sport.id} value={sport.id}>
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center gap-2">
                  {sport.name}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {sport.categories.length} categorie
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pl-2">
                <Accordion type="multiple" className="space-y-1">
                  {sport.categories.map((cat) => (
                    <AccordionItem key={cat.id} value={cat.id}>
                      <AccordionTrigger className="text-sm font-medium">
                        <span className="flex items-center gap-2">
                          {cat.countryCode && (
                            <span className="text-xs text-muted-foreground">
                              [{cat.countryCode}]
                            </span>
                          )}
                          {cat.name}
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                            {cat.competitions.length}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {cat.competitions.map((comp) => (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => selectCompetition(comp.id, comp.name)}
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                                selectedCompId === comp.id
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-foreground'
                              }`}
                            >
                              <span>
                                {comp.name}
                                {comp.youth && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">
                                    (Youth)
                                  </span>
                                )}
                                {comp.gender === 'female' && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">(W)</span>
                                )}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {comp.eventCount} eventi
                              </span>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Events table for selected competition */}
      {selectedCompId && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedCompName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({eventsTotal} eventi)
              </span>
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCompId(null)
                setEvents([])
              }}
            >
              Chiudi
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Data/Ora
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Casa</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Trasferta
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Stato</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Giornata
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Stagione
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Caricamento...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Nessun evento.
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-t border-border transition-colors hover:bg-accent"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-foreground">
                        {formatDateTime(ev.startTime)}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">
                        {ev.homeName ?? '—'}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">
                        {ev.awayName ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={ev.status} />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{ev.round ?? '—'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{ev.seasonName ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {eventsTotal > EVENTS_LIMIT && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {eventsOffset + 1}–{Math.min(eventsOffset + EVENTS_LIMIT, eventsTotal)} di{' '}
                {eventsTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={eventsOffset === 0}
                  onClick={() => void loadEvents(selectedCompId, eventsOffset - EVENTS_LIMIT)}
                >
                  Precedenti
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={eventsOffset + EVENTS_LIMIT >= eventsTotal}
                  onClick={() => void loadEvents(selectedCompId, eventsOffset + EVENTS_LIMIT)}
                >
                  Successivi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

// --- Helper components ---

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-2xl font-bold text-foreground">{value.toLocaleString('it-IT')}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-500/15 text-blue-400',
    live: 'bg-green-500/15 text-green-400',
    closed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-red-500/15 text-red-400',
    postponed: 'bg-yellow-500/15 text-yellow-400',
    rescheduled: 'bg-orange-500/15 text-orange-400',
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {status}
    </span>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
