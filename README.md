# kalshi-price-monitor

Monitor Kalshi and Polymarket prediction market prices in your terminal. Real-time alerts on significant moves.

[![npm](https://img.shields.io/npm/v/kalshi-price-monitor)](https://www.npmjs.com/package/kalshi-price-monitor)

## Install

```bash
npm install -g kalshi-price-monitor
```

## CLI

```bash
# Watch specific markets (alert on 5c+ moves, check every 60s)
npx kalshi-price-monitor watch KXFEDDECISION KXINX --threshold 3

# Watch all movers from world state
npx kalshi-price-monitor watch --interval 30

# Show current movers
npx kalshi-price-monitor movers

# Check single market price + orderbook
npx kalshi-price-monitor price KXFEDDECISION
```

## Programmatic

```ts
import { PriceMonitor } from 'kalshi-price-monitor'

const monitor = new PriceMonitor({
  tickers: ['KXFEDDECISION'],
  threshold: 5,   // alert on 5c+ moves
  interval: 60,   // check every 60s
})

monitor.on('alert', ({ ticker, title, oldPrice, newPrice, delta }) => {
  console.log(`${title}: ${oldPrice}c -> ${newPrice}c (${delta > 0 ? '+' : ''}${delta}c)`)
})

monitor.start()
```

## API

```ts
import { getPrice, getMovers } from 'kalshi-price-monitor'

const price = await getPrice('KXFEDDECISION')
const movers = await getMovers()
```

## License

MIT — [SimpleFunctions](https://simplefunctions.dev)
