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
          description="I mercati 1X2 + Goal/NoGoal, Totale gol + Goal/NoGoal e Goal/NoGoal 1° e 2° tempo confrontati dentro lo stesso bookmaker, lasciando fuori un esito a scelta."
        >
          <ResultBttsTool />
        </ToolPageShell>
      </ToolAuthGuard>
    </Container>
  )
}
