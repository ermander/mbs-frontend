import { redirect } from 'next/navigation'

/** The scanner lives at /odds-scanner since the RobinOdds one was removed (§14.100); old links still work. */
export default function OddsScannerV2Page() {
  redirect('/odds-scanner')
}
