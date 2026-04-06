export interface PriceAlert {
  ticker: string
  title: string
  oldPrice: number
  newPrice: number
  delta: number
  venue: string
  timestamp: string
}

export interface MonitorOptions {
  tickers?: string[]
  threshold?: number
  interval?: number
  baseUrl?: string
}

export interface MarketSnapshot {
  ticker: string
  title: string
  price: number
  venue: string
  spread?: number
  volume24h?: number
}
