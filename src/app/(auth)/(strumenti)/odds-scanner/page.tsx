import React from 'react'

import { Container } from '@/components/ui/container'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { OddsScannerV2 } from '@/components/strumenti/scanner-v2/odds-scanner-v2'

export default function OddsScannerPage() {
  return (
    <Container className="max-w-[108rem]">
      <ToolPageShell
        toolName="Odds Scanner"
        description="Tutte le combinazioni dal motore interno, ricalcolate a ogni cambio di quota."
      >
        <OddsScannerV2 />
      </ToolPageShell>
    </Container>
  )
}
