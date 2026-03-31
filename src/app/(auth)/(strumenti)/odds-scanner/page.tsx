import React from 'react'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'
import { OddsScannerTabs } from '@/components/strumenti/odds-scanner-tabs'

export default function OddsScannerPage() {
  return (
    <>
      <Header />
      <main className="py-6 sm:py-8">
        <Container className="max-w-[108rem]">
          <ToolPageShell toolName="Odds Scanner">
            <OddsScannerTabs />
          </ToolPageShell>
        </Container>
      </main>
      <Footer />
    </>
  )
}
