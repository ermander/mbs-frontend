import Link from 'next/link'

const footerColumns = [
  {
    title: 'Prodotto',
    links: [
      { href: '/#come-funziona', label: 'Come funziona' },
      { href: '/#strumenti', label: 'Strumenti' },
      { href: '/#prezzi', label: 'Prezzi' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legale',
    links: [
      { href: '/termini', label: 'Termini di servizio' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/cookie', label: 'Cookie' },
    ],
  },
  {
    title: 'Contatti',
    links: [
      { href: '/contatti', label: 'Contatti' },
      { href: 'mailto:info@example.com', label: 'info@example.com' },
    ],
  },
] as const

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="rounded text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              MBS
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Strumenti e guide per matched betting e confronto quote.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {year} MBS. Tutti i diritti riservati.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Registrati
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
