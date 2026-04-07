import { describe, it, expect, afterEach, vi } from 'vitest'
import { PriceMonitor, getPrice, getMovers } from '../src/index.js'

const MARKET = {
  ticker: 'KXFEDDECISION-25DEC',
  title: 'Will the Fed cut rates in December?',
  venue: 'kalshi',
  price: 42,
  spread: 2,
  volume24h: 18200,
}

const WORLD_FIXTURE = {
  index: { uncertainty: 22, geopolitical: 0, momentum: 0, activity: 99 },
  regimeSummary: 'Neutral',
  movers: [{ ticker: 'KX-A', title: 'Mover A', price: 50, venue: 'kalshi', delta: 5, volume24h: 1000 }],
  actionableEdges: [{ ticker: 'KX-B', title: 'Edge B', marketPrice: 30, venue: 'polymarket' }],
  generatedAt: '2026-04-07T07:00:00Z',
}

function mockJsonOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function lastUrl(spy: ReturnType<typeof vi.spyOn>): string {
  const arg = spy.mock.calls[0][0]
  return typeof arg === 'string' ? arg : (arg as URL).toString()
}

afterEach(() => vi.restoreAllMocks())

// ── getPrice (fixed: uses plural endpoint) ───────────────

describe('getPrice', () => {
  it('routes through /api/public/markets?tickers=', async () => {
    const spy = mockJsonOnce({ markets: [MARKET] })
    const p = await getPrice('KXFEDDECISION-25DEC')
    expect(lastUrl(spy)).toContain('/api/public/markets')
    expect(lastUrl(spy)).toContain('tickers=KXFEDDECISION-25DEC')
    expect(p?.title).toContain('Fed')
    expect(p?.price).toBe(42)
  })

  it('returns null when API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('boom', { status: 500 }))
    expect(await getPrice('KX')).toBeNull()
  })

  it('returns null when ticker not found', async () => {
    mockJsonOnce({ markets: [] })
    expect(await getPrice('NOPE')).toBeNull()
  })

  it('returns null on network throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))
    expect(await getPrice('KX')).toBeNull()
  })
})

// ── getMovers ─────────────────────────────────────────────

describe('getMovers', () => {
  it('hits /api/agent/world?format=json', async () => {
    const spy = mockJsonOnce(WORLD_FIXTURE)
    const movers = await getMovers()
    expect(lastUrl(spy)).toContain('/api/agent/world?format=json')
    expect(movers).toHaveLength(1)
    expect(movers[0].title).toBe('Mover A')
  })

  it('returns [] on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('boom', { status: 500 }))
    expect(await getMovers()).toEqual([])
  })

  it('returns [] on network throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))
    expect(await getMovers()).toEqual([])
  })
})

// ── PriceMonitor.fetchPrices ─────────────────────────────

describe('PriceMonitor.fetchPrices', () => {
  it('hits /api/public/markets?tickers= when tickers configured', async () => {
    const spy = mockJsonOnce({ markets: [MARKET] })
    const monitor = new PriceMonitor({ tickers: ['KXFEDDECISION-25DEC'] })
    const snaps = await monitor.fetchPrices()
    expect(lastUrl(spy)).toContain('tickers=KXFEDDECISION-25DEC')
    expect(snaps).toHaveLength(1)
    expect(snaps[0].price).toBe(42)
  })

  it('falls back to world movers when no tickers configured', async () => {
    const spy = mockJsonOnce(WORLD_FIXTURE)
    const monitor = new PriceMonitor()
    const snaps = await monitor.fetchPrices()
    expect(lastUrl(spy)).toContain('/api/agent/world')
    // Includes both movers and actionableEdges
    expect(snaps).toHaveLength(2)
  })

  it('reads from .markets, not .results', async () => {
    // The previous implementation read from data.results which never existed.
    // Make sure data.results is ignored entirely.
    mockJsonOnce({ results: [MARKET], markets: [] })
    const monitor = new PriceMonitor({ tickers: ['KX'] })
    expect(await monitor.fetchPrices()).toEqual([])
  })
})

// ── PriceMonitor alerting ────────────────────────────────

describe('PriceMonitor alerts', () => {
  it('emits an alert when delta exceeds threshold', async () => {
    const monitor = new PriceMonitor({ tickers: ['KX'], threshold: 5 })
    const alerts: any[] = []
    monitor.on('alert', (a) => alerts.push(a))

    mockJsonOnce({ markets: [{ ...MARKET, price: 40 }] })
    await monitor.poll()
    mockJsonOnce({ markets: [{ ...MARKET, price: 48 }] })
    await monitor.poll()

    expect(alerts).toHaveLength(1)
    expect(alerts[0].oldPrice).toBe(40)
    expect(alerts[0].newPrice).toBe(48)
    expect(alerts[0].delta).toBe(8)
  })

  it('does not emit when delta below threshold', async () => {
    const monitor = new PriceMonitor({ tickers: ['KX'], threshold: 10 })
    const alerts: any[] = []
    monitor.on('alert', (a) => alerts.push(a))

    mockJsonOnce({ markets: [{ ...MARKET, price: 40 }] })
    await monitor.poll()
    mockJsonOnce({ markets: [{ ...MARKET, price: 45 }] })
    await monitor.poll()

    expect(alerts).toEqual([])
  })
})

// ── Constructor defaults ─────────────────────────────────

describe('PriceMonitor constructor', () => {
  it('uses default threshold and interval', () => {
    const m = new PriceMonitor()
    expect(m).toBeInstanceOf(PriceMonitor)
  })
})
