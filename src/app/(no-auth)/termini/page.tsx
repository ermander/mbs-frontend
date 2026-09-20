import { LegalPage, type LegalSection } from '@/components/landing/legal-primitives'
import { TextLink } from '@/components/landing/landing-primitives'
import { SiteShell } from '@/components/landing/site-shell'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'accettazione',
    title: 'Introduzione e accettazione',
    body: (
      <p>
        L&apos;accesso e l&apos;utilizzo di questo sito e dei servizi associati implicano
        l&apos;accettazione integrale dei presenti Termini di servizio. Se non accetti queste
        condizioni, ti invitiamo a non utilizzare il servizio. La continuazione dell&apos;utilizzo
        dopo eventuali modifiche costituisce accettazione dei termini aggiornati.
      </p>
    ),
  },
  {
    id: 'definizioni',
    title: 'Definizioni',
    body: (
      <p>
        Per &quot;Servizio&quot; si intende la piattaforma web OddWise e tutte le funzionalità,
        strumenti e contenuti offerti. Per &quot;Utente&quot; si intende chiunque acceda o utilizzi
        il Servizio. Per &quot;Contenuto&quot; si intende testi, dati, strumenti e materiali resi
        disponibili attraverso il Servizio. Altre definizioni potranno essere specificate nel
        contesto delle singole sezioni.
      </p>
    ),
  },
  {
    id: 'servizi',
    title: 'Servizi offerti',
    body: (
      <p>
        Il Servizio fornisce strumenti informativi e di calcolo relativi al confronto delle quote,
        al matched betting e a strategie correlate (ad es. sure bet, value bet). I contenuti hanno
        scopo puramente informativo e non costituiscono consulenza legale, fiscale o finanziaria.
        L&apos;utente è responsabile del proprio utilizzo del Servizio in conformità con le leggi
        applicabili.
      </p>
    ),
  },
  {
    id: 'registrazione',
    title: 'Registrazione e account',
    body: (
      <p>
        Per accedere ad alcune funzionalità è possibile che sia richiesta la registrazione.
        L&apos;utente si impegna a fornire dati veritieri e aggiornati e a mantenere la riservatezza
        delle credenziali di accesso. È tua responsabilità notificarci tempestivamente qualsiasi uso
        non autorizzato dell&apos;account.
      </p>
    ),
  },
  {
    id: 'obblighi',
    title: 'Obblighi dell’utente',
    body: (
      <p>
        L&apos;utente si impegna a utilizzare il Servizio in modo lecito e in conformità con i
        presenti Termini. È vietato utilizzare il Servizio per scopi illeciti, per violare diritti
        di terzi o per sovraccaricare o compromettere l&apos;infrastruttura. L&apos;utente è tenuto
        a garantire l&apos;accuratezza delle informazioni fornite e a non diffondere contenuti
        offensivi o illegali.
      </p>
    ),
  },
  {
    id: 'responsabilita',
    title: 'Limitazione di responsabilità',
    body: (
      <p>
        Il Servizio è fornito &quot;as is&quot; (così com&apos;è). Non garantiamo risultati
        specifici né l&apos;assenza di errori o interruzioni. Nella misura massima consentita dalla
        legge, non siamo responsabili per danni diretti, indiretti, consequenziali o punitivi
        derivanti dall&apos;uso o dall&apos;impossibilità di usare il Servizio. La responsabilità è
        in ogni caso limitata secondo quanto previsto dalla normativa applicabile.
      </p>
    ),
  },
  {
    id: 'modifiche',
    title: 'Modifiche ai termini',
    body: (
      <p>
        Ci riserviamo il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche
        saranno efficaci dalla pubblicazione su questa pagina, con indicazione dell&apos;ultimo
        aggiornamento. Ti consigliamo di consultare periodicamente questa pagina. L&apos;uso
        continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi termini.
      </p>
    ),
  },
  {
    id: 'legge',
    title: 'Legge applicabile e foro competente',
    body: (
      <p>
        I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia derivante
        da o in relazione ai presenti Termini o al Servizio sarà competente esclusivamente il foro
        del luogo di residenza o domicilio dell&apos;utente, se consumatore; in ogni altro caso il
        foro di [città sede legale].
      </p>
    ),
  },
  {
    id: 'contatti',
    title: 'Contatti',
    body: (
      <p>
        Per domande relative ai Termini di servizio puoi contattarci all&apos;indirizzo email
        indicato nella <TextLink href="/contatti">pagina Contatti</TextLink>.
      </p>
    ),
  },
]

export default function TerminiPage() {
  return (
    <SiteShell>
      <LegalPage title="Termini di servizio" updated="1 gennaio 2025" sections={SECTIONS} />
    </SiteShell>
  )
}
