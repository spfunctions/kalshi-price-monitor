import { describe, it, expect } from 'vitest'
import { PriceMonitor, getPrice, getMovers } from '../src/index.js'

describe('PriceMonitor', () => {
  it('creates instance with defaults', () => {
    const m = new PriceMonitor()
    expect(m).toBeInstanceOf(PriceMonitor)
  })

  it('fetches live movers', async () => {
    const movers = await getMovers()
    expect(Array.isArray(movers)).toBe(true)
  }, 15000)
})
