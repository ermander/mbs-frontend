import Link from 'next/link'
import Image from 'next/image'

export default function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      <Link
        href="/"
        aria-label="Torna alla home"
        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-md px-2 py-1 text-base font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-8 sm:top-8"
      >
        <Image
          src="/loghi/mbs-icon.svg"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7"
          priority
        />
        <span className="text-gradient-primary">MBS</span>
      </Link>

      {/*
        Pannello sinistra — immagine.
        Quando avrai l'immagine pronta, sostituisci il div placeholder con:
          <Image src="/auth/hero.jpg" alt="" fill className="object-cover" priority />
      */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-background" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-16 sm:py-20 lg:py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
