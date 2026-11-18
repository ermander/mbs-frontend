import { describe, expect, it } from 'vitest'
import { holdPublicPage, isPublicPageMounted } from './public-page'

describe('public page counter', () => {
  it('is on while at least one public page is mounted, and a release counts once', () => {
    expect(isPublicPageMounted()).toBe(false)
    const first = holdPublicPage()
    const second = holdPublicPage()
    expect(isPublicPageMounted()).toBe(true)
    first()
    first()
    expect(isPublicPageMounted()).toBe(true)
    second()
    expect(isPublicPageMounted()).toBe(false)
  })
})
