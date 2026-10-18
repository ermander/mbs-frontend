'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { landingFocusRing } from '@/components/landing/landing-primitives'
import { AuthInput } from '@/components/auth/auth-primitives'
import { PasswordRevealButton, type PasswordInputProps } from '@/components/ui/password-input'

/**
 * Campo password delle pagine di accesso: lo stesso `AuthInput` (40px, hairline) con
 * l'occhio per mostrare o nascondere la password, nei colori della landing.
 */
export const AuthPasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, id, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <AuthInput
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
          className={cn(
            'text-ow-text-3 hover:text-ow-text focus-visible:text-ow-text',
            landingFocusRing,
          )}
        />
      </div>
    )
  },
)
AuthPasswordInput.displayName = 'AuthPasswordInput'
