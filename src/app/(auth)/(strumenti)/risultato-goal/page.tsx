import React from 'react'

import { Container } from '@/components/ui/container'
import { ToolAuthGuard } from '@/components/auth/tool-auth-guard'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { ResultBttsTool } from '@/components/strumenti/result-btts/result-btts-tool'

export default function RisultatoGoalPage() {
  return (
    <Container className="max-w-[108rem]">
      <ToolAuthGuard tool="result_btts">
        <ToolPageShell
          toolName="Risultato + Goal"
          description="Il mercato 1X2 + Goal/NoGoal dentro lo stesso bookmaker: cinque esiti coperti, lo 0-0 (X & NoGoal) rimborsato dal bookmaker."
        >
          <ResultBttsTool />
        </ToolPageShell>
      </ToolAuthGuard>
    </Container>
  )
}
