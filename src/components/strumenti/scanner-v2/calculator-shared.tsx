'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, sanitizeDecimal } from '@/lib/utils'

/** Small pieces the two calculator views share. */

export function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

export function formatSigned(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

export function profitClass(n: number | null): string {
  if (n == null) return 'text-foreground'
  return n >= 0 ? 'text-emerald-400' : 'text-destructive'
}

export function DecimalField({
  id,
  label,
  value,
  onChange,
  placeholder = '0',
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id} className="text-xs sm:text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
        className="h-8 sm:h-9"
      />
    </div>
  )
}

export function ImbalanceSlider({
  value,
  onChange,
  min,
  max,
  step,
  label = 'Sbilanciamento',
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  label?: string
}) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className="font-mono text-xs font-medium text-foreground">
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        aria-label={label}
      />
      <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
        <span>{min}%</span>
        <span>0%</span>
        <span>+{max}%</span>
      </div>
    </div>
  )
}

export function ResultStat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-sm font-semibold tabular-nums', className)}>{value}</p>
    </div>
  )
}
