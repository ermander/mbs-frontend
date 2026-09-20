# Prompt per Claude Code (da lanciare nella root di mbs-frontend)

Stiamo facendo il rebranding del sito in "OddWise". In `design/` trovi il mockup approvato:

- `landing-blue.dc.html` = landing desktop completa (tema principale: dark blu). È HTML con stili inline: usalo come fonte di verità per struttura, copy, spaziature e colori. Ignora i tag `<x-dc>`, `<helmet>`, `<sc-for>`, `<sc-if>` e lo script finale: i dati dentro `renderVals()` (tools, piani, FAQ) diventano costanti TypeScript.
- `landing-dark.dc.html` = stessa landing in dark verde; `landing-light.dc.html` = tema chiaro (secondari, per confronto).
- `hero-mobile-blue.dc.html` = come deve rendere il hero a 390px.
- `brand-blue.dc.html` = wordmark, palette, tipografia, pulsanti.
- `tokens.css` = variabili CSS da mappare in `tailwind.config.js` (colori `ow-*`, font, raggi).
- `assets/bookmakers-*.png` = strisce dei loghi per il carosello (in produzione usa i singoli PNG in `public/loghi_book` con la mappa in `src/lib/bookmakers.ts`).

Compiti, in ordine:

1. Aggiungi i token a Tailwind (colori, font, raggi) e carica i tre font Google in `app/layout` con `next/font/google`.
2. Riscrivi i componenti in `src/components/landing/` seguendo l'ordine delle sezioni del mockup: nav, hero (con la card calcolatore), perché-funziona, promozione di benvenuto, come-funziona, i due metodi, quanto-puoi-guadagnare, strumenti, carosello siti di scommesse, piani matched betting, piani surebet, FAQ, CTA finale, footer. Rimuovi le sezioni non più presenti (social proof, testimonianze).
3. Il carosello loghi è CSS puro (due copie, translateX -50%, 70s, seconda riga reverse), con pausa per `prefers-reduced-motion`.
4. Copy: riprendi il testo del mockup ALLA LETTERA, niente riformulazioni. Nessun riferimento a bookmaker specifici (Snai ecc.) fuori dall'esempio del calcolatore nel hero. La parola "bookmaker" non deve comparire: si usa "sito/siti di scommesse".
5. Mobile: hero come `hero-mobile-blue`, sezioni in colonna singola, pulsanti a tutta larghezza.
6. Dark blu come tema di default; `data-theme="green"` e `data-theme="light"` sull'html per le varianti (vedi tokens.css).
   Non toccare le route degli strumenti né l'auth. Alla fine fai girare lint, test e build.
