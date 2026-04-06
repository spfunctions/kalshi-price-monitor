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
      const res = await fetch(`${this.base}/api/public/markets?tickers=${this.tickers.join(',')}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return (data.results || []).map((m: any) => ({
        ticker: m.ticker, title: m.title, price: m.price,
        venue: m.venue, spread: m.spread, volume24h: m.volume24h,
      }))
    }
    const res = await fetch(`${this.base}/api/agent/world?format=json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return [...(data.movers || []), ...(data.actionableEdges || [])].map((m: any) => ({
      ticker: m.ticker, title: m.title, price: m.price || m.marketPrice,
      venue: m.venue || 'unknown', spread: m.spread, volume24h: m.volume24h,
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
