/**
 * §14.339-14.340: se nella scheda è montata una pagina aperta anche agli ospiti (gruppo di rotte
 * `(open)`, DashboardAuthGuard con `publicFallback`). Lì una sessione finita (401 anche sul
 * refresh) non porta al login: AuthRefreshProvider toglie solo l'utente dallo store e la guard
 * mostra la versione pubblica della pagina. Un contatore, come i pannelli dei calcolatori: se due
 * pagine convivono per un attimo durante una navigazione, conta l'ultima che se ne va.
 */
let publicPages = 0

/** Segna una pagina pubblica montata; la funzione restituita la toglie (una volta sola). */
export function holdPublicPage(): () => void {
  publicPages += 1
  let released = false
  return () => {
    if (released) return
    released = true
    publicPages -= 1
  }
}

export function isPublicPageMounted(): boolean {
  return publicPages > 0
}
