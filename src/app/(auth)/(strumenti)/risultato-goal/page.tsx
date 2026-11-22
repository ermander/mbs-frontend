import React from 'react'

import { Container } from '@/components/ui/container'
import { SectionGuard } from '@/components/auth/section-guard'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { ResultBttsTool } from '@/components/strumenti/result-btts/result-btts-tool'

export default function RisultatoGoalPage() {
  return (
    // §14.366: senza la sezione «Sezione non abilitata» al posto della pagina (prima un redirect).
    <SectionGuard section="result_btts">
      <Container>
        <ToolPageShell
          toolName="Risultato + Goal"
          description="Il mercato 1X2 + Goal/NoGoal dentro lo stesso bookmaker: cinque esiti coperti, lo 0-0 (X & NoGoal) rimborsato dal bookmaker."
        >
          <ResultBttsTool />
        </ToolPageShell>
      </Container>
    </SectionGuard>
  )
}
