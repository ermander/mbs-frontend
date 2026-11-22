'use client'

import { useState } from 'react'

import { GiocateDsShell, GTabs } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { BooksView } from '@/components/profit-tracker/impostazioni/books-view'
import { TagsView } from '@/components/profit-tracker/impostazioni/tags-view'

type ImpostazioniTab = 'books' | 'tags'

const tabs: { value: ImpostazioniTab; label: string }[] = [
  { value: 'books', label: 'Book' },
  { value: 'tags', label: 'Tag' },
]

/**
 * La voce «Impostazioni» del Tracker sul design OddWise (§14.361): book personali e tag, a schede
 * come Gestione conti (§14.350). Prima era «Book e Tag» sulla grafica scura.
 */
export default function BookPersonaliPage() {
  const [activeTab, setActiveTab] = useState<ImpostazioniTab>('books')

  return (
    <GiocateDsShell>
      <GTabs label="Impostazioni" items={tabs} value={activeTab} onChange={setActiveTab} />
      {activeTab === 'books' && <BooksView />}
      {activeTab === 'tags' && <TagsView />}
    </GiocateDsShell>
  )
}
