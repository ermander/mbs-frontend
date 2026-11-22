import React from 'react'

import { Container } from '@/components/ui/container'
import { SectionGuard } from '@/components/auth/section-guard'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { RefundZeroTool } from '@/components/strumenti/refund-zero/refund-zero-tool'

export default function RimborsoZeroPage() {
  return (
    // §14.366: senza la sezione «Sezione non abilitata» al posto della pagina (prima un redirect).
    <SectionGuard section="result_btts">
      <Container>
        <ToolPageShell
          toolName="Rimborso 0-0"
          description="Punta un esito di Risultato + Goal o un Risultato esatto a bet365, banca lo stesso esito e banca lo 0-0 su Sportmarket. Lo 0-0 lo rimborsa il bookmaker: il profitto è lo stesso qualunque sia il risultato."
        >
          <RefundZeroTool />
        </ToolPageShell>
      </Container>
    </SectionGuard>
  )
}
