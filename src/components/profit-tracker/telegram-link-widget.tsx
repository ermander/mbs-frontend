'use client'

import { useEffect } from 'react'
import { ExternalLink, Send } from 'lucide-react'

import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { FieldError } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

interface TelegramLinkWidgetProps {
  botUsername?: string
}

/**
 * Il collegamento a Telegram per i promemoria, sul design OddWise (§14.350): stato, i tre passi
 * con il codice da mandare al bot, Scollega. Stessa logica di prima.
 */
export function TelegramLinkWidget({ botUsername }: TelegramLinkWidgetProps) {
  const telegramStatus = useProfitTrackerStore((s) => s.telegramStatus)
  const telegramStatusError = useProfitTrackerStore((s) => s.telegramStatusError)
  const isLoadingTelegramStatus = useProfitTrackerStore((s) => s.isLoadingTelegramStatus)
  const isGeneratingTelegramCode = useProfitTrackerStore((s) => s.isGeneratingTelegramCode)
  const generatedTelegramCode = useProfitTrackerStore((s) => s.generatedTelegramCode)
  const fetchTelegramStatus = useProfitTrackerStore((s) => s.fetchTelegramStatus)
  const generateTelegramCode = useProfitTrackerStore((s) => s.generateTelegramCode)
  const unlinkTelegram = useProfitTrackerStore((s) => s.unlinkTelegram)

  useEffect(() => {
    void fetchTelegramStatus()
  }, [fetchTelegramStatus])

  const botLink =
    botUsername && botUsername.trim().length > 0 ? `https://t.me/${botUsername}` : undefined
  const linked = telegramStatus?.linked === true

  return (
    <div className="flex flex-col gap-4 rounded-ds-sm border border-ds-line bg-ds-surface-sunken p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Send className="h-4 w-4 text-ds-ink-muted" aria-hidden />
            <span className="text-sm leading-5 font-semibold text-ds-ink">Notifiche Telegram</span>
            {!isLoadingTelegramStatus && (
              <DsBadge tone={linked ? 'profit' : 'neutral'}>
                {linked ? 'Collegato' : 'Non collegato'}
              </DsBadge>
            )}
          </div>
          {isLoadingTelegramStatus ? (
            <p className="ds-body-sm m-0 text-ds-ink-muted">Verifica del collegamento…</p>
          ) : linked ? (
            <p className="ds-body-sm m-0 text-ds-ink-muted">
              I promemoria del Profit Tracker arrivano qui.
              {telegramStatus?.linkedAt &&
                ` Collegato il ${new Date(telegramStatus.linkedAt).toLocaleString('it-IT', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}.`}
            </p>
          ) : (
            <>
              <p className="ds-body-sm m-0 text-ds-ink-muted">
                Collega il tuo account Telegram per ricevere i promemoria in automatico.
              </p>
              <ol className="ds-body-sm m-0 flex list-decimal flex-col gap-0.5 pl-5 text-ds-ink">
                <li>Genera un codice di collegamento.</li>
                <li>
                  Apri il bot {botUsername ? `@${botUsername}` : 'Telegram dedicato'}
                  {botLink ? ' da «Apri il bot Telegram»' : ''}.
                </li>
                <li>
                  Manda al bot il comando{' '}
                  <code className="rounded-ds-xs bg-ds-surface-raised px-1 font-mono text-[13px] whitespace-nowrap">
                    /link CODICE
                  </code>
                  .
                </li>
              </ol>
            </>
          )}
        </div>
        <div className="flex flex-none flex-col gap-2 sm:items-end">
          {linked ? (
            <button
              type="button"
              onClick={() => void unlinkTelegram()}
              className={dsButtonClass('secondary', 'sm')}
            >
              Scollega Telegram
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void generateTelegramCode()}
              disabled={isGeneratingTelegramCode || isLoadingTelegramStatus}
              className={cn(dsButtonClass('primary', 'sm'), 'disabled:opacity-50')}
            >
              {isGeneratingTelegramCode ? 'Generazione…' : 'Genera il codice'}
            </button>
          )}
          {botLink && (
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'inline-flex items-center gap-1 rounded-sm text-sm leading-5 font-semibold text-ds-brand hover:text-ds-brand-hover',
                dsFocusRing,
              )}
            >
              Apri il bot Telegram
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
      {generatedTelegramCode && (
        <p className="ds-body-sm m-0 flex flex-wrap items-center gap-2 rounded-ds-sm border border-ds-line bg-ds-surface-raised px-3 py-2">
          <span className="text-ds-ink-muted">Codice di collegamento</span>
          <code className="font-mono text-base font-semibold tracking-[0.08em] text-ds-ink select-all">
            {generatedTelegramCode}
          </code>
        </p>
      )}
      {telegramStatusError && <FieldError id="telegram-error">{telegramStatusError}</FieldError>}
    </div>
  )
}
