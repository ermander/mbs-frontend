import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

export default function TerminiPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Termini di servizio
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ultimo aggiornamento: 1 gennaio 2025
            </p>
          </div>

          <section className="space-y-4">
            <h2 id="accettazione" className="text-xl font-semibold text-foreground">
              1. Introduzione e accettazione
            </h2>
            <p className="text-muted-foreground">
              L&apos;accesso e l&apos;utilizzo di questo sito e dei servizi associati implicano
              l&apos;accettazione integrale dei presenti Termini di servizio. Se non accetti queste
              condizioni, ti invitiamo a non utilizzare il servizio. La continuazione
              dell&apos;utilizzo dopo eventuali modifiche costituisce accettazione dei termini
              aggiornati.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="definizioni" className="text-xl font-semibold text-foreground">
              2. Definizioni
            </h2>
            <p className="text-muted-foreground">
              Per &quot;Servizio&quot; si intende la piattaforma web MBS e tutte le funzionalità,
              strumenti e contenuti offerti. Per &quot;Utente&quot; si intende chiunque acceda o
              utilizzi il Servizio. Per &quot;Contenuto&quot; si intende testi, dati, strumenti e
              materiali resi disponibili attraverso il Servizio. Altre definizioni potranno essere
              specificate nel contesto delle singole sezioni.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="servizi" className="text-xl font-semibold text-foreground">
              3. Servizi offerti
            </h2>
            <p className="text-muted-foreground">
              Il Servizio fornisce strumenti informativi e di calcolo relativi al confronto delle
              quote, al matched betting e a strategie correlate (ad es. sure bet, value bet). I
              contenuti hanno scopo puramente informativo e non costituiscono consulenza legale,
              fiscale o finanziaria. L&apos;utente è responsabile del proprio utilizzo del Servizio
              in conformità con le leggi applicabili.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="registrazione" className="text-xl font-semibold text-foreground">
              4. Registrazione e account
            </h2>
            <p className="text-muted-foreground">
              Per accedere ad alcune funzionalità è possibile che sia richiesta la registrazione.
              L&apos;utente si impegna a fornire dati veritieri e aggiornati e a mantenere la
              riservatezza delle credenziali di accesso. È tua responsabilità notificarci
              tempestivamente qualsiasi uso non autorizzato dell&apos;account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="obblighi" className="text-xl font-semibold text-foreground">
              5. Obblighi dell&apos;utente
            </h2>
            <p className="text-muted-foreground">
              L&apos;utente si impegna a utilizzare il Servizio in modo lecito e in conformità con i
              presenti Termini. È vietato utilizzare il Servizio per scopi illeciti, per violare
              diritti di terzi o per sovraccaricare o compromettere l&apos;infrastruttura.
              L&apos;utente è tenuto a garantire l&apos;accuratezza delle informazioni fornite e a
              non diffondere contenuti offensivi o illegali.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="responsabilita" className="text-xl font-semibold text-foreground">
              6. Limitazione di responsabilità
            </h2>
            <p className="text-muted-foreground">
              Il Servizio è fornito &quot;as is&quot; (così com&apos;è). Non garantiamo risultati
              specifici né l&apos;assenza di errori o interruzioni. Nella misura massima consentita
              dalla legge, non siamo responsabili per danni diretti, indiretti, consequenziali o
              punitivi derivanti dall&apos;uso o dall&apos;impossibilità di usare il Servizio. La
              responsabilità è in ogni caso limitata secondo quanto previsto dalla normativa
              applicabile.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="modifiche" className="text-xl font-semibold text-foreground">
              7. Modifiche ai termini
            </h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le
              modifiche saranno efficaci dalla pubblicazione su questa pagina, con indicazione
              dell&apos;ultimo aggiornamento. Ti consigliamo di consultare periodicamente questa
              pagina. L&apos;uso continuato del Servizio dopo le modifiche costituisce accettazione
              dei nuovi termini.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="legge" className="text-xl font-semibold text-foreground">
              8. Legge applicabile e foro competente
            </h2>
            <p className="text-muted-foreground">
              I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia
              derivante da o in relazione ai presenti Termini o al Servizio sarà competente
              esclusivamente il foro del luogo di residenza o domicilio dell&apos;utente, se
              consumatore; in ogni altro caso il foro di [città sede legale].
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="contatti" className="text-xl font-semibold text-foreground">
              9. Contatti
            </h2>
            <p className="text-muted-foreground">
              Per domande relative ai Termini di servizio puoi contattarci all&apos;indirizzo email
              indicato nella sezione Contatti del sito o nella pagina dedicata.
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  )
}
