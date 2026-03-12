import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeSelector } from '@/components/account/theme-selector'

export default function AccountProfiloPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Profilo</h1>
            <p className="mt-1 text-muted-foreground">In costruzione.</p>
          </div>

          <section aria-labelledby="settings-heading">
            <Card>
              <CardHeader>
                <CardTitle id="settings-heading">Impostazioni</CardTitle>
                <CardDescription>Scegli come vuoi visualizzare il sito.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Tema</p>
                  <ThemeSelector />
                </div>
              </CardContent>
            </Card>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  )
}
