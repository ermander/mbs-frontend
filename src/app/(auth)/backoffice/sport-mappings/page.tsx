'use client'

import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { BoCode, BoConfirmModal, BoMuted, BoPanel } from '@/components/backoffice/backoffice-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import {
  DsModal,
  GIconButton,
  GSelect,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
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

// I codici sport di ogni bookmaker sugli sport canonici, raggruppati per sport. Dal §14.365 sul
// design OddWise: la nuova mappatura nel Modal, ogni sport in un riquadro, Elimina con conferma.
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
  const [newError, setNewError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<SportMapping | null>(null)

  // Filter
  const [filterBookmaker, setFilterBookmaker] = useState<string>('all')

  // Lo stato cambia solo nei callback della promise: l'effetto di montaggio chiama il fetch così
  // com'è (loading parte già a true), i salvataggi passano da loadData, che riaccende il
  // caricamento prima di ripartire (react-hooks/set-state-in-effect).
  const fetchData = useCallback(
    () =>
      Promise.all([getSportMappings(), getCanonicalSports(), getScrapers()])
        .then(([m, s, b]) => {
          setMappings(m)
          setSports(s)
          setBookmakers(b)
        })
        .catch(() => setError('Errore nel caricamento dei dati.'))
        .finally(() => setLoading(false)),
    [],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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

  const openNew = () => {
    setNewMapping(EMPTY_NEW)
    setNewError(null)
    setShowNew(true)
  }

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMapping.sport_id || !newMapping.bookmaker_id || !newMapping.bookmaker_sport_code) {
      setNewError('Compila tutti i campi obbligatori.')
      return
    }
    setSaving(true)
    setNewError(null)
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
      setNewError(msg ?? 'Errore nella creazione della mappatura.')
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

  // Elimina chiede conferma nel Modal del design (prima toglieva la mappatura al primo clic).
  const handleDelete = async () => {
    if (!toDelete) return
    setSaving(true)
    setError(null)
    try {
      await deleteSportMapping(toDelete.id)
      await loadData()
    } catch {
      setError('Errore nella rimozione della mappatura.')
    } finally {
      setSaving(false)
      setToDelete(null)
    }
  }

  const shownCount = filteredSportNames.reduce(
    (n, sportName) =>
      n +
      groupedBySport[sportName].filter(
        (m) => filterBookmaker === 'all' || m.bookmaker_id === filterBookmaker,
      ).length,
    0,
  )

  return (
    <>
      <DsPageHeader
        title="Sport Mappings"
        description="Mappa i codici sport di ogni bookmaker agli sport canonici del sistema."
        actions={
          <button type="button" onClick={openNew} className={dsButtonClass('primary', 'md')}>
            <Plus className="h-5 w-5" aria-hidden />
            Nuova mappatura
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <GSelect
          id="bo-sm-bookmaker"
          ariaLabel="Bookmaker"
          size="sm"
          value={filterBookmaker}
          onChange={setFilterBookmaker}
          options={[
            { value: 'all', label: 'Tutti i bookmaker' },
            ...bookmakers.map((b) => ({ value: b.id, label: b.name })),
          ]}
          className="w-56"
        />
        {!loading && (
          <span className="ds-body-sm text-ds-ink-muted tabular-nums">
            {shownCount} {shownCount === 1 ? 'mappatura' : 'mappature'}
          </span>
        )}
      </div>

      {error && <DsAlert>{error}</DsAlert>}

      {loading ? (
        <BoMuted className="py-6 text-center">Caricamento delle mappature…</BoMuted>
      ) : filteredSportNames.length === 0 ? (
        <BoMuted className="py-6 text-center">Nessuna mappatura trovata.</BoMuted>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSportNames.map((sportName) => {
            const sportMappings = groupedBySport[sportName].filter(
              (m) => filterBookmaker === 'all' || m.bookmaker_id === filterBookmaker,
            )
            return (
              <BoPanel
                key={sportName}
                title={sportName}
                aside={`${sportMappings.length} bookmaker`}
                flush
              >
                <ul className="m-0 list-none divide-y divide-ds-line p-0">
                  {sportMappings.map((m) => {
                    const isEditing = editing?.id === m.id
                    return (
                      <li
                        key={m.id}
                        className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2"
                      >
                        <span className="w-40 shrink-0 text-sm font-semibold text-ds-ink">
                          {m.bookmaker_name}
                        </span>
                        {isEditing ? (
                          <>
                            <GTextField
                              id={`bo-sm-code-${m.id}`}
                              ariaLabel={`Codice sport di ${m.bookmaker_name}`}
                              size="sm"
                              value={editing.bookmaker_sport_code}
                              onChange={(code) =>
                                setEditing({ ...editing, bookmaker_sport_code: code })
                              }
                              onEnter={() => void handleUpdate()}
                              inputProps={{ autoFocus: true }}
                              className="w-36"
                            />
                            <GTextField
                              id={`bo-sm-name-${m.id}`}
                              ariaLabel={`Nome dello sport su ${m.bookmaker_name}`}
                              size="sm"
                              value={editing.bookmaker_sport_name}
                              onChange={(name) =>
                                setEditing({ ...editing, bookmaker_sport_name: name })
                              }
                              onEnter={() => void handleUpdate()}
                              placeholder="Nome (facoltativo)"
                              className="w-44"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleUpdate()}
                                className={cn(
                                  dsButtonClass('primary', 'sm'),
                                  'disabled:opacity-60',
                                )}
                              >
                                Salva
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className={dsButtonClass('ghost', 'sm')}
                              >
                                Annulla
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <BoCode>{m.bookmaker_sport_code}</BoCode>
                            {m.bookmaker_sport_name && (
                              <span className="ds-body-sm text-ds-ink-muted">
                                {m.bookmaker_sport_name}
                              </span>
                            )}
                            <div className="ml-auto flex gap-0.5">
                              <GIconButton
                                label={`Modifica la mappatura di ${m.bookmaker_name}`}
                                onClick={() =>
                                  setEditing({
                                    id: m.id,
                                    bookmaker_sport_code: m.bookmaker_sport_code,
                                    bookmaker_sport_name: m.bookmaker_sport_name ?? '',
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </GIconButton>
                              <GIconButton
                                label={`Elimina la mappatura di ${m.bookmaker_name}`}
                                danger
                                disabled={saving}
                                onClick={() => setToDelete(m)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </GIconButton>
                            </div>
                          </>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </BoPanel>
            )
          })}
        </div>
      )}

      <DsModal
        open={showNew}
        onOpenChange={(open) => !open && !saving && setShowNew(false)}
        title="Nuova mappatura"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              disabled={saving}
              className={dsButtonClass('secondary', 'md')}
            >
              Annulla
            </button>
            <button
              type="submit"
              form="bo-sm-form"
              disabled={saving}
              className={cn(dsButtonClass('primary', 'md'), 'disabled:opacity-60')}
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </>
        }
      >
        <form id="bo-sm-form" onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <GSelect
            id="bo-sm-new-sport"
            label="Sport canonico"
            value={newMapping.sport_id}
            onChange={(sport_id) => setNewMapping({ ...newMapping, sport_id })}
            options={[
              { value: '', label: 'Seleziona…' },
              ...sports.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <GSelect
            id="bo-sm-new-bookmaker"
            label="Bookmaker"
            value={newMapping.bookmaker_id}
            onChange={(bookmaker_id) => setNewMapping({ ...newMapping, bookmaker_id })}
            options={[
              { value: '', label: 'Seleziona…' },
              ...bookmakers.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <GTextField
            id="bo-sm-new-code"
            label="Codice sport"
            value={newMapping.bookmaker_sport_code}
            onChange={(bookmaker_sport_code) =>
              setNewMapping({ ...newMapping, bookmaker_sport_code })
            }
            placeholder="es. CALCIO, Soccer, 1"
          />
          <GTextField
            id="bo-sm-new-name"
            label="Nome sul bookmaker"
            optional
            value={newMapping.bookmaker_sport_name}
            onChange={(bookmaker_sport_name) =>
              setNewMapping({ ...newMapping, bookmaker_sport_name })
            }
            placeholder="es. Calcio, Soccer"
          />
          {newError && <DsAlert className="sm:col-span-2">{newError}</DsAlert>}
        </form>
      </DsModal>

      <BoConfirmModal
        open={toDelete !== null}
        title="Eliminare la mappatura?"
        description={
          toDelete
            ? `Il codice «${toDelete.bookmaker_sport_code}» di ${toDelete.bookmaker_name} non sarà più letto come ${toDelete.sport_name}.`
            : ''
        }
        busy={saving}
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
