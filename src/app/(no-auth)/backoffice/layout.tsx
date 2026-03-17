import { ReactNode } from 'react'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function BackofficePublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center py-12">
        <Container className="max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">MBS Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">Area riservata di amministrazione.</p>
          </div>
          <Card>
            <CardHeader className="space-y-0 pb-4">
              <h2 className="sr-only">Accesso backoffice</h2>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </Container>
      </main>
    </div>
  )
}
