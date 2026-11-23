/**
 * Colonna delle pagine dell'app (§14.357): barra in alto, pagine e piè di pagina la condividono,
 * così i bordi del contenuto restano allineati da una pagina all'altra. A tutta larghezza
 * (`--page-max: none` in globals.css, scelta di Emanuele del 2026-11-22), con 16px di margine
 * interno sul telefono, 24px dal tablet e 40px dai 1280px in su (non da lg: a 1024px le voci
 * della barra di un admin non ci starebbero). Le griglie aggiungono colonne sugli schermi larghi
 * (offerte fino a 6, saldi della dashboard 6 in fila) e i testi da leggere (guida dell'offerta,
 * pagine legali) restano a 720px con l'indice accanto, centrati come un blocco solo (§14.373).
 * Lo stesso per ogni colonna stretta: profilo, contatti e 404 stanno al centro (§14.382), mai
 * attaccate a sinistra con la pagina vuota a destra.
 *
 * Prima era la colonna da 1200px del mockup della landing (disegnato su uno schermo da 1440px),
 * copiata in tutte le pagine col restyle: su un portatile da 1512px lasciava 180px vuoti per lato,
 * su un monitor da 1920px 360px. I calcolatori restano a 1200px (CalculatorPanel): sono un
 * pannello a tutto schermo senza la barra, e i campi non guadagnano nulla dalla larghezza.
 */
export const PAGE_COLUMN = 'mx-auto w-full max-w-(--page-max) px-4 sm:px-6 xl:px-10'

/**
 * La colonna da 1200px del mockup, per la landing: pagina vetrina per chi non è entrato, con titoli
 * grandi e riquadri disegnati per quella larghezza. Va sul guscio e vale per tutto quello che c'è
 * dentro (barra, sezioni, piè di pagina), che usa PAGE_COLUMN.
 */
export const PAGE_COLUMN_NARROW = '[--page-max:75rem]'
