import React from 'react'
import { redirect } from 'next/navigation'

import { isCalculatorSlug } from '@/lib/calculators/catalog'

export default function CalcolatoriSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  if (isCalculatorSlug(slug)) {
    redirect(`/calcolatori?expand=${slug}`)
  }
  redirect('/calcolatori')
}
