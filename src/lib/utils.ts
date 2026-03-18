import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formato Data evento: GG/MM/AA e ora a capo con "h" (es. 17/01/26, h 16:00). */
export function formatEventDateDisplay(date: string): { datePart: string; timePart: string } {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear().toString().slice(-2)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return {
    datePart: `${day}/${month}/${year}`,
    timePart: `h ${hours}:${minutes}`,
  }
}
