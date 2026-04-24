import { Container } from '@/components/ui/container'

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  return <Container className="max-w-screen-2xl">{children}</Container>
}
