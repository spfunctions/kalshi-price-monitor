# kalshi-price-monitor

[![npm](https://img.shields.io/npm/v/kalshi-price-monitor)](https://www.npmjs.com/package/kalshi-price-monitor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Monitor **Kalshi** and **Polymarket** prediction-market prices in your terminal
and get real-time alerts on significant moves. Programmatic + CLI. Zero
dependencies.

```bash
npx kalshi-price-monitor watch KXFEDDECISION-25DEC --threshold 3
```

```
Watching KXFEDDECISION-25DEC | threshold: 3c | interval: 60s
+5c Will the Fed cut rates in December? (40c→45c, kalshi, 09:14:22)
-4c Will the Fed cut rates in December? (45c→41c, kalshi, 09:18:11)
```

---

## Install

```bash
npm install -g kalshi-price-monitor
# or run ad-hoc
npx kalshi-price-monitor <command>
```

Zero runtime dependencies.

## CLI

```bash
# Watch specific markets, alert on 3c+ moves, poll every 60s (default)
kalshi-price-monitor watch KXFEDDECISION-25DEC KXBTC-26DEC31 --threshold 3

# Watch all 24h movers from the global world snapshot
kalshi-price-monitor watch --interval 30

# One-shot list of current movers
kalshi-price-monitor movers

# Single market price + spread + volume
kalshi-price-monitor price KXFEDDECISION-25DEC
```

| Flag | Default | Description |
|------|---------|-------------|
| `--threshold N` | `5` | Alert on price moves of `N` cents or more |
| `--interval N`  | `60` | Poll the API every `N` seconds |

## Programmatic API

### `PriceMonitor` class

```ts
import { PriceMonitor } from 'kalshi-price-monitor'

const monitor = new PriceMonitor({
  tickers: ['KXFEDDECISION-25DEC'],  // omit to watch global movers instead
  threshold: 5,                       // alert on 5c+ moves
  interval: 60,                       // poll every 60s
})

monitor.on('alert', ({ ticker, title, oldPrice, newPrice, delta, venue, timestamp }) => {
  console.log(`${title}: ${oldPrice}c → ${newPrice}c (${delta > 0 ? '+' : ''}${delta}c)`)
})

monitor.on('error', (err) => console.error(err))

monitor.start()                    // begin polling
// ...
monitor.stop()                     // stop and clear the interval
```

### One-shot helpers

```ts
import { getPrice, getMovers } from 'kalshi-price-monitor'

const m = await getPrice('KXFEDDECISION-25DEC')
// { ticker, title, price, venue, spread, volume24h } or null if not found

const movers = await getMovers()
// MarketSnapshot[] from the 24h global world snapshot
```

Both helpers swallow errors and return `null` / `[]` so you can drop them
into render code without try/catch.

### Types

```ts
interface MarketSnapshot {
  ticker: string
  title: string
  price: number      // cents
  venue: 'kalshi' | 'polymarket' | string
  spread?: number
  volume24h?: number
}

interface PriceAlert {
  ticker: string
  title: string
  oldPrice: number
  newPrice: number
  delta: number      // newPrice - oldPrice (signed)
  venue: string
  timestamp: string  // ISO-8601
}

interface MonitorOptions {
  tickers?: string[]
  threshold?: number  // default 5 (cents)
  interval?: number   // default 60 (seconds)
  baseUrl?: string    // default https://simplefunctions.dev
}
```

## Bugfix vs older releases

Versions before this one had three broken endpoint references:

1. `getPrice()` and the `price` CLI command called
   `/api/public/market/{ticker}` (singular) → 404
2. `PriceMonitor.fetchPrices()` parsed the response as `data.results` —
   the actual field name is `data.markets`
3. The repo carried an orphan top-level `monitor.ts` that called the
   non-existent `/api/public/changes` endpoint

All three are fixed: every code path now uses `/api/public/markets?tickers=`
(verified live), reads the `markets` field, and the orphan file has been
deleted.

## Sister packages

| Need | Package |
|------|---------|
| Visualize the orderbook of a single market | [`kalshi-orderbook-viewer`](https://github.com/spfunctions/kalshi-orderbook-viewer) |
| Get aggregated edges across markets | [`prediction-market-edge-detector`](https://github.com/spfunctions/prediction-market-edge-detector) |
| Detect labeled regime state | [`prediction-market-regime`](https://github.com/spfunctions/prediction-market-regime) |
| MCP / Claude / Cursor | [`simplefunctions-cli`](https://github.com/spfunctions/simplefunctions-cli), [`prediction-market-mcp-example`](https://github.com/spfunctions/prediction-market-mcp-example) |

## Testing

```bash
npm test
```

13 tests, all `fetch`-mocked — no network required. Covers `getPrice`,
`getMovers`, `PriceMonitor.fetchPrices` (both modes), the alert-emission
threshold, and the constructor defaults.

## License

MIT — built by [SimpleFunctions](https://simplefunctions.dev).
