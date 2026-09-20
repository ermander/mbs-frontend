import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingNav } from '@/components/landing/landing-nav'

/** Guscio delle pagine pubbliche (landing, legali, contatti, 404): nav, contenuto, footer. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ow-bg font-sans tracking-[-0.011em] text-ow-text antialiased">
      <LandingNav />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
