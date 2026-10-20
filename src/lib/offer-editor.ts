import type { Offer } from '@/lib/offers-content'
import type {
  ExpiryOverride,
  GuideBlock,
  GuideBlockType,
  GuideButtonKind,
  GuideCalloutTone,
  OfferAdmin,
  OfferCardApi,
  OfferGuide,
  OfferInput,
  OfferType,
  OfferVisibility,
} from '@/types/offers'

/**
 * La logica pura dell'editor delle offerte nel backoffice (§14.262): valori di partenza, blocchi
 * nuovi, slug, spostamenti nelle liste, pulizia e controlli prima del salvataggio (gli stessi del
 * backend, §14.261, così l'errore arriva accanto al campo e non come 400) e la conversione verso
 * la carta della pagina pubblica per l'anteprima.
 */

export const VISIBILITY_LABELS: Record<OfferVisibility, string> = {
  draft: 'Bozza',
  published: 'Pubblicata',
  hidden: 'Nascosta',
}

export const OVERRIDE_LABELS: Record<'auto' | ExpiryOverride, string> = {
  auto: 'Automatica (dalla data)',
  active: 'Sempre attiva',
  expired: 'Scaduta',
}

export const BLOCK_LABELS: Record<GuideBlockType, string> = {
  paragraph: 'Paragrafo',
  checklist: 'Checklist',
  callout: 'Riquadro',
  image: 'Immagine',
  buttons: 'Pulsanti',
}

export const CALLOUT_TONE_LABELS: Record<GuideCalloutTone, string> = {
  note: 'Nota',
  tip: 'Consiglio',
  warning: 'Attenzione',
  danger: 'Errore comune',
}

export const BUTTON_KIND_LABELS: Record<GuideButtonKind, string> = {
  external: 'Sito esterno (nuova scheda)',
  oddsmatcher: 'Oddsmatcher',
  calculator: 'Calcolatore',
  link: 'Pagina del sito',
}

/** Gruppi già usati dal design, suggeriti nel campo (se ne può scrivere un altro). */
export const GROUP_SUGGESTIONS: Record<OfferType, string[]> = {
  benvenuto: ['Singola', 'Multipla', 'Rollover', 'Rimborso', 'Casinò'],
  ricorrenti: ['Ogni giorno', 'Ogni settimana', 'Ogni mese', 'Quando disponibili'],
  esclusive: [],
}

/** Il badge «Scade tra N giorni» compare da questo numero di giorni in giù. */
export const EXPIRING_SOON_DAYS = 3

export function emptyGuide(): OfferGuide {
  return {
    facts: { budget: null, time: '', minOdds: '', depositWithin: '' },
    signup: null,
    intro: '',
    requirement: '',
    warning: '',
    steps: [],
    faq: [],
    terms: { rows: [], verifiedOn: null, url: null, linkLabel: '' },
  }
}

export function emptyInput(): OfferInput {
  return {
    slug: '',
    type: 'benvenuto',
    groupLabel: null,
    bookmakerSlug: '',
    bookmakerName: '',
    title: '',
    profit: null,
    difficulty: 'Media',
    isNew: false,
    expiresOn: null,
    expiryOverride: null,
    sortOrder: 0,
    guide: emptyGuide(),
  }
}

export function newBlock(type: GuideBlockType): GuideBlock {
  switch (type) {
    case 'paragraph':
      return { type, text: '' }
    case 'checklist':
      return { type, items: [''] }
    case 'callout':
      return { type, tone: 'note', text: '' }
    case 'image':
      return { type, src: '', alt: '', caption: '' }
    case 'buttons':
      return { type, buttons: [{ kind: 'external', label: '', href: '' }] }
  }
}

/** "Snai: Deposita 60 €!" → "snai-deposita-60" (accenti tolti, massimo 80 caratteri). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/** Lo slug proposto finché non lo si scrive a mano: sito e titolo. */
export function suggestedSlug(bookmakerSlug: string, title: string): string {
  return slugify(`${bookmakerSlug} ${title}`)
}

/** "williamhill" → "Williamhill": il nome di partenza, da correggere a mano se serve. */
export function defaultBookmakerName(slug: string): string {
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : ''
}

/** Sposta l'elemento i di delta posizioni (−1 su, +1 giù); fuori dai bordi non cambia nulla. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const to = index + delta
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list]
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(to, 0, item)
  return next
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index)
}

export function replaceAt<T>(list: readonly T[], index: number, item: T): T[] {
  return list.map((current, i) => (i === index ? item : current))
}

/** Il contenuto di una riga del backoffice, da modificare. */
export function inputFromAdmin(offer: OfferAdmin): OfferInput {
  return {
    slug: offer.slug,
    type: offer.type,
    groupLabel: offer.groupLabel,
    bookmakerSlug: offer.bookmakerSlug,
    bookmakerName: offer.bookmakerName,
    title: offer.title,
    profit: offer.profit,
    difficulty: offer.difficulty,
    isNew: offer.isNew,
    expiresOn: offer.expiresOn,
    expiryOverride: offer.expiryOverride,
    sortOrder: offer.sortOrder,
    guide: offer.guide,
  }
}

const trim = (s: string) => s.trim()

/**
 * Prima del salvataggio: testi senza spazi ai bordi, voci vuote delle checklist tolte, gruppo,
 * pulsante di registrazione e link dei termini vuoti come null.
 */
export function cleanInput(input: OfferInput): OfferInput {
  const guide = input.guide
  return {
    ...input,
    slug: input.slug.trim().toLowerCase(),
    groupLabel: input.groupLabel?.trim() || null,
    bookmakerSlug: input.bookmakerSlug.trim().toLowerCase(),
    bookmakerName: input.bookmakerName.trim(),
    title: input.title.trim(),
    guide: guide && {
      facts: {
        budget: guide.facts.budget,
        time: guide.facts.time.trim(),
        minOdds: guide.facts.minOdds.trim(),
        depositWithin: guide.facts.depositWithin.trim(),
      },
      signup:
        guide.signup && (guide.signup.label.trim() || guide.signup.url.trim())
          ? { label: guide.signup.label.trim(), url: guide.signup.url.trim() }
          : null,
      intro: guide.intro.trim(),
      requirement: guide.requirement.trim(),
      warning: guide.warning.trim(),
      steps: guide.steps.map((step) => ({
        title: step.title.trim(),
        blocks: step.blocks.map(cleanBlock),
      })),
      faq: guide.faq.map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      })),
      terms: {
        rows: guide.terms.rows.map((row) => ({ label: row.label.trim(), value: row.value.trim() })),
        verifiedOn: guide.terms.verifiedOn || null,
        url: guide.terms.url?.trim() || null,
        linkLabel: guide.terms.linkLabel.trim(),
      },
    },
  }
}

function cleanBlock(block: GuideBlock): GuideBlock {
  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', text: block.text.trim() }
    case 'checklist':
      return { type: 'checklist', items: block.items.map(trim).filter(Boolean) }
    case 'callout':
      return { type: 'callout', tone: block.tone, text: block.text.trim() }
    case 'image':
      return {
        type: 'image',
        src: block.src.trim(),
        alt: block.alt.trim(),
        caption: block.caption.trim(),
      }
    case 'buttons':
      return {
        type: 'buttons',
        buttons: block.buttons.map((b) => ({
          kind: b.kind,
          label: b.label.trim(),
          href: b.href.trim(),
        })),
      }
  }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HTTP_URL = /^https?:\/\/[^\s/]+\.[^\s]+$/i
const SITE_PATH = /^\/(?!\/)\S*$/

export const isHttpUrl = (value: string) => HTTP_URL.test(value)
export const isSitePath = (value: string) => SITE_PATH.test(value)

/**
 * I controlli del backend sul contenuto già pulito: un elenco di frasi da mostrare sopra il
 * pulsante «Salva» (vuoto = si può salvare). Le regole sui link sono quelle di sicurezza: fuori
 * solo http(s), dentro solo percorsi del sito.
 */
export function validateInput(input: OfferInput): string[] {
  const errors: string[] = []
  if (!input.title) errors.push('Il titolo è obbligatorio.')
  if (!SLUG.test(input.slug)) {
    errors.push('Lo slug va scritto in minuscolo, con lettere, numeri e trattini (es. snai-30).')
  }
  if (!SLUG.test(input.bookmakerSlug)) errors.push('Scegli il sito di scommesse.')
  if (!input.bookmakerName) errors.push('Il nome del sito di scommesse è obbligatorio.')
  if (input.profit !== null && !Number.isFinite(input.profit)) {
    errors.push('Il profitto stimato deve essere un numero.')
  }
  const guide = input.guide
  if (!guide) return errors

  if (guide.signup) {
    if (!guide.signup.label) errors.push('Il pulsante di registrazione ha bisogno di un testo.')
    if (!isHttpUrl(guide.signup.url)) {
      errors.push('Il link di registrazione deve iniziare con https://.')
    }
  }
  guide.steps.forEach((step, i) => {
    const where = `Passo ${i + 1}`
    if (!step.title) errors.push(`${where}: manca il titolo.`)
    step.blocks.forEach((block, j) => {
      const at = `${where}, blocco ${j + 1} (${BLOCK_LABELS[block.type]})`
      switch (block.type) {
        case 'paragraph':
        case 'callout':
          if (!block.text) errors.push(`${at}: il testo è vuoto.`)
          break
        case 'checklist':
          if (block.items.length === 0) errors.push(`${at}: serve almeno una voce.`)
          break
        case 'image':
          if (!isHttpUrl(block.src) && !isSitePath(block.src)) {
            errors.push(`${at}: l'indirizzo deve iniziare con https:// o con /.`)
          }
          break
        case 'buttons':
          if (block.buttons.length === 0) errors.push(`${at}: serve almeno un pulsante.`)
          block.buttons.forEach((b, k) => {
            if (!b.label) errors.push(`${at}, pulsante ${k + 1}: manca il testo.`)
            const ok = b.kind === 'external' ? isHttpUrl(b.href) : isSitePath(b.href)
            if (!ok) {
              errors.push(
                b.kind === 'external'
                  ? `${at}, pulsante ${k + 1}: il link deve iniziare con https://.`
                  : `${at}, pulsante ${k + 1}: il link deve essere un percorso del sito, es. /odds-scanner.`,
              )
            }
          })
          break
      }
    })
  })
  guide.faq.forEach((item, i) => {
    if (!item.question || !item.answer) errors.push(`Domanda ${i + 1}: servono domanda e risposta.`)
  })
  guide.terms.rows.forEach((row, i) => {
    if (!row.label || !row.value) errors.push(`Termine ${i + 1}: servono voce e valore.`)
  })
  if (guide.terms.url && !isHttpUrl(guide.terms.url)) {
    errors.push('Il link ai termini deve iniziare con https://.')
  }
  return errors
}

/** AAAA-MM-GG di `now` a Roma: la scadenza conta in ora italiana, come nel backend. */
export function romeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000

/** Lo stesso calcolo della query del backend: la forzatura, altrimenti la data contro oggi. */
export function computeExpiry(
  expiresOn: string | null,
  override: ExpiryOverride | null,
  today: string,
): { expired: boolean; daysLeft: number | null } {
  const days = expiresOn ? dayNumber(expiresOn) - dayNumber(today) : null
  const expired =
    override === 'expired' ? true : override === 'active' ? false : days !== null && days < 0
  return { expired, daysLeft: expired || days === null || days < 0 ? null : days }
}

/**
 * La carta dell'API nella forma della pagina pubblica: scaduta con la sua data (o senza, se
 * forzata), «Scade tra N giorni» solo negli ultimi EXPIRING_SOON_DAYS giorni.
 */
export function offerFromCard(card: OfferCardApi): Offer {
  return {
    id: card.slug,
    type: card.type,
    group: card.groupLabel,
    bookSlug: card.bookmakerSlug,
    bookName: card.bookmakerName,
    title: card.title,
    profit: card.profit,
    difficulty: card.difficulty,
    isNew: card.isNew,
    expired: card.expired,
    expiredOn: card.expired && card.expiresOn ? card.expiresOn : undefined,
    expiresInDays:
      !card.expired && card.daysLeft !== null && card.daysLeft <= EXPIRING_SOON_DAYS
        ? card.daysLeft
        : undefined,
  }
}

/** L'anteprima dell'editor: il contenuto non salvato come lo mostrerebbe la pagina pubblica oggi. */
export function previewOffer(input: OfferInput, today: string): Offer {
  const { expired, daysLeft } = computeExpiry(input.expiresOn, input.expiryOverride, today)
  return offerFromCard({
    slug: input.slug || 'anteprima',
    type: input.type,
    groupLabel: input.groupLabel?.trim() || null,
    bookmakerSlug: input.bookmakerSlug,
    bookmakerName: input.bookmakerName || 'Sito di scommesse',
    title: input.title || 'Titolo dell’offerta',
    profit: input.profit,
    difficulty: input.difficulty,
    isNew: input.isNew,
    expiresOn: input.expiresOn,
    expired,
    daysLeft,
    hasGuide: input.guide !== null,
    sortOrder: input.sortOrder,
  })
}

/** Lo stato in una parola per la tabella del backoffice. */
export function expiryLabel(
  offer: Pick<OfferAdmin, 'expired' | 'daysLeft' | 'expiryOverride'>,
): string {
  if (offer.expired) return offer.expiryOverride === 'expired' ? 'Scaduta (forzata)' : 'Scaduta'
  if (offer.daysLeft !== null) {
    return offer.daysLeft === 0 ? 'Ultimo giorno' : `Attiva, scade tra ${offer.daysLeft} gg`
  }
  return offer.expiryOverride === 'active' ? 'Attiva (forzata)' : 'Attiva'
}
