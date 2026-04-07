export { PriceMonitor } from './monitor.js'
export type { PriceAlert, MonitorOptions, MarketSnapshot } from './types.js'

import type { MarketSnapshot } from './types.js'

const BASE = 'https://simplefunctions.dev'

/**
 * Look up the current price + metadata for a single market by ticker.
 *
 * Routes through /api/public/markets?tickers= (the singular
 * /api/public/market/{ticker} endpoint does not exist on the live API).
 * Returns null if the API errors or the ticker is not found, so callers
 * can branch without try/catch.
 */
export async function getPrice(ticker: string): Promise<MarketSnapshot | null> {
  const url = new URL('/api/public/markets', BASE)
  url.searchParams.set('tickers', ticker)
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = (await res.json()) as { markets?: Array<Record<string, unknown>> }
    const m = data?.markets?.[0]
    if (!m) return null
    return {
      ticker: String(m.ticker ?? ticker),
      title: String(m.title ?? ''),
      price: Number(m.price ?? 0),
      venue: String(m.venue ?? ''),
      spread: m.spread as number | undefined,
      volume24h: m.volume24h as number | undefined,
    }
  } catch {
    return null
  }
}

/**
 * Get the current 24h price movers from the global world snapshot.
 * Returns [] on any error so callers can render "no data" without try/catch.
 */
export async function getMovers(): Promise<MarketSnapshot[]> {
  try {
    const res = await fetch(`${BASE}/api/agent/world?format=json`)
    if (!res.ok) return []
    const data = (await res.json()) as { movers?: Array<Record<string, unknown>> }
    return (data.movers ?? []).map((m) => ({
      ticker: String(m.ticker ?? ''),
      title: String(m.title ?? ''),
      price: Number(m.price ?? 0),
      venue: String(m.venue ?? 'unknown'),
      volume24h: m.volume24h as number | undefined,
    }))
  } catch {
    return []
  }
}
