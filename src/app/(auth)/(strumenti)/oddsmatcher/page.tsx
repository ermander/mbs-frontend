import React from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { OddsmatcherTable } from '@/components/strumenti/oddsmatcher-table'

export default function OddsmatcherPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen py-8">
        <Container className="max-w-[108rem] space-y-6">
          <div className="rounded-md bg-muted px-4 py-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Oddsmatcher</h1>
          </div>
          <OddsmatcherTable />
        </Container>
      </main>
      <Footer />
    </>
  )
}
