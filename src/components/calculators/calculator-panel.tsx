'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ListChecks, Lock, X } from 'lucide-react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { CalculatorIcon } from '@/components/calculators/calculator-icon'
import { CALCULATORS_WITHOUT_SAVE, type CalculatorTool } from '@/lib/calculators/catalog'
import { formatRating } from '@/lib/landing-format'
import { cn } from '@/lib/utils'

/**
 * Pannello a schermo intero di un calcolatore (design «OddWise Calcolatori», §14.267): testata
 * fissa con «Calcolatori», nome e chiudi, il calcolatore al centro, barra in fondo con «Annulla» e
 * «Salva nel tracker». Il pulsante di salvataggio lo rende il calcolatore (CalculatorSaveAction),
 * che conosce le sue condizioni, dentro la barra via portal.
 *
 * Il pannello è chiaro (ds-*). I calcolatori e i loro dialoghi usano ancora i colori shadcn
 * dell'area autenticata, scuri: la classe ds-calc-bridge li rimappa sulla palette chiara, sul
 * pannello e, finché è aperto, sull'<html>, così anche i portal (dialoghi di salvataggio, menu)
 * la prendono.
 */

const SaveSlotContext = React.createContext<HTMLElement | null>(null)
const RatingSlotContext = React.createContext<HTMLElement | null>(null)

/** Classe del ponte shadcn → ds-* in globals.css. */
const BRIDGE_CLASS = 'ds-calc-bridge'

/**
 * Chi tiene il ponte sull'<html>: i pannelli montati e, nell'oddsmatcher chiaro (§14.272), i
 * dialoghi shadcn aperti sopra la pagina. Se due convivono per un attimo (il nuovo montato prima
 * che il vecchio si smonti), la classe si toglie solo quando se ne va l'ultimo.
 */
let bridgeHolders = 0

/** Mette il ponte shadcn → ds-* sull'<html>; la funzione restituita lo rilascia. */
export function holdCalcBridge() {
  bridgeHolders += 1
  if (bridgeHolders === 1) document.documentElement.classList.add(BRIDGE_CLASS)
  return () => {
    bridgeHolders -= 1
    if (bridgeHolders === 0) document.documentElement.classList.remove(BRIDGE_CLASS)
  }
}

/** Pannelli montati: lo scorrimento della pagina torna solo quando se ne va l'ultimo. */
let mountedPanels = 0

function lockPage() {
  const releaseBridge = holdCalcBridge()
  mountedPanels += 1
  if (mountedPanels === 1) document.body.style.overflow = 'hidden'
  return () => {
    releaseBridge()
    mountedPanels -= 1
    if (mountedPanels === 0) document.body.style.overflow = ''
  }
}

export function CalculatorPanel({
  tool,
  onClose,
  children,
}: {
  tool: CalculatorTool
  onClose: () => void
  children: React.ReactNode
}) {
  const [saveSlot, setSaveSlot] = React.useState<HTMLElement | null>(null)
  const [ratingSlot, setRatingSlot] = React.useState<HTMLElement | null>(null)
  const backRef = React.useRef<HTMLButtonElement>(null)
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    const unlockPage = lockPage()
    backRef.current?.focus()
    // Esc chiude il pannello, non quando lo consuma un dialogo o un menu aperto sopra (Radix
    // chiama preventDefault prima di chiudersi, in fase di cattura).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockPage()
    }
  }, [])

  const admin = Boolean(tool.requiresRole)
  const canSave = !CALCULATORS_WITHOUT_SAVE.has(tool.slug)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tool.name}
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        BRIDGE_CLASS,
        'ds-scope fixed inset-0 z-50 flex flex-col overflow-auto bg-ds-surface-raised font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light]',
      )}
    >
      <div className="sticky top-0 z-10 border-b border-ds-line bg-ds-surface-raised">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:gap-6 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              ref={backRef}
              type="button"
              onClick={onClose}
              className={cn(dsButtonClass('ghost', 'sm'), 'shrink-0 px-2')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {/* Sul telefono solo la freccia: lo spazio va al nome e al rating. */}
              <span className="sr-only sm:not-sr-only">Calcolatori</span>
            </button>
            <span className="h-6 w-px shrink-0 bg-ds-line" aria-hidden />
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex text-ds-brand">
                <CalculatorIcon name={tool.icon} />
              </span>
              <span className="ds-heading truncate">{tool.name}</span>
              {admin && <AdminBadge className="hidden sm:inline-flex" />}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div ref={setRatingSlot} className="contents" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi il calcolatore"
              className={cn(dsButtonClass('ghost', 'sm'), 'w-8 shrink-0 px-0')}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <SaveSlotContext.Provider value={saveSlot}>
        <RatingSlotContext.Provider value={ratingSlot}>
          <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">{children}</div>
        </RatingSlotContext.Provider>
      </SaveSlotContext.Provider>

      <div className="sticky bottom-0 mt-auto border-t border-ds-line bg-ds-surface">
        <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-4 px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} className={dsButtonClass('ghost', 'md')}>
            Annulla
          </button>
          {canSave && <div ref={setSaveSlot} className="contents" />}
        </div>
      </div>
    </div>
  )
}

export function AdminBadge({ className }: { className?: string }) {
  return (
    <DsBadge tone="neutral" className={className}>
      <Lock className="h-3 w-3" aria-hidden />
      Solo admin
    </DsBadge>
  )
}

/**
 * Il rating (o il CR% con il rimborso) nella testata del pannello, a destra prima della X. Da 100 %
 * in su è il badge in profit del design, sotto è la cifra in ink; senza valore «—». `plain`
 * mostra sempre la cifra: per i rating che non misurano la resa (in punta-banca è bancata su
 * puntata, e 100 % non vuol dire guadagno).
 */
export function CalculatorRating({
  label,
  value,
  plain,
}: {
  label: string
  value: number | null
  plain?: boolean
}) {
  const slot = React.useContext(RatingSlotContext)
  if (!slot) return null
  const shown = value != null && Number.isFinite(value)
  return createPortal(
    <span className="ds-body-sm inline-flex items-center gap-1.5 whitespace-nowrap text-ds-ink-muted">
      {label}{' '}
      {shown && !plain && value >= 100 ? (
        <DsBadge tone="profit" className="text-[13px] font-semibold tabular-nums tracking-normal">
          {formatRating(value)}
        </DsBadge>
      ) : (
        <span className="ds-num text-ds-ink">{shown ? formatRating(value) : '—'}</span>
      )}
    </span>,
    slot,
  )
}

/**
 * «Salva nel tracker» di un calcolatore: nella barra in fondo del pannello quando il calcolatore è
 * dentro un pannello, altrimenti al suo posto nel flusso. Apre il dialogo di salvataggio del
 * calcolatore, che resta quello di prima.
 */
export function CalculatorSaveAction({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  const slot = React.useContext(SaveSlotContext)
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        dsButtonClass('primary', 'md'),
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <ListChecks className="h-5 w-5" aria-hidden />
      Salva nel tracker
    </button>
  )
  if (slot) return createPortal(button, slot)
  return <div className="flex justify-center p-4">{button}</div>
}
