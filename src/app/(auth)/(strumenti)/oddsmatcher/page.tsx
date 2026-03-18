import React from 'react'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { OddsmatcherTable } from '@/components/strumenti/oddsmatcher-table'
import { ToolPageShell } from '@/components/strumenti/tool-page-shell'

export default function OddsmatcherPage() {
  return (
    <>
      <Header />
      <main className="py-6 sm:py-8">
        <Container className="max-w-[108rem]">
          <ToolPageShell
            toolName="Oddsmatcher"
            description="Trova abbinamenti tra quote punta e banca."
          >
            <OddsmatcherTable />
          </ToolPageShell>
        </Container>
      </main>
      <Footer />
    </>
  )
}
