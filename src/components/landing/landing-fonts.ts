import { Source_Sans_3, Source_Serif_4 } from 'next/font/google'

/**
 * Font del design system OddWise (Claude Design, §14.248): Source Serif 4 per display, titoli e
 * marchio, con l'asse ottico («opsz») che il design pinna a 60/48/32; Source Sans 3 per testo,
 * etichette e numeri. Self-hosted da next/font (la CSP ammette solo font-src 'self') e applicati
 * dal guscio delle pagine pubbliche, non dall'<html>: l'area autenticata resta su Geist.
 */
export const dsSerif = Source_Serif_4({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-ds-serif',
  display: 'swap',
})

export const dsSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-ds-sans',
  display: 'swap',
})
