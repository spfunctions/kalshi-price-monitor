import { EventEmitter } from 'events'
import type { PriceAlert, MonitorOptions, MarketSnapshot } from './types.js'

const DEFAULT_BASE = 'https://simplefunctions.dev'

export class PriceMonitor extends EventEmitter {
  private tickers: string[]
  private threshold: number
  private interval: number
  private base: string
  private prices: Map<string, MarketSnapshot> = new Map()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(opts: MonitorOptions = {}) {
    super()
    this.tickers = opts.tickers || []
    this.threshold = opts.threshold || 5
    this.interval = (opts.interval || 60) * 1000
    this.base = (opts.baseUrl || DEFAULT_BASE).replace(/\/$/, '')
  }

  async fetchPrices(): Promise<MarketSnapshot[]> {
    if (this.tickers.length > 0) {
      const url = new URL('/api/public/markets', this.base)
      url.searchParams.set('tickers', this.tickers.join(','))
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { markets?: Array<Record<string, unknown>> }
      return (data.markets ?? []).map((m) => ({
        ticker: String(m.ticker ?? ''),
        title: String(m.title ?? ''),
        price: Number(m.price ?? 0),
        venue: String(m.venue ?? 'unknown'),
        spread: m.spread as number | undefined,
        volume24h: m.volume24h as number | undefined,
      }))
    }
    const res = await fetch(`${this.base}/api/agent/world?format=json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      movers?: Array<Record<string, unknown>>
      actionableEdges?: Array<Record<string, unknown>>
    }
    return [...(data.movers ?? []), ...(data.actionableEdges ?? [])].map((m) => ({
      ticker: String(m.ticker ?? ''),
      title: String(m.title ?? ''),
      price: Number(m.price ?? m.marketPrice ?? 0),
      venue: String(m.venue ?? 'unknown'),
      spread: m.spread as number | undefined,
      volume24h: m.volume24h as number | undefined,
    }))
  }

  private check(snapshots: MarketSnapshot[]) {
    for (const s of snapshots) {
      const prev = this.prices.get(s.ticker)
      if (prev && Math.abs(s.price - prev.price) >= this.threshold) {
        const alert: PriceAlert = {
          ticker: s.ticker, title: s.title,
          oldPrice: prev.price, newPrice: s.price,
          delta: s.price - prev.price, venue: s.venue,
          timestamp: new Date().toISOString(),
        }
        this.emit('alert', alert)
      }
      this.prices.set(s.ticker, s)
    }
  }

  async poll() {
    try {
      const snapshots = await this.fetchPrices()
      this.check(snapshots)
    } catch (err) {
      this.emit('error', err)
    }
  }

  async start() {
    await this.poll()
    this.timer = setInterval(() => this.poll(), this.interval)
    this.emit('started', { tickers: this.tickers, threshold: this.threshold, interval: this.interval / 1000 })
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.emit('stopped')
  }

  getSnapshot(ticker: string): MarketSnapshot | undefined {
    return this.prices.get(ticker)
  }

  getAllSnapshots(): MarketSnapshot[] {
    return Array.from(this.prices.values())
  }
}
