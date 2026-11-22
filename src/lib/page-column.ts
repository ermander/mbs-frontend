/**
 * Colonna delle pagine dell'app (§14.357): barra in alto, pagine e piè di pagina la condividono,
 * così i bordi del contenuto restano allineati da una pagina all'altra. Fino a 1600px
 * (`--page-max` in globals.css), con 16px di margine interno sul telefono, 24px dal tablet e 40px
 * dal portatile in su.
 *
 * Prima era la colonna da 1200px del mockup della landing (disegnato su uno schermo da 1440px),
 * copiata in tutte le pagine col restyle: su un portatile da 1512px lasciava 180px vuoti per lato,
 * su un monitor da 1920px 360px. I calcolatori restano a 1200px (CalculatorPanel): sono un
 * pannello a tutto schermo senza la barra, e i campi non guadagnano nulla dalla larghezza.
 */
export const PAGE_COLUMN = 'mx-auto w-full max-w-(--page-max) px-4 sm:px-6 lg:px-10'

/**
 * La colonna da 1200px del mockup, per la landing: pagina vetrina per chi non è entrato, con titoli
 * grandi e riquadri disegnati per quella larghezza. Va sul guscio e vale per tutto quello che c'è
 * dentro (barra, sezioni, piè di pagina), che usa PAGE_COLUMN.
 */
export const PAGE_COLUMN_NARROW = '[--page-max:75rem]'
