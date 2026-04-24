import React from 'react'

import { Container } from '@/components/ui/container'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { OddsScannerV2Table } from '@/components/strumenti/odds-scanner-v2-table'

export default function OddsScannerV2Page() {
  return (
    <Container className="max-w-[108rem]">
      <ToolPageShell toolName="Odds Scanner v2">
        <OddsScannerV2Table />
      </ToolPageShell>
    </Container>
  )
}
