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
          description="Ogni risultato coperto tranne lo 0-0, rimborsato dal bookmaker: 1X2 + Goal/NoGoal senza X & NoGoal, oppure Totale gol + Goal/NoGoal con i risultati esatti che lascia scoperti."
        >
          <ResultBttsTool />
        </ToolPageShell>
      </ToolAuthGuard>
    </Container>
  )
}
