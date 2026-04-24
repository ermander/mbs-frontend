import Image from 'next/image'

import { cn } from '@/lib/utils'

interface AuthHeaderProps {
  title: string
  subtitle?: string
  className?: string
  showIcon?: boolean
}

export function AuthHeader({ title, subtitle, className, showIcon = true }: AuthHeaderProps) {
  return (
    <div className={cn('space-y-3 text-center', className)}>
      {showIcon && (
        <Image
          src="/loghi/mbs-icon.svg"
          alt=""
          width={48}
          height={48}
          className="mx-auto h-12 w-12"
          priority
        />
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
