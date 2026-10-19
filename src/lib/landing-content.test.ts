import { describe, expect, it } from 'vitest'
import * as content from './landing-content'
import { layStake, liability, minGain } from '@/lib/calculators/punta-banca'
import { roundStake } from '@/lib/calculators/stake-step'

const { ODDSMATCHER, ODDSMATCHER_ROWS, CALCULATOR, ...copy } = content
const copyText = JSON.stringify(copy)
const SITES =
  /snai|betfair|betflag|bet365|sisal|goldbet|eurobet|lottomatica|planetwin|bwin|william ?hill|betsson|leovegas|888/i
const cents = (n: number) => Math.round(n * 100) / 100

describe('landing copy (OddWise, design di Claude Design)', () => {
  it('never says "bookmaker": the word is "sito/siti di scommesse"', () => {
    expect(JSON.stringify(content)).not.toMatch(/bookmaker/i)
  })

  it('names betting sites only in the oddsmatcher rows and in the exchange of the calculator', () => {
    expect(copyText).not.toMatch(SITES)
    expect(JSON.stringify({ ...ODDSMATCHER, rows: undefined })).not.toMatch(SITES)
    const { example, ...calculatorCopy } = CALCULATOR
    expect(JSON.stringify(calculatorCopy)).not.toMatch(SITES)
    const { lay, ...exampleWithoutExchange } = example
    expect(JSON.stringify(exampleWithoutExchange)).not.toMatch(SITES)
    expect(lay.exchange).toBe('Betfair')
    for (const row of ODDSMATCHER_ROWS) {
      expect(row.site).toMatch(SITES)
      expect(row.exchange).toMatch(SITES)
    }
  })

  it('has the sections of the design with their counts', () => {
    expect(content.HOW_IT_WORKS.steps).toHaveLength(4)
    expect(ODDSMATCHER.rows).toHaveLength(5)
    expect(content.FAQ.items).toHaveLength(4)
    expect(content.TRUST.items).toHaveLength(3)
    expect(content.PRICING.plan.features).toHaveLength(4)
  })

  it('the oddsmatcher rows are sorted by rating, with the lay odds above the back odds', () => {
    const ratings = ODDSMATCHER_ROWS.map((r) => r.rating)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
    for (const row of ODDSMATCHER_ROWS) expect(row.lay).toBeGreaterThan(row.back)
  })

  it('the calculator example is what lib/calculators/punta-banca computes', () => {
    const { back, lay, ...shown } = CALCULATOR.example
    const stake = roundStake(layStake(back.stake, back.odds, lay.odds, lay.commissionPercent)!)
    const liab = liability(stake, lay.odds)!
    expect(shown.layStake).toBe(stake)
    expect(shown.liability).toBe(cents(liab))
    expect(shown.outcomes[0].profit).toBe(cents(minGain(back.stake, back.odds, liab)!))
    expect(shown.outcomes[1].profit).toBe(
      cents(-back.stake + stake * (1 - lay.commissionPercent / 100)),
    )
    expect(shown.commission).toBe(`${lay.commissionPercent} %`)
  })

  it('the nav points to the sections of the app, the account links to the auth routes', () => {
    for (const link of content.LANDING_NAV_LINKS) expect(link.href).toMatch(/^\/[a-z-]+$/)
    expect(content.LANDING_ROUTES.login).toBe('/login')
    expect(content.LANDING_ROUTES.register).toBe('/registrazione')
    expect(content.LANDING_FOOTER_LINKS.map((l) => l.label)).toEqual(
      expect.arrayContaining(['Prezzi', 'Contatti', 'Privacy', 'Termini', 'Cookie']),
    )
  })
})
