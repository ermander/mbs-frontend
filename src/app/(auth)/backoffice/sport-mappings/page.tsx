'use client'

import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Container } from '@/components/ui/container'
import {
  getScrapers,
  getSportMappings,
  getCanonicalSports,
  createSportMapping,
  updateSportMapping,
  deleteSportMapping,
  type BackofficeScraper,
  type SportMapping,
  type CanonicalSport,
} from '@/services/api/backoffice-scrapers-client'

interface EditingMapping {
  id: string
  bookmaker_sport_code: string
  bookmaker_sport_name: string
}

interface NewMapping {
  sport_id: string
  bookmaker_id: string
  bookmaker_sport_code: string
  bookmaker_sport_name: string
}

const EMPTY_NEW: NewMapping = {
  sport_id: '',
  bookmaker_id: '',
  bookmaker_sport_code: '',
  bookmaker_sport_name: '',
}

export default function SportMappingsPage() {
  const [mappings, setMappings] = useState<SportMapping[]>([])
  const [sports, setSports] = useState<CanonicalSport[]>([])
  const [bookmakers, setBookmakers] = useState<BackofficeScraper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editing, setEditing] = useState<EditingMapping | null>(null)

  // New mapping form
  const [showNew, setShowNew] = useState(false)
  const [newMapping, setNewMapping] = useState<NewMapping>(EMPTY_NEW)

  // Filter
  const [filterBookmaker, setFilterBookmaker] = useState<string>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, s, b] = await Promise.all([getSportMappings(), getCanonicalSports(), getScrapers()])
      setMappings(m)
      setSports(s)
      setBookmakers(b)
    } catch {
      setError('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Group mappings by sport name
  const groupedBySport = mappings.reduce<Record<string, SportMapping[]>>((acc, m) => {
    if (!acc[m.sport_name]) acc[m.sport_name] = []
    acc[m.sport_name].push(m)
    return acc
  }, {})

  const filteredSportNames = Object.keys(groupedBySport)
    .filter((sportName) => {
      if (filterBookmaker === 'all') return true
      return groupedBySport[sportName].some((m) => m.bookmaker_id === filterBookmaker)
    })
    .sort()

  const handleCreate = async () => {
    if (!newMapping.sport_id || !newMapping.bookmaker_id || !newMapping.bookmaker_sport_code) {
      setError('Compila tutti i campi obbligatori.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createSportMapping({
        sport_id: newMapping.sport_id,
        bookmaker_id: newMapping.bookmaker_id,
        bookmaker_sport_code: newMapping.bookmaker_sport_code,
        bookmaker_sport_name: newMapping.bookmaker_sport_name || undefined,
      })
      setNewMapping(EMPTY_NEW)
      setShowNew(false)
      await loadData()
    } catch (err: unknown) {
      const msg = isAxiosError(err) ? err.response?.data?.message : null
      setError(msg ?? 'Errore nella creazione della mappatura.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      await updateSportMapping(editing.id, {
        bookmaker_sport_code: editing.bookmaker_sport_code,
        bookmaker_sport_name: editing.bookmaker_sport_name || undefined,
      })
      setEditing(null)
      await loadData()
    } catch (err: unknown) {
      const msg = isAxiosError(err) ? err.response?.data?.message : null
      setError(msg ?? "Errore nell'aggiornamento.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await deleteSportMapping(id)
      await loadData()
    } catch {
      setError('Errore nella rimozione della mappatura.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sport Mappings</h2>
        <p className="text-sm text-muted-foreground">
          Mappa i codici sport di ogni bookmaker agli sport canonici del sistema.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={filterBookmaker}
          onChange={(e) => setFilterBookmaker(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">Tutti i bookmaker</option>
          {bookmakers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showNew ? 'Annulla' : 'Nuova mappatura'}
        </button>
      </div>

      {/* New mapping form */}
      {showNew && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Nuova mappatura</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sport canonico *</label>
              <select
                value={newMapping.sport_id}
                onChange={(e) => setNewMapping({ ...newMapping, sport_id: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Seleziona...</option>
                {sports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Bookmaker *</label>
              <select
                value={newMapping.bookmaker_id}
                onChange={(e) => setNewMapping({ ...newMapping, bookmaker_id: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Seleziona...</option>
                {bookmakers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Codice sport *</label>
              <input
                type="text"
                value={newMapping.bookmaker_sport_code}
                onChange={(e) =>
                  setNewMapping({ ...newMapping, bookmaker_sport_code: e.target.value })
                }
                placeholder="es. CALCIO, Soccer, 1"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nome bookmaker</label>
              <input
                type="text"
                value={newMapping.bookmaker_sport_name}
                onChange={(e) =>
                  setNewMapping({ ...newMapping, bookmaker_sport_name: e.target.value })
                }
                placeholder="es. Calcio, Soccer"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleCreate}
            className="mt-3 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Salva
          </button>
        </div>
      )}

      {/* Mappings table grouped by sport */}
      {loading ? (
        <p className="py-6 text-center text-muted-foreground">Caricamento...</p>
      ) : filteredSportNames.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Nessuna mappatura trovata.</p>
      ) : (
        <div className="space-y-3">
          {filteredSportNames.map((sportName) => {
            const sportMappings = groupedBySport[sportName].filter(
              (m) => filterBookmaker === 'all' || m.bookmaker_id === filterBookmaker,
            )
            return (
              <div key={sportName} className="rounded-md border border-border bg-card">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <span className="text-sm font-semibold text-foreground">{sportName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {sportMappings.length} bookmaker
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {sportMappings.map((m) => {
                    const isEditing = editing?.id === m.id
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-2">
                        <span className="w-40 text-sm text-foreground">{m.bookmaker_name}</span>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editing.bookmaker_sport_code}
                              onChange={(e) =>
                                setEditing({ ...editing, bookmaker_sport_code: e.target.value })
                              }
                              className="w-32 rounded border border-border bg-background px-2 py-1 text-sm"
                            />
                            <input
                              type="text"
                              value={editing.bookmaker_sport_name}
                              onChange={(e) =>
                                setEditing({ ...editing, bookmaker_sport_name: e.target.value })
                              }
                              className="w-40 rounded border border-border bg-background px-2 py-1 text-sm"
                              placeholder="Nome (opz.)"
                            />
                            <button
                              type="button"
                              disabled={saving}
                              onClick={handleUpdate}
                              className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              Salva
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            >
                              Annulla
                            </button>
                          </>
                        ) : (
                          <>
                            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                              {m.bookmaker_sport_code}
                            </code>
                            {m.bookmaker_sport_name && (
                              <span className="text-xs text-muted-foreground">
                                {m.bookmaker_sport_name}
                              </span>
                            )}
                            <div className="ml-auto flex gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditing({
                                    id: m.id,
                                    bookmaker_sport_code: m.bookmaker_sport_code,
                                    bookmaker_sport_name: m.bookmaker_sport_name ?? '',
                                  })
                                }
                                className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                Modifica
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleDelete(m.id)}
                                className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              >
                                Elimina
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Container>
  )
}
