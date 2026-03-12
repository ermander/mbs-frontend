'use client'

import { useTheme } from '@/hooks/use-theme'
import { DARK_THEME_OPTIONS, LIGHT_THEME_OPTIONS, type ThemeId } from '@/lib/theme'
import { cn } from '@/lib/utils'

function ThemeGroup({
  label,
  options,
  theme,
  setTheme,
}: {
  label: string
  options: { id: ThemeId; label: string }[]
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={theme === opt.id}
            onClick={() => setTheme(opt.id)}
            className={cn(
              'rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              theme === opt.id
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ThemeSelector() {
  const { theme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="radiogroup" aria-label="Tema del sito">
      <ThemeGroup label="Scuro" options={DARK_THEME_OPTIONS} theme={theme} setTheme={setTheme} />
      <ThemeGroup label="Chiaro" options={LIGHT_THEME_OPTIONS} theme={theme} setTheme={setTheme} />
    </div>
  )
}
