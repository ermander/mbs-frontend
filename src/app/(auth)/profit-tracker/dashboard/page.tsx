import { redirect } from 'next/navigation'

/** §14.367: la Dashboard non è più una pagina del tracker; i vecchi link portano a /dashboard. */
export default function ProfitTrackerDashboardPage() {
  redirect('/dashboard')
}
