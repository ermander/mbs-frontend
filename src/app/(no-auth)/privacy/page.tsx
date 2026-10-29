import { LegalPage, type LegalSection } from '@/components/landing/legal-primitives'
import { DsTextLink } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'

// =====================================================================
// Informativa sulla privacy (ADAPTER_STATUS §14.250).
//
// Il testo descrive solo quello che il codice fa davvero (verificato il
// 2026-10-18, cancellazione dell'account aggiornata il 2026-10-30):
// registrazione con nome, cognome, email e password; accesso con Google
// (email, nome, identificativo dell'account Google); dati del Profit
// Tracker; notifiche Telegram facoltative; log del server; nessun
// analytics né script di terze parti; bandiere scaricate dal browser da
// flagcdn.com; sito e API dietro il proxy di Cloudflare; cancellazione
// dell'account fatta dall'utente stesso dalla pagina del profilo
// (§14.251), con eliminazione immediata di tutti i dati collegati.
//
// PLACEHOLDER DA COMPILARE (l'utente), tutti nella sezione «Titolare»:
//   TITOLARE_NOME       → nome o ragione sociale del titolare
//   TITOLARE_INDIRIZZO  → indirizzo della sede
//   TITOLARE_EMAIL      → indirizzo email per le richieste sulla privacy
// Finché restano tra parentesi quadre la pagina li mostra evidenziati
// (componente Placeholder); una volta compilati togliere il componente.
// =====================================================================

const TITOLARE_NOME = '[NOME O RAGIONE SOCIALE DEL TITOLARE]'
const TITOLARE_INDIRIZZO = '[INDIRIZZO DELLA SEDE]'
const TITOLARE_EMAIL = '[EMAIL DI CONTATTO PER LA PRIVACY]'

/** Valore ancora da compilare: evidenziato per non passare inosservato. */
function Placeholder({ children }: { children: string }) {
  return (
    <span className="rounded-sm border border-dashed border-ds-warning px-1.5 py-0.5 font-mono text-[13px] text-ds-warning">
      {children}
    </span>
  )
}

function Term({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>
}

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'introduzione',
    title: 'Introduzione',
    body: (
      <p>
        Questa informativa, resa ai sensi dell&apos;art. 13 del Regolamento (UE) 2016/679 («GDPR»),
        descrive quali dati personali OddWise raccoglie, perché, con quale base giuridica, a chi li
        comunica e per quanto tempo li conserva. Si rivolge ai visitatori del sito e agli utenti
        registrati e descrive quello che il servizio fa oggi: se qualcosa cambierà, aggiorneremo
        questa pagina.
      </p>
    ),
  },
  {
    id: 'titolare',
    title: 'Titolare del trattamento',
    body: (
      <>
        <p>
          Il titolare del trattamento è <Placeholder>{TITOLARE_NOME}</Placeholder>, con sede in{' '}
          <Placeholder>{TITOLARE_INDIRIZZO}</Placeholder>.
        </p>
        <p>
          Per qualsiasi richiesta sui tuoi dati personali, compreso l&apos;esercizio dei diritti
          descritti più avanti, puoi scrivere a <Placeholder>{TITOLARE_EMAIL}</Placeholder>.
        </p>
      </>
    ),
  },
  {
    id: 'dati-finalita',
    title: 'Dati raccolti e finalità',
    body: (
      <>
        <p>Trattiamo soltanto i dati che servono a far funzionare il servizio:</p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <Term>Registrazione e account.</Term> Nome, cognome, indirizzo email e password. La
            password è conservata solo in forma di hash (bcrypt) e non è leggibile da nessuno;
            all&apos;indirizzo email inviamo il link di conferma dell&apos;account e, se lo chiedi,
            quello per reimpostare la password. Finalità: creare e gestire il tuo account e farti
            accedere al servizio. Base giuridica: esecuzione del contratto (art. 6, par. 1, lett. b
            GDPR).
          </li>
          <li>
            <Term>Accesso con Google.</Term> Se scegli «Continua con Google», riceviamo da Google
            l&apos;indirizzo email, il nome e il cognome del tuo profilo Google e
            l&apos;identificativo stabile del tuo account Google, che conserviamo per riconoscerti
            agli accessi successivi. Non salviamo la foto del profilo. Finalità e base giuridica:
            come per la registrazione.
          </li>
          <li>
            <Term>Dati del servizio (Profit Tracker).</Term> I dati che inserisci tu per usare gli
            strumenti: i conti aperti sui bookmaker con i relativi saldi, i metodi di pagamento con
            i movimenti e i prelievi, le scommesse registrate, i promemoria, le etichette e i
            collaboratori (nome e descrizione) a cui associ i conti. Li trattiamo solo per
            mostrarteli, aggiornarli e calcolare i totali. Base giuridica: esecuzione del contratto
            (art. 6, par. 1, lett. b GDPR). Se tra i collaboratori indichi altre persone, sei tu a
            doverle informare.
          </li>
          <li>
            <Term>Notifiche Telegram (facoltative).</Term> Se colleghi il bot Telegram dal tuo
            profilo, conserviamo l&apos;identificativo della tua chat Telegram e la data del
            collegamento, per inviarti i promemoria in scadenza e gli avvisi sugli eventi delle
            scommesse che hai registrato. Puoi scollegarlo in qualsiasi momento dal profilo:
            l&apos;identificativo viene cancellato. Base giuridica: esecuzione del contratto, su tua
            richiesta (art. 6, par. 1, lett. b GDPR).
          </li>
          <li>
            <Term>Log tecnici del server.</Term> Per ogni richiesta il server registra indirizzo IP,
            data e ora, pagina o risorsa richiesta, esito e tipo di browser. L&apos;indirizzo IP
            serve anche a limitare il numero di richieste al minuto, per difendere il servizio dagli
            abusi. Finalità: sicurezza, prevenzione degli abusi e diagnosi dei malfunzionamenti.
            Base giuridica: legittimo interesse del titolare alla sicurezza del servizio (art. 6,
            par. 1, lett. f GDPR).
          </li>
        </ul>
        <p>
          Non raccogliamo dati di navigazione a fini statistici o di profilazione: il sito non usa
          strumenti di analytics, non carica script di terze parti e non mostra pubblicità.
        </p>
      </>
    ),
  },
  {
    id: 'base-giuridica',
    title: 'Base giuridica',
    body: (
      <p>
        I dati dell&apos;account, dell&apos;accesso con Google, del Profit Tracker e delle notifiche
        Telegram sono trattati per eseguire il contratto con te, cioè per erogare il servizio che
        hai chiesto (art. 6, par. 1, lett. b GDPR). I log tecnici del server sono trattati nel
        legittimo interesse del titolare a mantenere il servizio sicuro (art. 6, par. 1, lett. f
        GDPR). Possiamo inoltre trattare i dati quando la legge ce lo impone (art. 6, par. 1, lett.
        c GDPR). Non chiediamo consensi perché nessuna attività lo richiede: niente marketing,
        niente profilazione, niente cookie non tecnici.
      </p>
    ),
  },
  {
    id: 'destinatari',
    title: 'Destinatari e trasferimenti',
    body: (
      <>
        <p>
          I dati sono trattati dal titolare e dai fornitori che servono a far funzionare il
          servizio, ciascuno per la sola parte che lo riguarda:
        </p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <Term>Fornitore di hosting cloud.</Term> Il server dell&apos;applicazione e il database
            girano su un&apos;infrastruttura cloud in affitto; il fornitore tratta i dati per nostro
            conto come responsabile del trattamento.
          </li>
          <li>
            <Term>Cloudflare.</Term> Il sito e l&apos;API passano attraverso i server di Cloudflare,
            che protegge e instrada il traffico: Cloudflare vede l&apos;indirizzo IP e le richieste
            in transito.
          </li>
          <li>
            <Term>Google.</Term> Solo se usi l&apos;accesso con Google: Google riceve la richiesta
            di accesso e ci comunica i dati del profilo indicati sopra, secondo la propria
            informativa.
          </li>
          <li>
            <Term>Fornitore del servizio di posta elettronica.</Term> Le email di conferma
            dell&apos;account e di reimpostazione della password partono da un server di posta
            (SMTP) di un fornitore esterno, che riceve il tuo indirizzo email e il contenuto del
            messaggio.
          </li>
          <li>
            <Term>Telegram.</Term> Solo se colleghi il bot: i promemoria e gli avvisi ti arrivano
            attraverso l&apos;API di Telegram.
          </li>
          <li>
            <Term>flagcdn.com.</Term> Le bandiere delle nazioni accanto alle competizioni sono
            immagini che il tuo browser scarica direttamente da flagcdn.com: quel server riceve il
            tuo indirizzo IP e la richiesta dell&apos;immagine, nessun dato del tuo account, e non
            imposta cookie.
          </li>
        </ul>
        <p>
          Non vendiamo né cediamo i tuoi dati a terzi per finalità di marketing. Possiamo
          comunicarli alle autorità quando la legge lo impone.
        </p>
        <p>
          <Term>Trasferimenti fuori dall&apos;Unione europea.</Term> Google e Cloudflare hanno sede
          negli Stati Uniti e possono trattare dati anche fuori dall&apos;UE; per questi
          trasferimenti valgono le garanzie del capo V del GDPR (decisione di adeguatezza della
          Commissione europea o clausole contrattuali tipo). Lo stesso vale per gli altri fornitori
          elencati, se trattano dati fuori dall&apos;UE.
        </p>
      </>
    ),
  },
  {
    id: 'conservazione',
    title: 'Conservazione',
    body: (
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <Term>Dati dell&apos;account e del servizio</Term> (profilo, dati del Profit Tracker,
          collegamento Telegram): finché il tuo account esiste. Puoi eliminare l&apos;account da
          solo, in qualsiasi momento, dalla sezione «Elimina account» della{' '}
          <DsTextLink href="/account/profilo">pagina del profilo</DsTextLink>: l&apos;account e
          tutti i dati collegati vengono cancellati immediatamente e in modo definitivo, senza
          bisogno di una richiesta al titolare.
        </li>
        <li>
          <Term>Log tecnici del server</Term>: per il tempo strettamente necessario alle finalità di
          sicurezza e diagnosi indicate sopra.
        </li>
        <li>
          <Term>Dati memorizzati nel tuo browser</Term> (vedi l&apos;
          <DsTextLink href="/cookie">informativa sui cookie</DsTextLink>): restano sul tuo
          dispositivo finché non li cancelli tu.
        </li>
      </ul>
    ),
  },
  {
    id: 'diritti',
    title: 'Diritti dell’interessato',
    body: (
      <>
        <p>
          In qualità di interessato hai il diritto di accedere ai tuoi dati, di chiederne la
          rettifica o la cancellazione, la limitazione del trattamento e la portabilità, e di
          opporti al trattamento basato sul legittimo interesse (artt. 15-21 GDPR). Nome, username,
          email e password puoi modificarli da solo nella{' '}
          <DsTextLink href="/account/profilo">pagina del profilo</DsTextLink>, e dalla stessa pagina
          puoi eliminare l&apos;account con tutti i dati collegati (art. 17 GDPR); per il resto
          scrivi al titolare ai recapiti della sezione{' '}
          <DsTextLink href="#titolare">Titolare del trattamento</DsTextLink>: rispondiamo entro un
          mese.
        </p>
        <p>
          Hai inoltre il diritto di proporre reclamo all&apos;Autorità Garante per la protezione dei
          dati personali (
          <DsTextLink href="https://www.garanteprivacy.it">garanteprivacy.it</DsTextLink>).
        </p>
      </>
    ),
  },
  {
    id: 'sicurezza',
    title: 'Sicurezza',
    body: (
      <p>
        Il sito è servito solo in HTTPS. Le password sono conservate come hash bcrypt. I cookie di
        autenticazione sono httpOnly e Secure, quindi non sono leggibili dagli script della pagina e
        viaggiano solo su connessioni cifrate. Il numero di richieste per indirizzo IP è limitato
        per contrastare gli abusi.
      </p>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie',
    body: (
      <p>
        Il sito usa soltanto cookie tecnici di autenticazione, nessun cookie analitico o di
        profilazione, e per questo non mostra un banner. Nomi, durata e dettagli sono nell&apos;
        <DsTextLink href="/cookie">informativa sui cookie</DsTextLink>, che descrive anche i dati
        memorizzati nel tuo browser.
      </p>
    ),
  },
  {
    id: 'modifiche',
    title: 'Modifiche',
    body: (
      <p>
        Potremmo aggiornare questa informativa quando il servizio cambia. Le modifiche saranno
        pubblicate su questa pagina con la data di ultimo aggiornamento; in caso di modifiche
        rilevanti potremmo avvisarti via email o con un avviso nel sito.
      </p>
    ),
  },
  {
    id: 'contatti',
    title: 'Contatti',
    body: (
      <p>
        Per esercitare i tuoi diritti o per qualsiasi domanda sulla privacy scrivi al titolare ai
        recapiti indicati nella sezione{' '}
        <DsTextLink href="#titolare">Titolare del trattamento</DsTextLink>.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <SiteShell>
      <LegalPage title="Informativa sulla privacy" updated="30 ottobre 2026" sections={SECTIONS} />
    </SiteShell>
  )
}
