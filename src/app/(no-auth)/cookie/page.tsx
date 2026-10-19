import { LegalPage, type LegalSection } from '@/components/landing/legal-primitives'
import { DsTextLink } from '@/components/landing/ds-primitives'
import { SiteShell } from '@/components/landing/site-shell'

// =====================================================================
// Informativa sui cookie (ADAPTER_STATUS §14.250).
//
// Elenco letto dal codice il 2026-10-18: il backend imposta solo
// access_token e refresh_token (setAuthCookies: httpOnly, Secure,
// SameSite=Lax, senza maxAge → cookie di sessione; i JWT dentro valgono
// JWT_ACCESS_EXPIRES_IN=15m e JWT_REFRESH_EXPIRES_IN=7d, rinnovati
// insieme a ogni /auth/refresh) e, solo durante l'accesso con Google,
// google_oauth (10 minuti, path /api/auth/google, rimosso al callback).
// Nel browser: i tre store Zustand con persist (mbs-auth, mbs-agenda,
// mbs-result-btts-stake) in localStorage. Nessun analytics, nessun
// cookie di terze parti (flagcdn.com e il proxy Cloudflare non ne
// impostano). Da aggiornare se cambiano le durate o si aggiunge uno store.
// =====================================================================

interface CookieRow {
  name: string
  purpose: string
  kind: string
  duration: string
}

const COOKIES: readonly CookieRow[] = [
  {
    name: 'access_token',
    purpose:
      'Autenticazione: dimostra al server che hai effettuato l’accesso e ti tiene connesso mentre usi l’app.',
    kind: 'Tecnico, di prima parte',
    duration:
      'Cookie di sessione, eliminato alla chiusura del browser. Il token che contiene vale 15 minuti e viene rinnovato in automatico tramite refresh_token.',
  },
  {
    name: 'refresh_token',
    purpose: 'Autenticazione: rinnova l’accesso senza farti reinserire le credenziali.',
    kind: 'Tecnico, di prima parte',
    duration:
      'Cookie di sessione, eliminato alla chiusura del browser. Il token che contiene vale 7 giorni dall’ultimo rinnovo.',
  },
  {
    name: 'google_oauth',
    purpose:
      'Autenticazione con Google: lega la richiesta di accesso alla risposta di Google, così nessuno può completare l’accesso al posto tuo.',
    kind: 'Tecnico, di prima parte, solo durante l’accesso con Google',
    duration: '10 minuti; viene rimosso appena l’accesso con Google si conclude.',
  },
]

interface StorageRow {
  key: string
  purpose: string
}

const LOCAL_STORAGE: readonly StorageRow[] = [
  {
    key: 'mbs-auth',
    purpose:
      'Un solo indicatore «hai effettuato l’accesso», per mostrarti subito la pagina giusta all’apertura dell’app, prima della verifica con il server.',
  },
  {
    key: 'mbs-agenda',
    purpose:
      'Le voci dell’agenda dei calcolatori Punta-Banca e Punta-Punta che salvi tu (importi, quote e risultati dei calcoli). Esistono solo nel tuo browser.',
  },
  {
    key: 'mbs-result-btts-stake',
    purpose:
      'Le due preferenze del calcolatore «Risultato + Goal», per chi lo usa: cuscinetto da lasciare sui conti e puntata massima.',
  },
]

const TH =
  'py-2 pr-4 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-ds-ink-muted'
const TD = 'py-3 pr-4 align-top text-[14px] leading-[1.55]'

function CookieTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-ds-line">
            <th scope="col" className={TH}>
              Nome
            </th>
            <th scope="col" className={TH}>
              Finalità
            </th>
            <th scope="col" className={TH}>
              Tipo
            </th>
            <th scope="col" className={TH}>
              Durata
            </th>
            <th scope="col" className={TH}>
              httpOnly
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ds-line">
          {COOKIES.map((c) => (
            <tr key={c.name}>
              <td className={`${TD} whitespace-nowrap font-mono text-ds-ink`}>{c.name}</td>
              <td className={TD}>{c.purpose}</td>
              <td className={TD}>{c.kind}</td>
              <td className={TD}>{c.duration}</td>
              <td className={TD}>Sì</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StorageTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse">
        <thead>
          <tr className="border-b border-ds-line">
            <th scope="col" className={TH}>
              Chiave
            </th>
            <th scope="col" className={TH}>
              Cosa contiene e a cosa serve
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ds-line">
          {LOCAL_STORAGE.map((s) => (
            <tr key={s.key}>
              <td className={`${TD} whitespace-nowrap font-mono text-ds-ink`}>{s.key}</td>
              <td className={TD}>{s.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SECTIONS: readonly LegalSection[] = [
  {
    id: 'introduzione',
    title: 'Introduzione',
    body: (
      <p>
        Questa informativa spiega quali cookie e quali altre forme di memorizzazione nel browser usa
        il sito OddWise, a cosa servono e perché non ti chiediamo un consenso. Per il trattamento
        dei dati personali nel suo insieme rimandiamo all&apos;
        <DsTextLink href="/privacy">informativa sulla privacy</DsTextLink>.
      </p>
    ),
  },
  {
    id: 'cosa-sono',
    title: 'Cosa sono i cookie',
    body: (
      <p>
        I cookie sono piccoli file di testo che un sito salva nel browser per riconoscerlo alle
        richieste successive. La normativa (art. 122 del Codice privacy e Linee guida del Garante
        per la protezione dei dati personali del 10 giugno 2021) distingue i cookie tecnici,
        necessari a erogare il servizio che l&apos;utente ha chiesto e utilizzabili senza consenso,
        dai cookie analitici e di profilazione, che richiedono il consenso dell&apos;utente.
      </p>
    ),
  },
  {
    id: 'cookie-utilizzati',
    title: 'Cookie che utilizziamo',
    body: (
      <>
        <p>
          Il sito imposta tre cookie, tutti tecnici e tutti nostri (di «prima parte»). I primi due
          esistono solo dopo che hai effettuato l&apos;accesso e vengono eliminati quando esci; il
          terzo compare soltanto nei pochi minuti dell&apos;accesso con Google.
        </p>
        <CookieTable />
        <p>
          httpOnly significa che il cookie viaggia solo tra il browser e il server e non è leggibile
          dagli script della pagina. Tutti e tre sono inoltre Secure (trasmessi solo in HTTPS) e
          SameSite=Lax (non inviati nelle richieste che partono da altri siti).
        </p>
      </>
    ),
  },
  {
    id: 'nessun-banner',
    title: 'Perché non c’è un banner',
    body: (
      <p>
        I tre cookie servono solo a tenerti autenticato e a completare l&apos;accesso con Google,
        cioè a erogare il servizio che hai chiesto. Per i cookie tecnici le Linee guida del Garante
        del 10 giugno 2021 e l&apos;art. 122 del Codice privacy non richiedono il consenso: basta
        questa informativa. Il sito non usa cookie analitici, di profilazione o di terze parti,
        quindi non c&apos;è nulla da accettare o rifiutare e non mostriamo un banner. Se in futuro
        introdurremo strumenti che lo richiedono, aggiorneremo questa pagina e chiederemo il
        consenso prima di attivarli.
      </p>
    ),
  },
  {
    id: 'memorizzazione-browser',
    title: 'Memorizzazione tecnica nel browser',
    body: (
      <>
        <p>
          Oltre ai cookie, l&apos;applicazione salva alcune informazioni nella memoria locale del
          browser (localStorage). Restano sul tuo dispositivo, non vengono inviate al server e non
          scadono: le elimini cancellando i dati del sito dalle impostazioni del browser.
        </p>
        <StorageTable />
        <p>
          Anche questa memorizzazione è tecnica, strettamente necessaria alle funzioni che usi, e
          non richiede consenso.
        </p>
      </>
    ),
  },
  {
    id: 'terze-parti',
    title: 'Cookie di terze parti',
    body: (
      <p>
        Nessuno. Il sito non carica script di terze parti, non usa strumenti di analytics e non
        imposta cookie di soggetti diversi dal titolare. Le immagini delle bandiere arrivano da
        flagcdn.com, che non imposta cookie; il traffico passa attraverso il proxy di Cloudflare,
        che sulle pagine del sito non imposta cookie.
      </p>
    ),
  },
  {
    id: 'gestione',
    title: 'Come gestire i cookie',
    body: (
      <p>
        Puoi bloccare o cancellare i cookie dalle impostazioni del tuo browser (le istruzioni sono
        nelle pagine di assistenza di Chrome, Firefox, Safari ed Edge). Senza i cookie di
        autenticazione non è possibile accedere all&apos;area riservata. Uscendo dall&apos;account i
        cookie vengono eliminati; i dati nella memoria locale si cancellano con i dati del sito.
      </p>
    ),
  },
  {
    id: 'modifiche',
    title: 'Modifiche',
    body: (
      <p>
        Aggiorneremo questa informativa se cambieranno i cookie o le altre memorizzazioni usate dal
        sito. Le modifiche saranno pubblicate su questa pagina con la data di ultimo aggiornamento.
      </p>
    ),
  },
  {
    id: 'contatti',
    title: 'Contatti',
    body: (
      <p>
        Per domande sui cookie scrivi al titolare ai recapiti indicati nell&apos;
        <DsTextLink href="/privacy#titolare">informativa sulla privacy</DsTextLink>.
      </p>
    ),
  },
]

export default function CookiePage() {
  return (
    <SiteShell>
      <LegalPage title="Informativa sui cookie" updated="18 ottobre 2026" sections={SECTIONS} />
    </SiteShell>
  )
}
