# Linee guida per il refactor della landing page

## 1. Scopo e modalità d'uso

Questo documento organizza la direzione definita nella conversazione «Definire stile design custom». È il brief operativo per il refactor della landing di un provider di matched betting e può essere usato da designer, sviluppatori e LLM.

**Trasformazione da raccontare:** dall'incertezza e dal tempo perso a un processo comprensibile, guidato e verificabile attraverso i calcoli.

**Principio guida:** costruire una dimostrazione progressiva. Copy, prodotto, animazioni e identità visiva devono spiegare la stessa storia.

- **Scelte definite:** posizionamento, ruoli dei colori, carattere della mascotte, ordine delle sezioni e sequenza della demo.
- **Proposte da adattare:** headline, testi delle CTA, famiglie tipografiche e dettagli delle interazioni.
- **Da validare prima della pubblicazione:** promozioni, calcoli, disponibilità degli strumenti e condizioni commerciali. Gli esempi di questo brief non sono offerte attuali o risultati documentati.

Il documento riguarda la futura landing. Non richiede di ridisegnare contemporaneamente l'intera applicazione.

## 2. Target e problema percettivo

### Target

- Persone interessate a ottenere un'entrata aggiuntiva online.
- Utenti che possono aver già incontrato trading, tipster e metodi presentati come facili.
- Visitatori diffidenti verso promesse economiche, che cercano una spiegazione concreta prima di registrarsi.
- Principianti che non conoscono termini come exchange, copertura o responsabilità.

### Problema percettivo

Il matched betting viene associato al mondo delle scommesse, quindi a casualità, previsioni sportive, perdita e scarsa affidabilità. La landing deve spiegare il ruolo di promozioni, operazioni di copertura e strumenti di calcolo, rendendo visibili condizioni e passaggi.

La comprensione deve nascere dalla dimostrazione del processo. Un'estetica professionale, da sola, non costituisce una prova di affidabilità.

### Sensazioni da comunicare

| Sensazione             | Traduzione concreta nella pagina                                       |
| ---------------------- | ---------------------------------------------------------------------- |
| Controllo              | Input, operazioni e risultati chiaramente distinguibili.               |
| Chiarezza              | Una domanda principale per sezione; termini spiegati al primo uso.     |
| Razionalità e metodo   | Passaggi ordinati, numeri leggibili, relazioni tra i dati esplicite.   |
| Prevedibilità          | Il visitatore capisce il prossimo passaggio e le ipotesi del calcolo.  |
| Trasparenza            | Costi, condizioni e limiti vicini al risultato cui si riferiscono.     |
| Fiducia e tranquillità | Tono calmo, prodotto visibile, risposte dirette, assenza di pressione. |

La sensazione prioritaria è il **controllo**. La prevedibilità del processo non va trasformata in una promessa di profitto garantito.

## 3. Elementi da evitare

- Promesse di ricchezza, guadagno facile, rendite automatiche o risultati assoluti.
- Hype da trading, linguaggio da guru e urgenza artificiale.
- Lamborghini, banconote che volano, fiches, roulette e immaginario da casinò.
- Numeri enormi, contatori di guadagno e risultati senza ipotesi o contesto.
- Gradienti aggressivi, neon e look da crypto.
- Effetti decorativi che sottraggono attenzione alla spiegazione.
- Hero sovraccariche, troppe CTA equivalenti e schermate illeggibili.
- Recensioni, metriche, partnership o badge di fiducia inventati.

## 4. Direzione visiva

### Palette e significato dei colori

| Ruolo                       | Direzione                | Uso                                                            |
| --------------------------- | ------------------------ | -------------------------------------------------------------- |
| Sfondo principale           | Off-white / quasi bianco | Base dominante, calma e luminosa.                              |
| Superfici                   | Bianco e neutri chiari   | Card, pannelli e separazione dei contenuti.                    |
| Colore principale del brand | Blu                      | CTA principali, link, selezioni e focus.                       |
| Risultato positivo          | Verde                    | Profitti e valori economici positivi.                          |
| Risultato negativo          | Rosso                    | Perdite e valori economici negativi; errori quando pertinenti. |
| Testo e bordi               | Neutri scuri e grigi     | Leggibilità, gerarchia e separatori discreti.                  |

Il blu è il colore identitario e d'azione; l'off-white rimane la superficie prevalente. Il verde non deve diventare un accento decorativo distribuito ovunque. Affiancare ai colori etichette e segni `+` / `−`: il significato deve essere comprensibile anche senza distinguere il colore.

Centralizzare questi ruoli in token semantici. I codici colore esatti restano da definire e verificare per contrasto su testi, controlli e stati interattivi.

### Tipografia

- Sans serif leggibile per titoli, testo e interfaccia: professionale, con un tono umano.
- IBM Plex Sans o Inter sono direzioni possibili, non una scelta già definitiva.
- Monospaziato per quote, percentuali, importi, calcoli e risultati; usarlo in modo mirato.
- Numeri tabulari e allineamento coerente per confrontare valori e mantenere stabile la demo durante gli aggiornamenti.
- Formattazione italiana uniforme per importi e decimali, per esempio `50,00 €` e `2,10`.
- Evitare testo lungo tutto maiuscolo, corpi troppo piccoli e numeri sproporzionati rispetto alla spiegazione.

### Interfaccia e composizione

- Bordi sottili, card pulite, spazio generoso e gerarchia tipografica netta.
- Mostrare strumenti, input, operazioni e risultati effettivamente rappresentativi del prodotto.
- Preferire UI ricostruita o screenshot stilizzati leggibili, mantenendo fedeltà alle funzioni disponibili.
- Usare animazioni per collegare causa ed effetto, con una trasformazione principale alla volta.
- Dare continuità visiva alla promozione e ai suoi dati attraverso le sezioni.

## 5. Mascotte e brand identity

La mascotte è un elemento distintivo del brand e una guida ricorrente. Deve poter diventare anche il segno del logo.

**Carattere:** semplice, riconoscibile, geometrico, intelligente e leggermente caratterizzato. Evitare un aspetto infantile, caricaturale o eccessivamente cartoon.

**Applicazioni:** logo, guide, tooltip, stati vuoti, onboarding, messaggi di errore e alcuni punti della landing. Nella landing può accompagnare un passaggio o chiarire un concetto; la demo del prodotto deve conservare il ruolo principale.

**Criteri operativi:**

- Definire una silhouette riconoscibile anche in piccolo e in versione monocromatica.
- Mantenere forme, proporzioni e linguaggio grafico coerenti nelle diverse pose.
- Usare espressioni sobrie e utili al contesto, senza celebrare il profitto in modo euforico.
- Affiancare sempre il testo alle informazioni: la mascotte non deve essere l'unico mezzo per comunicare uno stato.

Specie, nome, disegno definitivo e pose non sono stati definiti. Non considerarli già approvati durante il refactor.

## 6. Architettura della landing

Ordine di lettura da mantenere:

1. **Hero** — Cos'è e a cosa serve?
2. **Come funziona** — Fammi vedere il processo.
3. **Cosa puoi ottenere** — Quale risultato produce l'esempio?
4. **Prodotto** — Quali strumenti mi aiutano a farlo?
5. **Fiducia** — Come posso valutare metodo e limiti?
6. **FAQ** — Quali altri dubbi devo risolvere?
7. **CTA finale** — Come inizio?

### 6.1 Hero

**Obiettivo:** rendere immediatamente comprensibili servizio e utilità, mostrando uno strumento concreto.

**Layout desktop:** messaggio a sinistra, anteprima del prodotto a destra. Su mobile: titolo, descrizione, CTA e anteprima in ordine naturale.

**Contenuti:**

- Una headline breve, diretta e senza hype. Direzione proposta: **«I bonus dei bookmaker, trasformati in un calcolo.»**
- Una descrizione di una o due frasi che chiarisca il ruolo di promozioni, copertura e strumenti.
- Una CTA primaria: **«Inizia gratuitamente»**, soltanto se esiste un accesso gratuito coerente con questa promessa.
- Una CTA secondaria: **«Scopri come funziona»**, collegata alla demo. Alternativa: **«Prova il calcolatore»**, se conduce a uno strumento realmente utilizzabile.

**Visual:** anteprima del calcolatore Punta-Banca con quote, importo della puntata, copertura, responsabilità e risultato. Evidenziare in verde l'eventuale profitto positivo. Spiegare i termini specialistici con etichette brevi o aiuti accessibili.

La hero anticipa il risultato e il prodotto. La trasformazione completa della promozione viene sviluppata nella sezione successiva.

**Criterio di riuscita:** senza scorrere, il visitatore comprende che cosa offre il servizio e quale azione può compiere.

### 6.2 Come funziona — demo scroll-driven

**Obiettivo:** rendere visibile la trasformazione **PROMOZIONE → OPERAZIONI → CALCOLO → PROFITTO**.

**Layout desktop:** spiegazione a sinistra e pannello dimostrativo a destra; il pannello può restare sticky mentre lo scorrimento attiva i quattro passaggi.

| Passaggio     | Cosa mostrare                                                                                                                         | Cosa deve capire il visitatore                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1. Promozione | Una promo reale verificata oppure una ricostruzione indicata come esempio. Rendere visibili valore del bonus e condizioni essenziali. | Da quale opportunità parte il processo.                             |
| 2. Operazioni | Puntata sul bookmaker e copertura sull'exchange, con quote e relazione tra le due operazioni.                                         | A cosa serve ciascuna operazione e perché viene coperta la puntata. |
| 3. Calcolo    | Inserimento dei dati e comparsa degli importi calcolati, incluse responsabilità e commissioni pertinenti.                             | Come gli input determinano gli importi e il risultato.              |
| 4. Profitto   | Riepilogo di bonus, costi e risultato netto dell'esempio.                                                                             | Quanto resta nelle condizioni mostrate e da quali passaggi deriva.  |

**Regole della demo:**

- Usare lo stesso esempio e gli stessi dati in tutti i passaggi; non cambiare offerta durante la trasformazione.
- La frase «Deposita 50 € e ricevi 50 € di bonus» è soltanto un possibile esempio narrativo: non implica che l'offerta esista o che il bonus equivalga al profitto.
- Ogni passaggio deve avere un titolo, una spiegazione autonoma e uno stato visivo leggibile prima della transizione successiva.
- Lo scorrimento deve restare naturale, anche tornando indietro. Evitare blocchi, avanzamenti forzati e movimenti simultanei non necessari.
- Il calcolo è illustrativo; l'animazione non deve suggerire che il sito abbia davvero eseguito depositi o scommesse.
- Su mobile usare preferibilmente quattro blocchi verticali. Con movimento ridotto, mostrare gli stessi contenuti senza animazioni indispensabili alla comprensione.

**Criterio di riuscita:** la sequenza rimane comprensibile anche come quattro schermate statiche.

### 6.3 Cosa puoi ottenere

**Obiettivo:** rispondere alla domanda «Quanto produce questo esempio?» attraverso numeri spiegati e verificabili.

Riprendere prima il caso della demo. Eventuali scenari aggiuntivi devono dichiarare le proprie ipotesi, senza diventare promesse di reddito mensile.

**Schema per ogni scenario:**

- Promozione e tipologia di bonus.
- Condizioni e quote utilizzate.
- Capitale richiesto e responsabilità della copertura, distinti dai costi effettivi.
- Valore effettivamente ricavato dal bonus secondo le sue regole.
- Costi delle operazioni e commissioni, senza doppio conteggio.
- Risultato netto e indicazione «Esempio illustrativo» o fonte del caso documentato.

Non usare come formula universale «bonus nominale − copertura = profitto»: il calcolo deve rispettare le condizioni del bonus e la modalità utilizzata. Alimentare la demo con risultati verificati del calcolatore pertinente.

Vicino ai numeri indicare che risultati e disponibilità delle promozioni possono variare. «Profitto ottenuto» è adatto a un risultato realmente documentato; per una simulazione usare «Profitto dell'esempio» o «Risultato stimato».

**Criterio di riuscita:** il visitatore può distinguere bonus, capitale impegnato, costi e risultato netto.

### 6.4 Prodotto — Trova / Calcola / Gestisci / Impara

**Obiettivo:** collegare il processo appena compreso agli strumenti della piattaforma.

| Area     | Contenuto da mostrare                                             | Utilità da spiegare                                                      |
| -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Trova    | Promozioni, opportunità e snatcher, se disponibili.               | Individuare un'opportunità da valutare.                                  |
| Calcola  | Calcolatori di matched betting, con il caso già visto nella demo. | Determinare importi, copertura e risultato nelle condizioni inserite.    |
| Gestisci | Registro delle operazioni, capitale impegnato e profitti.         | Tenere traccia dell'attività e distinguere operazioni aperte e concluse. |
| Impara   | Guide e procedure passo passo pertinenti all'esempio.             | Comprendere il metodo e sapere quale passaggio affrontare.               |

**Interazione proposta:** navigazione `Trova | Calcola | Gestisci | Impara` con un pannello del prodotto che cambia alla selezione. Prevedere controllo da tastiera, stato attivo chiaro e contenuti utilizzabili anche su mobile. Evitare rotazioni automatiche che interrompono la lettura.

Ogni area presenta una funzione concreta, una breve spiegazione e una schermata coerente. Se una capacità non è disponibile, non presentarla come funzione già utilizzabile.

**Criterio di riuscita:** il visitatore sa associare ogni strumento a una fase del proprio lavoro.

### 6.5 Fiducia

**Obiettivo:** affrontare direttamente le obiezioni principali con spiegazioni visibili, senza obbligare ad aprire tutti gli accordion.

Domande prioritarie:

- «È una scommessa? Devo indovinare un risultato?»
- «Da dove arriva il profitto?»
- «Perché serve coprire la puntata?»
- «Posso perdere?»
- «Serve conoscere lo sport?»
- «Quanto capitale serve e per quanto tempo resta impegnato?»
- «Quanto tempo richiede?»

Collegare le risposte alla dimostrazione precedente. Spiegare condizioni e limiti con linguaggio diretto; non usare «nessun rischio» o «guadagno garantito». Capitale e tempo devono riferirsi a scenari e procedure documentati, non a valori universali inventati.

Eventuali testimonianze, dati del servizio o riferimenti di supporto devono essere autentici e verificabili. In loro assenza, costruire fiducia con prodotto, calcoli e risposte chiare.

**Criterio di riuscita:** le obiezioni centrali ricevono una risposta sostanziale, senza slogan rassicuranti al posto delle spiegazioni.

### 6.6 FAQ

**Obiettivo:** raccogliere approfondimenti e domande secondarie senza interrompere la narrativa principale.

- Usare un accordion semplice, accessibile da tastiera, con stato aperto/chiuso esplicito.
- Trattare requisiti per iniziare, accesso agli strumenti, supporto, dispositivi, piani e funzionamento dell'eventuale prova.
- Evitare duplicazioni integrali della sezione Fiducia; aggiungere dettagli e collegamenti alle guide.
- Pubblicare risposte coerenti con il servizio disponibile e con le condizioni commerciali effettive.

**Criterio di riuscita:** i dubbi pratici rimasti trovano una risposta senza introdurre nuove promesse.

### 6.7 CTA finale

**Obiettivo:** proporre un passo chiaro dopo che il visitatore ha capito, visto, verificato e risolto i dubbi.

Direzione di titolo: **«Provalo prima di decidere.»** Solo se esiste una modalità di prova.

Riprendere la stessa azione primaria della hero, con destinazione e condizioni coerenti. «Inizia gratuitamente», «nessuna carta richiesta», «accesso immediato» e «prova gratuita» sono utilizzabili soltanto se corrispondono all'offerta reale. Distinguere un piano gratuito da una prova a tempo.

Se questa modalità non è disponibile, scegliere una CTA che descriva l'accesso effettivamente offerto, senza simulare una prova inesistente.

**Criterio di riuscita:** il visitatore sa cosa succederà dopo il clic e a quali condizioni.

## 7. Filo narrativo complessivo

**Cos'è? → Come funziona? → Fammi vedere un esempio → Quanto produce? → Quali strumenti mi dai? → Perché dovrei fidarmi? → Come inizio?**

Una stessa promozione può attraversare la pagina: viene presentata, analizzata, coperta, calcolata e registrata nel gestionale, fino al risultato. Mantenere continuità di importi, etichette e rappresentazione visiva.

La mascotte accompagna, il copy spiega, il prodotto dimostra e l'animazione rende leggibili i passaggi. Ogni sezione deve preparare la domanda a cui risponderà quella successiva.

## 8. Indicazioni per sviluppo e passaggio a un LLM

1. Mappare la landing esistente sulle sette sezioni del brief, riutilizzando i componenti utili.
2. Separare contenuti, dati dell'esempio e presentazione. Usare una sola fonte per gli importi condivisi tra hero, demo, scenari e prodotto.
3. Definire i token di palette e tipografia per la landing senza alterare involontariamente il resto dell'applicazione.
4. Realizzare prima la lettura statica completa, poi aggiungere demo scroll-driven e pannello del prodotto.
5. Definire la mascotte come asset riutilizzabile, una volta approvata la sua forma.
6. Verificare coerenza dei calcoli, contenuti, collegamenti, responsive, tastiera e movimento ridotto.

Nel progetto attuale, i punti di partenza sono `src/components/landing/` per i componenti e `src/lib/landing-content.ts` per i contenuti. Questi percorsi sono relativi alla radice di `mbs-frontend`. Valutare anche i controlli esistenti sui testi quando si passerà all'implementazione.

**Istruzioni per chi implementa:** rispettare ordine narrativo e ruoli semantici dei colori; non inventare metriche, testimonianze, funzioni, offerte o risultati; considerare le proposte di copy adattabili; mantenere espliciti gli elementi da validare fino alla loro risoluzione.

## 9. Verifica finale del refactor

- [ ] Le sette sezioni rispettano l'ordine e lo scopo definiti.
- [ ] La hero spiega il servizio, mostra il prodotto e presenta una CTA principale riconoscibile.
- [ ] La demo contiene tutti i passaggi: promo → operazioni → calcolo → profitto.
- [ ] Ogni passaggio è leggibile anche senza movimento e su mobile.
- [ ] Input, commissioni, costi e risultati sono coerenti in tutte le sezioni.
- [ ] Bonus, capitale, responsabilità e profitto non vengono confusi.
- [ ] Off-white, blu, verde e rosso mantengono i rispettivi ruoli.
- [ ] La tipografia facilita la lettura e il confronto dei numeri.
- [ ] La mascotte è coerente e riconoscibile, senza dominare la spiegazione.
- [ ] Trova, Calcola, Gestisci e Impara corrispondono a strumenti disponibili.
- [ ] Fiducia affronta le obiezioni principali e FAQ aggiunge dettagli pratici.
- [ ] CTA e condizioni commerciali sono corrette e coerenti tra hero e chiusura.
- [ ] Nessun placeholder, dato inventato o promessa assoluta è presente nella versione pubblicata.
- [ ] Focus, contrasto, tastiera e preferenza di movimento ridotto sono stati verificati.

## 10. Elementi ancora da definire

- Codici colore definitivi e coppia tipografica.
- Disegno, nome e varianti della mascotte.
- Promozione da usare come esempio e relativi dati verificati.
- Schermate aggiornate e disponibilità delle funzioni mostrate.
- Copy definitivo, destinazioni delle CTA e condizioni di accesso o prova.

Questi punti non modificano la direzione concordata; servono a completarla prima della pubblicazione.
