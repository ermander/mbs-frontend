import React from 'react'

import { Container } from '@/components/ui/container'
import { ToolAuthGuard } from '@/components/auth/tool-auth-guard'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { RefundZeroTool } from '@/components/strumenti/refund-zero/refund-zero-tool'

export default function RimborsoZeroPage() {
  return (
    <Container className="max-w-[108rem]">
      <ToolAuthGuard tool="result_btts">
        <ToolPageShell
          toolName="Rimborso 0-0"
          description="Risultato esatto: punta un risultato a bet365, banca lo stesso risultato e banca lo 0-0 su Sportmarket. Lo 0-0 lo rimborsa il bookmaker: il profitto è lo stesso qualunque sia il risultato."
        >
          <RefundZeroTool />
        </ToolPageShell>
      </ToolAuthGuard>
    </Container>
  )
}
