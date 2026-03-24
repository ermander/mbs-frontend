import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'MBS — Matched Betting System'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E2A44',
        gap: 40,
      }}
    >
      {/* Bars icon */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 60,
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
          }}
        />
        <div
          style={{
            width: 28,
            height: 90,
            borderRadius: 6,
            backgroundColor: '#2F6BFF',
          }}
        />
        <div
          style={{
            width: 28,
            height: 120,
            borderRadius: 6,
            backgroundColor: '#2F6BFF',
          }}
        />
        <div
          style={{
            width: 28,
            height: 150,
            borderRadius: 6,
            backgroundColor: '#1FC7A6',
          }}
        />
      </div>

      {/* Text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 56, color: '#FFFFFF', fontWeight: 700 }}>Matched Betting</div>
        <div
          style={{
            fontSize: 28,
            color: '#FFFFFF',
            letterSpacing: 8,
            opacity: 0.8,
          }}
        >
          SYSTEM
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 24,
          color: '#94A3B8',
          maxWidth: 800,
          textAlign: 'center',
        }}
      >
        Confronta le quote, usa i calcolatori e massimizza i guadagni
      </div>
    </div>,
    { ...size },
  )
}
