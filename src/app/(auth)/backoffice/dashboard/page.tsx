import { Container } from '@/components/ui/container'

export default function BackofficeDashboardPage() {
  return (
    <Container>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard backoffice
        </h2>
        <p className="text-muted-foreground">
          Benvenuto nel pannello di amministrazione. Qui in futuro potrai controllare e gestire le
          funzionalità interne del sito.
        </p>
      </div>
    </Container>
  )
}
