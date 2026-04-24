import React from 'react'
import { redirect } from 'next/navigation'

const KNOWN_SLUGS = new Set(['punta-banca', 'punta-punta', 'tri-punta'])

export default function CalcolatoriSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  if (KNOWN_SLUGS.has(slug)) {
    redirect(`/calcolatori?expand=${slug}`)
  }
  redirect('/calcolatori')
}
