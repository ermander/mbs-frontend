import * as React from 'react'

import { OpenAreaLayout } from '@/components/open-area/open-area-layout'

/** Pagine dell'app aperte anche agli ospiti (§14.339-14.340): vedi OpenAreaLayout. */
export default function OpenLayout({ children }: { children: React.ReactNode }) {
  return <OpenAreaLayout>{children}</OpenAreaLayout>
}
