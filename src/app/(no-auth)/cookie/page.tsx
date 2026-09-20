import { LegalPage, type LegalSection } from '@/components/landing/legal-primitives'
import { TextLink } from '@/components/landing/landing-primitives'
import { SiteShell } from '@/components/landing/site-shell'

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'introduzione',
    title: 'Introduzione',
    body: (
      <p>
        Questa informativa spiega cosa sono i cookie e come li utilizziamo sul sito OddWise. Si
        rivolge a tutti i visitatori. Per il trattamento dei dati personali nel suo insieme
        rimandiamo alla nostra <TextLink href="/privacy">informativa sulla privacy</TextLink>.
      </p>
    ),
  },
  {
    id: 'cosa-sono',
    title: 'Cosa sono i cookie',
    body: (
      <p>
        I cookie sono piccoli file di testo che i siti possono salvare sul tuo dispositivo per
        ricordare preferenze, sessioni o per finalità analitiche. Si distinguono generalmente in:
        cookie tecnici (necessari al funzionamento del sito), cookie di preferenza (lingua,
        impostazioni), cookie analitici (statistiche di utilizzo) e cookie di profilazione o
        marketing (pubblicità mirata). Per i cookie non tecnici è in genere richiesto il consenso
        dell&apos;utente.
      </p>
    ),
  },
  {
    id: 'cookie-utilizzati',
    title: 'Cookie che utilizziamo',
    body: (
      <p>
        Utilizziamo cookie necessari al funzionamento del sito (es. sessione, sicurezza) e, ove
        previsto, cookie per memorizzare preferenze (es. tema, lingua). L&apos;elenco dettagliato
        con nome, tipo, finalità e durata potrà essere integrato in questa sezione nel testo
        definitivo dell&apos;informativa.
      </p>
    ),
  },
  {
    id: 'terze-parti',
    title: 'Cookie di terze parti',
    body: (
      <p>
        In futuro potremmo integrare servizi di terze parti (es. analytics, widget social) che
        impostano propri cookie. In tal caso verranno indicati i fornitori, le finalità e i link
        alle rispettive informative. Per il momento non sono utilizzati cookie di terze parti;
        questa sezione sarà aggiornata in caso di modifiche.
      </p>
    ),
  },
  {
    id: 'gestione',
    title: 'Come gestire i cookie',
    body: (
      <p>
        Puoi gestire o disabilitare i cookie dalle impostazioni del tuo browser. Le istruzioni si
        trovano nelle pagine di assistenza dei principali browser (es. Chrome, Firefox, Safari,
        Edge). Tieni presente che disabilitare alcuni cookie potrebbe limitare alcune funzionalità
        del sito. Se sul sito sarà disponibile un pannello o uno strumento per le preferenze sui
        cookie, potrai utilizzarlo per selezionare quali categorie accettare.
      </p>
    ),
  },
  {
    id: 'maggiori-info',
    title: 'Maggiori informazioni',
    body: (
      <p>
        Per il trattamento dei dati personali raccolti tramite cookie e per esercitare i tuoi
        diritti rimandiamo all&apos;
        <TextLink href="/privacy">informativa sulla privacy</TextLink>.
      </p>
    ),
  },
  {
    id: 'modifiche',
    title: 'Modifiche',
    body: (
      <p>
        Ci riserviamo il diritto di aggiornare la presente informativa sui cookie. Le modifiche
        saranno pubblicate su questa pagina con indicazione della data di ultimo aggiornamento. Ti
        consigliamo di consultare periodicamente questa pagina.
      </p>
    ),
  },
  {
    id: 'contatti',
    title: 'Contatti',
    body: (
      <p>
        Per domande relative ai cookie puoi contattarci all&apos;indirizzo email indicato nella{' '}
        <TextLink href="/contatti">pagina Contatti</TextLink>.
      </p>
    ),
  },
]

export default function CookiePage() {
  return (
    <SiteShell>
      <LegalPage title="Informativa sui cookie" updated="1 gennaio 2025" sections={SECTIONS} />
    </SiteShell>
  )
}
