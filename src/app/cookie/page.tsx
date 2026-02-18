import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

export default function CookiePage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Informativa sui cookie
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ultimo aggiornamento: 1 gennaio 2025
            </p>
          </div>

          <section className="space-y-4">
            <h2 id="introduzione" className="text-xl font-semibold text-foreground">
              1. Introduzione
            </h2>
            <p className="text-muted-foreground">
              Questa informativa spiega cosa sono i cookie e come li utilizziamo sul sito MBS. Si
              rivolge a tutti i visitatori. Per il trattamento dei dati personali nel suo insieme
              rimandiamo alla nostra{' '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                informativa sulla privacy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="cosa-sono" className="text-xl font-semibold text-foreground">
              2. Cosa sono i cookie
            </h2>
            <p className="text-muted-foreground">
              I cookie sono piccoli file di testo che i siti possono salvare sul tuo dispositivo per
              ricordare preferenze, sessioni o per finalità analitiche. Si distinguono generalmente
              in: cookie tecnici (necessari al funzionamento del sito), cookie di preferenza
              (lingua, impostazioni), cookie analitici (statistiche di utilizzo) e cookie di
              profilazione o marketing (pubblicità mirata). Per i cookie non tecnici è in genere
              richiesto il consenso dell&apos;utente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="cookie-utilizzati" className="text-xl font-semibold text-foreground">
              3. Cookie che utilizziamo
            </h2>
            <p className="text-muted-foreground">
              Utilizziamo cookie necessari al funzionamento del sito (es. sessione, sicurezza) e,
              ove previsto, cookie per memorizzare preferenze (es. tema, lingua). L&apos;elenco
              dettagliato con nome, tipo, finalità e durata potrà essere integrato in questa sezione
              nel testo definitivo dell&apos;informativa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="terze-parti" className="text-xl font-semibold text-foreground">
              4. Cookie di terze parti
            </h2>
            <p className="text-muted-foreground">
              In futuro potremmo integrare servizi di terze parti (es. analytics, widget social) che
              impostano propri cookie. In tal caso verranno indicati i fornitori, le finalità e i
              link alle rispettive informative. Per il momento non sono utilizzati cookie di terze
              parti; questa sezione sarà aggiornata in caso di modifiche.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="gestione" className="text-xl font-semibold text-foreground">
              5. Come gestire i cookie
            </h2>
            <p className="text-muted-foreground">
              Puoi gestire o disabilitare i cookie dalle impostazioni del tuo browser. Le istruzioni
              si trovano nelle pagine di assistenza dei principali browser (es. Chrome, Firefox,
              Safari, Edge). Tieni presente che disabilitare alcuni cookie potrebbe limitare alcune
              funzionalità del sito. Se sul sito sarà disponibile un pannello o uno strumento per le
              preferenze sui cookie, potrai utilizzarlo per selezionare quali categorie accettare.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="maggiori-info" className="text-xl font-semibold text-foreground">
              6. Maggiori informazioni
            </h2>
            <p className="text-muted-foreground">
              Per il trattamento dei dati personali raccolti tramite cookie e per esercitare i tuoi
              diritti rimandiamo all&apos;
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                informativa sulla privacy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="modifiche" className="text-xl font-semibold text-foreground">
              7. Modifiche
            </h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di aggiornare la presente informativa sui cookie. Le
              modifiche saranno pubblicate su questa pagina con indicazione della data di ultimo
              aggiornamento. Ti consigliamo di consultare periodicamente questa pagina.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="contatti" className="text-xl font-semibold text-foreground">
              8. Contatti
            </h2>
            <p className="text-muted-foreground">
              Per domande relative ai cookie puoi contattarci all&apos;indirizzo email indicato
              nella sezione Contatti del sito o nella pagina dedicata.
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  )
}
