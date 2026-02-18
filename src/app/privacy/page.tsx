import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Informativa sulla privacy
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
              La presente informativa descrive come MBS raccoglie, utilizza e protegge i dati
              personali degli utenti del sito e dei servizi associati. Si rivolge a tutti i
              visitatori e agli utenti registrati. Ti invitiamo a leggere con attenzione le sezioni
              seguenti.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="titolare" className="text-xl font-semibold text-foreground">
              2. Titolare del trattamento
            </h2>
            <p className="text-muted-foreground">
              Il titolare del trattamento dei dati personali è [Nome/Ragione sociale], con sede in
              [indirizzo]. Per qualsiasi richiesta relativa alla privacy puoi contattarci
              all&apos;indirizzo email indicato nella sezione Contatti o nella pagina dedicata.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="dati-finalita" className="text-xl font-semibold text-foreground">
              3. Dati raccolti e finalità
            </h2>
            <p className="text-muted-foreground">
              Raccogliamo dati necessari per erogare il servizio e migliorare l&apos;esperienza
              utente: indirizzo email (in fase di registrazione), dati di utilizzo del sito (es.
              pagine visitate, dispositivo), e altre informazioni che fornisci volontariamente. I
              dati sono utilizzati per la gestione dell&apos;account, l&apos;invio di comunicazioni
              relative al servizio, il miglioramento del sito e l&apos;adempimento di obblighi di
              legge. Ulteriori finalità potranno essere specificate nel testo definitivo
              dell&apos;informativa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="base-giuridica" className="text-xl font-semibold text-foreground">
              4. Base giuridica
            </h2>
            <p className="text-muted-foreground">
              Il trattamento dei tuoi dati si basa, a seconda dei casi, sull&apos;esecuzione del
              contratto (erogazione del servizio), sul consenso (ove richiesto), sul legittimo
              interesse del titolare (es. sicurezza, miglioramento del servizio) o su obblighi di
              legge. Per ogni finalità la base giuridica di riferimento sarà indicata nel dettaglio
              nel testo legale definitivo.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="destinatari" className="text-xl font-semibold text-foreground">
              5. Destinatari e trasferimenti
            </h2>
            <p className="text-muted-foreground">
              I dati possono essere comunicati a soggetti che forniscono servizi necessari
              all&apos;erogazione della piattaforma (es. hosting, email). In caso di trasferimenti
              verso paesi extra-UE, adotteremo le garanzie previste dalla normativa (clausole
              contrattuali tipo, decisioni di adeguatezza o altro). I dettagli saranno specificati
              nell&apos;informativa aggiornata.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="conservazione" className="text-xl font-semibold text-foreground">
              6. Conservazione
            </h2>
            <p className="text-muted-foreground">
              I dati sono conservati per il tempo necessario a perseguire le finalità indicate e,
              ove richiesto, per adempiere obblighi legali. I criteri e i tempi di conservazione per
              categoria di dati saranno precisati nel testo definitivo dell&apos;informativa.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="diritti" className="text-xl font-semibold text-foreground">
              7. Diritti dell&apos;interessato
            </h2>
            <p className="text-muted-foreground">
              In qualità di interessato hai il diritto di accedere ai tuoi dati, di richiederne la
              rettifica o la cancellazione, la limitazione del trattamento, la portabilità (ove
              applicabile) e di opporti al trattamento nei casi previsti dalla legge. Hai inoltre il
              diritto di proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati
              Personali (garanteprivacy.it). Per esercitare i tuoi diritti puoi contattarci ai
              recapiti indicati nella sezione Contatti.
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="cookie" className="text-xl font-semibold text-foreground">
              8. Cookie
            </h2>
            <p className="text-muted-foreground">
              Il sito utilizza cookie e tecnologie simili per il funzionamento del servizio e, ove
              previsto, per analisi e personalizzazione. Per maggiori informazioni sui cookie e su
              come gestirli consulta la nostra{' '}
              <Link
                href="/cookie"
                className="text-primary underline underline-offset-4 hover:no-underline"
              >
                informativa sui cookie
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="modifiche" className="text-xl font-semibold text-foreground">
              9. Modifiche
            </h2>
            <p className="text-muted-foreground">
              Ci riserviamo il diritto di aggiornare la presente informativa. Le modifiche saranno
              pubblicate su questa pagina con indicazione della data di ultimo aggiornamento. Ti
              consigliamo di consultare periodicamente questa pagina; in caso di modifiche rilevanti
              potremmo informarti tramite i canali disponibili (es. email, avviso in sito).
            </p>
          </section>

          <section className="space-y-4">
            <h2 id="contatti" className="text-xl font-semibold text-foreground">
              10. Contatti
            </h2>
            <p className="text-muted-foreground">
              Per esercitare i diritti previsti dal GDPR o per qualsiasi domanda sulla privacy puoi
              contattarci all&apos;indirizzo email indicato nella sezione Contatti del sito o nella
              pagina dedicata.
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </>
  )
}
