export { PriceMonitor } from './monitor.js'
export type { PriceAlert, MonitorOptions, MarketSnapshot } from './types.js'

import { PriceMonitor } from './monitor.js'
import type { MarketSnapshot } from './types.js'

export async function getPrice(ticker: string): Promise<MarketSnapshot | null> {
  const res = await fetch(`https://simplefunctions.dev/api/public/market/${encodeURIComponent(ticker)}`)
  if (!res.ok) return null
  const m = await res.json()
  return { ticker: m.ticker, title: m.title, price: m.price, venue: m.venue, spread: m.spread, volume24h: m.volume24h }
}

export async function getMovers(): Promise<MarketSnapshot[]> {
  const res = await fetch('https://simplefunctions.dev/api/agent/world?format=json')
  if (!res.ok) return []
  const data = await res.json()
  return (data.movers || []).map((m: any) => ({
    ticker: m.ticker, title: m.title, price: m.price, venue: m.venue, volume24h: m.volume24h,
  }))
}
