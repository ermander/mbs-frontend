import { describe, expect, it } from 'vitest'
import * as content from './landing-content'
import { allBookmakerLogoSrcs } from './bookmakers'

const { CALCULATOR_EXAMPLE, ...copy } = content
const copyText = JSON.stringify(copy)

describe('landing copy (OddWise)', () => {
  it('never says "bookmaker": the word is "sito/siti di scommesse"', () => {
    expect(copyText).not.toMatch(/bookmaker/i)
    expect(JSON.stringify(CALCULATOR_EXAMPLE)).not.toMatch(/bookmaker/i)
  })

  it('names betting sites only in the calculator example of the hero', () => {
    const sites =
      /snai|betfair|bet365|sisal|goldbet|eurobet|lottomatica|planetwin|bwin|william ?hill|betsson|leovegas|888/i
    expect(copyText).not.toMatch(sites)
    expect(CALCULATOR_EXAMPLE.back.site).toBe('Snai')
    expect(CALCULATOR_EXAMPLE.lay.site).toBe('Betfair')
  })

  it('the "35 siti di scommesse" of the copy are the 35 logos of the carousel', () => {
    expect(allBookmakerLogoSrcs()).toHaveLength(35)
    expect(content.BETTING_SITES.title).toContain('35 siti di scommesse')
    expect(content.TOOLS.items[0].text).toContain('35 siti di scommesse')
  })

  it('has the sections of the mockup with their counts', () => {
    expect(content.TOOLS.items).toHaveLength(7)
    expect(content.MATCHED_BETTING_PLANS.plans.map((p) => p.name)).toEqual([
      'Free',
      'Base',
      'Premium',
    ])
    expect(content.SUREBET_PLANS.plans.map((p) => p.name)).toEqual([
      'Surebet Free',
      'Surebet Base',
      'Surebet Premium',
    ])
    expect(content.FAQ.items).toHaveLength(8)
    expect(content.PROMO.steps).toHaveLength(3)
    expect(content.HOW_IT_WORKS.steps).toHaveLength(3)
    expect(content.WHY_IT_WORKS.items).toHaveLength(3)
    expect(content.EARNINGS.items).toHaveLength(3)
  })

  it('only the Premium plans are highlighted and carry a badge', () => {
    for (const group of [content.MATCHED_BETTING_PLANS.plans, content.SUREBET_PLANS.plans]) {
      const highlighted = group.filter((p) => p.highlighted)
      expect(highlighted).toHaveLength(1)
      expect(highlighted[0].name).toMatch(/Premium$/)
      expect(group.filter((p) => p.badge !== '')).toEqual(highlighted)
    }
  })

  it('the anchors of the nav point to sections of the page, the account links to the auth routes', () => {
    for (const link of content.LANDING_NAV_LINKS) expect(link.href).toMatch(/^#[a-z-]+$/)
    expect(content.LANDING_ROUTES.login).toBe('/login')
    expect(content.LANDING_ROUTES.register).toBe('/registrazione')
  })
})
