import { DashboardAuthGuard } from '../dashboard/dashboard-auth-guard'

export default function StrumentiLayout({ children }: { children: React.ReactNode }) {
  return <DashboardAuthGuard>{children}</DashboardAuthGuard>
}
