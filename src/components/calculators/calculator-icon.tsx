import {
  ArrowLeftRight,
  CircleDot,
  Dices,
  Gift,
  Layers,
  Scale,
  Target,
  Triangle,
  type LucideIcon,
} from 'lucide-react'

import type { CalculatorIcon as CalculatorIconName } from '@/lib/calculators/catalog'
import { cn } from '@/lib/utils'

/** Le icone delle tessere del design (lucide, tratto 2), una per calcolatore. */
const ICONS: Record<CalculatorIconName, LucideIcon> = {
  scale: Scale,
  arrows: ArrowLeftRight,
  triangle: Triangle,
  layers: Layers,
  target: Target,
  dices: Dices,
  'circle-dot': CircleDot,
  gift: Gift,
}

export function CalculatorIcon({
  name,
  className,
}: {
  name: CalculatorIconName
  className?: string
}) {
  const Icon = ICONS[name]
  return <Icon className={cn('h-5 w-5 shrink-0', className)} aria-hidden />
}
