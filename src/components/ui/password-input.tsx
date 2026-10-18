'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

/**
 * L'occhio che mostra o nasconde la password: pulsante quadrato da 28px appoggiato al
 * bordo destro del campo (il campo deve avere `pr-10`). Al clic col mouse non ruba il
 * fuoco al campo (`onMouseDown` annullato), da tastiera resta raggiungibile con Tab;
 * `aria-pressed` dice lo stato, `aria-controls` lega il pulsante al campo.
 */
export function PasswordRevealButton({
  visible,
  onToggle,
  controls,
  disabled,
  className,
}: {
  visible: boolean
  onToggle: () => void
  controls?: string
  disabled?: boolean
  className?: string
}) {
  const label = visible ? 'Nascondi password' : 'Mostra password'
  const Icon = visible ? EyeOff : Eye
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label={label}
      aria-pressed={visible}
      aria-controls={controls}
      title={label}
      className={cn(
        'absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[4px] transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  )
}

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Campo password dell'app (stesso `Input` delle altre pagine) con l'occhio per mostrarla. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, id, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          className={cn('pr-10', className)}
          {...props}
        />
        <PasswordRevealButton
          visible={visible}
          onToggle={() => setVisible((v) => !v)}
          controls={id}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
