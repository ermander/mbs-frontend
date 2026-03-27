export interface DutcherRow {
  tipo: string
  sport: string
  book: string
  book2: string
  home: string
  away: string
  ora: string
  data: string
  nazione: string
  campionato: string
  lastupdate: string
  id_book1: string
  id_book2: string
  roi: string | null
  rating: number
  cr: string | null
  yes: string
  no: string
  a: string
  b: string
}

export interface DutcherParams {
  id_book?: string
  length?: number
  start?: number
  books?: string
  side_books?: string
  sports?: string
  mercati?: string
  sortBy?: string
  sortMode?: 'ASC' | 'DESC'
}
