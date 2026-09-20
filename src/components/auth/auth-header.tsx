import { cn } from '@/lib/utils'

interface AuthHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

/** Titolo delle pagine di accesso: 28px peso medio, sottotitolo 15px grigio, allineati a sinistra. */
export function AuthHeader({ title, subtitle, className }: AuthHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text">
        {title}
      </h1>
      {subtitle && <p className="text-[15px] leading-[1.6] text-ow-text-3">{subtitle}</p>}
    </div>
  )
}
