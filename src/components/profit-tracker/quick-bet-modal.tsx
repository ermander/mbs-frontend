'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { sanitizeDecimal } from '@/lib/utils'
import type { QuickGameMethod } from '@/types/profit-tracker'

interface QuickBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QUICK_METHODS: { value: QuickGameMethod; label: string }[] = [
  { value: 'baccarat', label: 'Baccarat' },
  { value: 'bingo', label: 'Bingo' },
  { value: 'blackjack', label: 'Blackjack' },
  { value: 'casino_live', label: 'Casino Live' },
  { value: 'gratta_e_vinci', label: 'Gratta e Vinci' },
  { value: 'quick_games', label: 'Quick Games' },
  { value: 'roulette', label: 'Roulette' },
  { value: 'slot_machine', label: 'Slot Machine' },
  { value: 'sport', label: 'Sport' },
  { value: 'trading', label: 'Trading' },
  { value: 'altro', label: 'Altro' },
]

export function QuickBetModal({ open, onOpenChange }: QuickBetModalProps) {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const addQuickBet = useProfitTrackerStore((s) => s.addQuickBet)
  const isSavingQuickBet = useProfitTrackerStore((s) => s.isSavingQuickBet)
  const quickBetError = useProfitTrackerStore((s) => s.quickBetError)

  const [accountId, setAccountId] = useState(allAccounts[0]?.id ?? '')
  const [moltiplicaConti, setMoltiplicaConti] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [method, setMethod] = useState<QuickGameMethod>('slot_machine')
  const [movimento, setMovimento] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [tag, setTag] = useState('')
  const [nota, setNota] = useState('')
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchAllAccounts()
  }, [open, fetchAllAccounts])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setMoltiplicaConti(false)
      setSelectedAccountIds([])
    }
    onOpenChange(next)
  }

  const accountOptions = useMemo(
    () => allAccounts.map((a) => ({ value: a.id, label: a.nome })),
    [allAccounts],
  )

  const multiAccountOptions = useMemo(
    () => allAccounts.map((a) => ({ id: a.id, name: a.nome })),
    [allAccounts],
  )

  const toggleSelectedAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const methodOptions = useMemo(
    () => QUICK_METHODS.map((m) => ({ value: m.value, label: m.label })),
    [],
  )

  const effectiveAccountId =
    accountId && allAccounts.some((a) => a.id === accountId)
      ? accountId
      : (allAccounts[0]?.id ?? '')

  const targetAccountIds = moltiplicaConti ? selectedAccountIds : [effectiveAccountId]

  const handleSave = async () => {
    const valore = Number.parseFloat(movimento.replace(',', '.'))
    if (targetAccountIds.length === 0 || !Number.isFinite(valore)) return

    const dataIso = new Date(dataRegistrazione).toISOString()

    for (const accId of targetAccountIds) {
      await addQuickBet({
        accountId: accId,
        quickMethod: method,
        movimento: valore,
        dataRegistrazione: dataIso,
        tag: tag || undefined,
        nota: nota || undefined,
      })
      if (useProfitTrackerStore.getState().quickBetError) return
    }

    setMovimento('')
    setTag('')
    setNota('')
    handleOpenChange(false)
  }

  const canSave =
    targetAccountIds.length > 0 &&
    movimento.trim() !== '' &&
    Number.isFinite(Number.parseFloat(movimento.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {/* Portal container per dropdown SearchableSelect dentro la modale */}
        <div
          ref={setDropdownPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
        <DialogHeader>
          <DialogTitle>Nuova giocata rapida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Conto</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={moltiplicaConti}
                  onChange={(e) => {
                    setMoltiplicaConti(e.target.checked)
                    if (e.target.checked)
                      setSelectedAccountIds(effectiveAccountId ? [effectiveAccountId] : [])
                  }}
                />
                Moltiplica su più conti
              </label>
            </div>
            {moltiplicaConti ? (
              <>
                <SearchableMultiSelect
                  options={multiAccountOptions}
                  selectedIds={selectedAccountIds}
                  onToggle={toggleSelectedAccount}
                  buttonLabel={
                    selectedAccountIds.length > 0
                      ? `${selectedAccountIds.length} conti selezionati`
                      : 'Seleziona conti'
                  }
                  showBadges
                  className="w-full"
                  portalContainer={dropdownPortalEl}
                />
                {selectedAccountIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Verrà creata la stessa giocata rapida su {selectedAccountIds.length} conti.
                  </p>
                )}
              </>
            ) : (
              <SearchableSelect
                id="quick-account"
                options={accountOptions}
                value={effectiveAccountId}
                onChange={setAccountId}
                allowEmpty={false}
                placeholder="Seleziona conto"
                searchPlaceholder="Cerca conto..."
                portalContainer={dropdownPortalEl}
              />
            )}
          </div>
          <SearchableSelect
            id="quick-method"
            label="Metodo"
            options={methodOptions}
            value={method}
            onChange={(v) => setMethod(v as QuickGameMethod)}
            allowEmpty={false}
            placeholder="Seleziona metodo"
            searchPlaceholder="Cerca metodo..."
            portalContainer={dropdownPortalEl}
          />
          <div className="space-y-1.5">
            <Label htmlFor="quick-movimento">Movimento (€)</Label>
            <Input
              id="quick-movimento"
              type="text"
              inputMode="decimal"
              value={movimento}
              onChange={(e) => setMovimento(sanitizeDecimal(e.target.value))}
              placeholder="Es. 25 o -15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-data">Registrato il</Label>
            <Input
              id="quick-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-tag">Tag (opzionale)</Label>
            <Input
              id="quick-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Es. Sessione serale"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-nota">Note (opzionale)</Label>
            <textarea
              id="quick-nota"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          {quickBetError && <p className="text-xs text-destructive">{quickBetError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || isSavingQuickBet}
          >
            {isSavingQuickBet ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
