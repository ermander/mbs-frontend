'use client'

import { useState } from 'react'
import { Circle, CircleCheck } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { cn } from '@/lib/utils'
import { markOfferDone, unmarkOfferDone } from '@/services/api/offers-client'

export const OFFER_DONE_COPY = {
  mark: 'Segna come fatta',
  done: 'Fatta',
  failed: 'Non salvata: riprova',
} as const

/**
 * §14.367: il pulsante «Fatta» di un'offerta, per chi è entrato. Cambia subito (`onChange`) e
 * salva sul backend; se il salvataggio non riesce torna com'era e lo dice nel suggerimento.
 * Spuntata, «Fatta» in verde; da spuntare, «Segna come fatta».
 */
export function OfferDoneToggle({
  slug,
  done,
  onChange,
  size = 'sm',
  className,
}: {
  slug: string
  done: boolean
  onChange: (done: boolean) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = async () => {
    const next = !done
    onChange(next)
    setPending(true)
    setFailed(false)
    try {
      if (next) await markOfferDone(slug)
      else await unmarkOfferDone(slug)
    } catch {
      onChange(!next)
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  const Icon = done ? CircleCheck : Circle
  return (
    <button
      type="button"
      aria-pressed={done}
      disabled={pending}
      onClick={() => void toggle()}
      title={failed ? OFFER_DONE_COPY.failed : undefined}
      className={cn(
        dsButtonClass(done ? 'secondary' : 'ghost', size),
        done &&
          'border-transparent bg-ds-profit-soft text-ds-profit shadow-none hover:bg-ds-profit-soft hover:brightness-95',
        failed && 'text-ds-loss',
        pending && 'opacity-70',
        className,
      )}
    >
      <Icon aria-hidden className={cn('shrink-0', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
      {failed ? OFFER_DONE_COPY.failed : done ? OFFER_DONE_COPY.done : OFFER_DONE_COPY.mark}
    </button>
  )
}
