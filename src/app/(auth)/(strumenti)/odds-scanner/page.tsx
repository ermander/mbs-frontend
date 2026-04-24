import React from 'react'

import { Container } from '@/components/ui/container'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { OddsScannerTabs } from '@/components/strumenti/odds-scanner-tabs'

export default function OddsScannerPage() {
  return (
    <Container className="max-w-[108rem]">
      <ToolPageShell toolName="Odds Scanner">
        <OddsScannerTabs />
      </ToolPageShell>
    </Container>
  )
}
