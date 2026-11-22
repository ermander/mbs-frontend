'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { GIconButton } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import {
  TagCreateModal,
  TagDeleteModal,
  TagEditModal,
} from '@/components/profit-tracker/tag-modals'
import {
  DS_CARD,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAlert,
  DsEmptyState,
  DsPageHeader,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Tag } from '@/types/profit-tracker'

/**
 * I tag della pagina Impostazioni sul design OddWise (§14.361), scheda «Tag»: il pallino del
 * colore col nome, Modifica ed Elimina dalla riga (schede sul telefono). Stesso elenco di prima,
 * riletto dopo ogni modale.
 */
export function TagsView() {
  const tags = useProfitTrackerStore((s) => s.tags)
  const isLoading = useProfitTrackerStore((s) => s.isLoadingTags)
  const tagsError = useProfitTrackerStore((s) => s.tagsError)
  const fetchTags = useProfitTrackerStore((s) => s.fetchTags)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTagId, setEditTagId] = useState<string | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)

  const reload = () => {
    fetchTags().catch(() => {})
  }

  useEffect(() => {
    fetchTags().catch(() => {})
  }, [fetchTags])

  const editing = tags.find((t) => t.id === editTagId) ?? null
  const deleting = tags.find((t) => t.id === deleteTagId) ?? null
  const isEmpty = !isLoading && !tagsError && tags.length === 0

  const newTagButton = (
    <button
      type="button"
      onClick={() => setCreateOpen(true)}
      className={dsButtonClass('primary', 'md')}
    >
      <Plus className="h-5 w-5" aria-hidden />
      Nuovo tag
    </button>
  )

  const nameCell = (t: Tag) => (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="h-4 w-4 flex-none rounded-full ring-1 ring-ds-line ring-inset"
        style={{ backgroundColor: t.colore }}
      />
      <span className="min-w-0 font-semibold break-words text-ds-ink">{t.nome}</span>
    </span>
  )

  const actions = (t: Tag) => (
    <div className="flex items-center justify-end gap-0.5">
      <GIconButton label={`Modifica il tag ${t.nome}`} onClick={() => setEditTagId(t.id)}>
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
      <GIconButton label={`Elimina il tag ${t.nome}`} danger onClick={() => setDeleteTagId(t.id)}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  return (
    <>
      <DsPageHeader
        title="Tag"
        description="Le etichette colorate da assegnare alle giocate."
        actions={newTagButton}
      />

      <div className="flex min-h-8 items-center">
        <span className="ds-body-sm text-ds-ink-muted">
          {!isLoading || tags.length > 0 ? countLabel(tags.length, 'tag', 'tag') : ''}
        </span>
      </div>

      {tagsError && <DsAlert>{tagsError}</DsAlert>}

      {isLoading && tags.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei tag…</p>
      )}
      {isEmpty && (
        <DsEmptyState
          icon={<TagIcon className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun tag creato"
          description="Crea un tag per raggruppare le giocate, per esempio per promozione."
          action={newTagButton}
        />
      )}

      {tags.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Tag</caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="py-3 pr-2.5 pl-4">
                    Nome
                  </th>
                  <th scope="col" className="w-[120px] py-3 pr-4 pl-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={t.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4">{nameCell(t)}</td>
                    <td className="py-2 pr-4 pl-2">{actions(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {tags.map((t) => (
              <li key={t.id} className={cn(DS_CARD, 'flex-row items-center justify-between')}>
                {nameCell(t)}
                {actions(t)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TagCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) reload()
        }}
      />
      {/* key: la modale riparte dai valori del tag scelto (useState li legge al montaggio) */}
      <TagEditModal
        key={editTagId ?? 'nessuno'}
        open={editTagId != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTagId(null)
            reload()
          }
        }}
        tag={editing}
      />
      <TagDeleteModal
        open={deleteTagId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTagId(null)
            reload()
          }
        }}
        tag={deleting}
      />
    </>
  )
}
