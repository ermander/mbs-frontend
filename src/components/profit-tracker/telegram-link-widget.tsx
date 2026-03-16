'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

interface TelegramLinkWidgetProps {
  botUsername?: string
}

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

  const handleGenerateCode = async () => {
    await generateTelegramCode()
  }

  const handleUnlink = async () => {
    await unlinkTelegram()
  }

  const botLink =
    botUsername && botUsername.trim().length > 0 ? `https://t.me/${botUsername}` : undefined

  return (
    <section className="mb-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium">Notifiche Telegram</p>
          {isLoadingTelegramStatus ? (
            <p className="text-xs text-muted-foreground">
              Verifica dello stato di collegamento in corso...
            </p>
          ) : telegramStatus?.linked ? (
            <>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Il tuo account è collegato a Telegram. Riceverai qui i promemoria del Profit
                Tracker.
              </p>
              {telegramStatus.linkedAt && (
                <p className="text-xs text-muted-foreground">
                  Collegato il{' '}
                  {new Date(telegramStatus.linkedAt).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Collega il tuo account Telegram per ricevere notifiche automatiche sui promemoria.
              </p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                <li>Genera un codice di collegamento.</li>
                <li>
                  Apri il bot {botUsername ? `@${botUsername}` : 'Telegram dedicato'}{' '}
                  {botLink && (
                    <a
                      href={botLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      (apri bot)
                    </a>
                  )}
                  .
                </li>
                <li>Invia il comando /link CODICE nel bot.</li>
              </ol>
            </>
          )}
          {generatedTelegramCode && (
            <p className="mt-1 rounded-md bg-background px-2 py-1 font-mono text-xs">
              Codice di collegamento: <span className="font-semibold">{generatedTelegramCode}</span>
            </p>
          )}
          {telegramStatusError && (
            <p className="mt-1 text-xs text-destructive">{telegramStatusError}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {telegramStatus?.linked ? (
            <Button variant="outline" size="sm" type="button" onClick={handleUnlink}>
              Scollega Telegram
            </Button>
          ) : (
            <Button
              size="sm"
              type="button"
              onClick={handleGenerateCode}
              disabled={isGeneratingTelegramCode}
            >
              {isGeneratingTelegramCode ? 'Generazione in corso...' : 'Genera codice'}
            </Button>
          )}
          {botLink && (
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Apri il bot Telegram
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
