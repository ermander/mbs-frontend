import { LegalPage, type LegalSection } from '@/components/landing/legal-primitives'
import { TextLink } from '@/components/landing/landing-primitives'
import { SiteShell } from '@/components/landing/site-shell'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'introduzione',
    title: 'Introduzione',
    body: (
      <p>
        La presente informativa descrive come OddWise raccoglie, utilizza e protegge i dati
        personali degli utenti del sito e dei servizi associati. Si rivolge a tutti i visitatori e
        agli utenti registrati. Ti invitiamo a leggere con attenzione le sezioni seguenti.
      </p>
    ),
  },
  {
    id: 'titolare',
    title: 'Titolare del trattamento',
    body: (
      <p>
        Il titolare del trattamento dei dati personali è [Nome/Ragione sociale], con sede in
        [indirizzo]. Per qualsiasi richiesta relativa alla privacy puoi contattarci
        all&apos;indirizzo email indicato nella sezione Contatti o nella pagina dedicata.
      </p>
    ),
  },
  {
    id: 'dati-finalita',
    title: 'Dati raccolti e finalità',
    body: (
      <p>
        Raccogliamo dati necessari per erogare il servizio e migliorare l&apos;esperienza utente:
        indirizzo email (in fase di registrazione), dati di utilizzo del sito (es. pagine visitate,
        dispositivo), e altre informazioni che fornisci volontariamente. I dati sono utilizzati per
        la gestione dell&apos;account, l&apos;invio di comunicazioni relative al servizio, il
        miglioramento del sito e l&apos;adempimento di obblighi di legge. Ulteriori finalità
        potranno essere specificate nel testo definitivo dell&apos;informativa.
      </p>
    ),
  },
  {
    id: 'base-giuridica',
    title: 'Base giuridica',
    body: (
      <p>
        Il trattamento dei tuoi dati si basa, a seconda dei casi, sull&apos;esecuzione del contratto
        (erogazione del servizio), sul consenso (ove richiesto), sul legittimo interesse del
        titolare (es. sicurezza, miglioramento del servizio) o su obblighi di legge. Per ogni
        finalità la base giuridica di riferimento sarà indicata nel dettaglio nel testo legale
        definitivo.
      </p>
    ),
  },
  {
    id: 'destinatari',
    title: 'Destinatari e trasferimenti',
    body: (
      <p>
        I dati possono essere comunicati a soggetti che forniscono servizi necessari
        all&apos;erogazione della piattaforma (es. hosting, email). In caso di trasferimenti verso
        paesi extra-UE, adotteremo le garanzie previste dalla normativa (clausole contrattuali tipo,
        decisioni di adeguatezza o altro). I dettagli saranno specificati nell&apos;informativa
        aggiornata.
      </p>
    ),
  },
  {
    id: 'conservazione',
    title: 'Conservazione',
    body: (
      <p>
        I dati sono conservati per il tempo necessario a perseguire le finalità indicate e, ove
        richiesto, per adempiere obblighi legali. I criteri e i tempi di conservazione per categoria
        di dati saranno precisati nel testo definitivo dell&apos;informativa.
      </p>
    ),
  },
  {
    id: 'diritti',
    title: 'Diritti dell’interessato',
    body: (
      <p>
        In qualità di interessato hai il diritto di accedere ai tuoi dati, di richiederne la
        rettifica o la cancellazione, la limitazione del trattamento, la portabilità (ove
        applicabile) e di opporti al trattamento nei casi previsti dalla legge. Hai inoltre il
        diritto di proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali
        (garanteprivacy.it). Per esercitare i tuoi diritti puoi contattarci ai recapiti indicati
        nella sezione Contatti.
      </p>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie',
    body: (
      <p>
        Il sito utilizza cookie e tecnologie simili per il funzionamento del servizio e, ove
        previsto, per analisi e personalizzazione. Per maggiori informazioni sui cookie e su come
        gestirli consulta la nostra <TextLink href="/cookie">informativa sui cookie</TextLink>.
      </p>
    ),
  },
  {
    id: 'modifiche',
    title: 'Modifiche',
    body: (
      <p>
        Ci riserviamo il diritto di aggiornare la presente informativa. Le modifiche saranno
        pubblicate su questa pagina con indicazione della data di ultimo aggiornamento. Ti
        consigliamo di consultare periodicamente questa pagina; in caso di modifiche rilevanti
        potremmo informarti tramite i canali disponibili (es. email, avviso in sito).
      </p>
    ),
  },
  {
    id: 'contatti',
    title: 'Contatti',
    body: (
      <p>
        Per esercitare i diritti previsti dal GDPR o per qualsiasi domanda sulla privacy puoi
        contattarci all&apos;indirizzo email indicato nella{' '}
        <TextLink href="/contatti">pagina Contatti</TextLink>.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <SiteShell>
      <LegalPage title="Informativa sulla privacy" updated="1 gennaio 2025" sections={SECTIONS} />
    </SiteShell>
  )
}
