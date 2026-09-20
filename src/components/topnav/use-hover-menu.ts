'use client'

import * as React from 'react'

const CLOSE_DELAY_MS = 150

/**
 * Tendina che si apre al passaggio del mouse e si chiude poco dopo che il puntatore ha
 * lasciato trigger e contenuto (la pausa copre lo spazio fra i due). Clic, tastiera, Escape e
 * clic fuori continuano a passare da Radix via `onOpenChange`; un clic sul trigger già aperto
 * dal mouse non lo richiude.
 */
export function useHoverMenu() {
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const openNow = React.useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])

  const closeSoon = React.useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setOpen(false)
    }, CLOSE_DELAY_MS)
  }, [cancelClose])

  React.useEffect(() => cancelClose, [cancelClose])

  const hoverProps = React.useMemo(
    () => ({ onMouseEnter: openNow, onMouseLeave: closeSoon }),
    [openNow, closeSoon],
  )

  const triggerProps = React.useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (open) event.preventDefault()
      },
    }),
    [open],
  )

  return { open, onOpenChange: setOpen, hoverProps, triggerProps }
}
