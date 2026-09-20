import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'OddWise: guadagna dai bonus dei siti di scommesse, senza rischio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const HEADLINE = 'Guadagna dai bonus dei siti di scommesse, senza rischio.'
const SUBTITLE =
  'Matched betting con strumenti e guide. Il profitto è deciso prima del fischio d’inizio.'
const BRAND = 'OddWise'
const PROFIT_LABEL = 'Profitto garantito'
const PROFIT = '+25,10 €'

/**
 * Carica da Google Fonts il solo sottoinsieme di glifi che serve (formato TTF, che Satori
 * legge). Senza rete al build l'immagine esce lo stesso con il font di default di next/og.
 */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url)).text()
    const resource = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)
    if (!resource) return null
    const res = await fetch(resource[1])
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

export default async function OgImage() {
  const [geist, bricolage, mono] = await Promise.all([
    loadGoogleFont('Geist:wght@500', HEADLINE + SUBTITLE + PROFIT_LABEL),
    loadGoogleFont('Bricolage+Grotesque:wght@800', BRAND),
    loadGoogleFont('JetBrains+Mono:wght@500', PROFIT),
  ])
  const fonts = [
    geist && { name: 'Geist', data: geist, weight: 500 as const, style: 'normal' as const },
    bricolage && {
      name: 'Bricolage Grotesque',
      data: bricolage,
      weight: 800 as const,
      style: 'normal' as const,
    },
    mono && { name: 'JetBrains Mono', data: mono, weight: 500 as const, style: 'normal' as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f))

  // Grammatica della landing: canvas #08090A, testo #F7F8F8 / #8A8F98, hairline all'8%,
  // raggio 12, un solo accento (#4DA3FF) sulla cifra del profitto.
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        backgroundColor: '#08090A',
        color: '#F7F8F8',
        fontFamily: 'Geist, sans-serif',
      }}
    >
      {/* Marchio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            border: '5px solid #F7F8F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 9999, backgroundColor: '#F7F8F8' }} />
        </div>
        <div
          style={{
            fontFamily: '"Bricolage Grotesque", Geist, sans-serif',
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: '-0.03em',
          }}
        >
          {BRAND}
        </div>
      </div>

      {/* Titolo e sottotitolo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 940 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.022em',
            color: '#F7F8F8',
          }}
        >
          {HEADLINE}
        </div>
        <div style={{ fontSize: 26, lineHeight: 1.4, color: '#8A8F98', maxWidth: 820 }}>
          {SUBTITLE}
        </div>
      </div>

      {/* Riga in basso: dominio a sinistra, cifra del profitto a destra */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 22, color: '#62666D' }}>Strumenti e guide di matched betting</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '18px 24px',
            borderRadius: 12,
            backgroundColor: '#0F1011',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: 18, color: '#8A8F98' }}>{PROFIT_LABEL}</div>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 500,
              fontSize: 40,
              lineHeight: 1,
              color: '#4DA3FF',
            }}
          >
            {PROFIT}
          </div>
        </div>
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
