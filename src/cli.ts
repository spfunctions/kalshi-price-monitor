#!/usr/bin/env node
import { PriceMonitor } from './monitor.js'

const R = '\x1b[0m', RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', CYN = '\x1b[36m', BLD = '\x1b[1m', DIM = '\x1b[2m'

const HELP = `${BLD}kalshi-price-monitor${R} — prediction market price alerts

${BLD}Usage:${R}
  kalshi-price-monitor watch [TICKER...] [--threshold N] [--interval N]
  kalshi-price-monitor movers
  kalshi-price-monitor price <TICKER>

${BLD}Options:${R}
  --threshold N   Alert on moves >= N cents (default: 5)
  --interval N    Poll every N seconds (default: 60)

${BLD}Examples:${R}
  npx kalshi-price-monitor watch KXFEDDECISION --threshold 3
  npx kalshi-price-monitor movers
  npx kalshi-price-monitor price KXFEDDECISION

Powered by SimpleFunctions — https://simplefunctions.dev`

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help')) { console.log(HELP); return }

  const cmd = args[0]

  if (cmd === 'price') {
    const ticker = args[1]
    if (!ticker) { console.error('Usage: kalshi-price-monitor price <TICKER>'); process.exit(1) }
    const res = await fetch(`https://simplefunctions.dev/api/public/market/${encodeURIComponent(ticker)}?depth=true`)
    if (!res.ok) { console.error(`Error: ${res.status}`); process.exit(1) }
    const m = await res.json()
    console.log(`${BLD}${m.title}${R}`)
    console.log(`  ${m.venue} | ${m.status} | ${BLD}${m.price}c${R}`)
    if (m.bestBid != null) console.log(`  Bid: ${GRN}${m.bestBid}c${R}  Ask: ${RED}${m.bestAsk}c${R}  Spread: ${m.spread}c`)
    if (m.volume) console.log(`  Vol: ${m.volume.toLocaleString()} | 24h: ${(m.volume24h||0).toLocaleString()}`)
    return
  }

  if (cmd === 'movers') {
    const res = await fetch('https://simplefunctions.dev/api/agent/world?format=json')
    const data = await res.json()
    console.log(`${BLD}Market Movers${R} (${DIM}last 24h${R})\n`)
    for (const m of (data.movers || [])) {
      const color = m.delta > 0 ? GRN : m.delta < 0 ? RED : DIM
      const sign = m.delta > 0 ? '+' : ''
      console.log(`  ${color}${sign}${m.delta}c${R}  ${m.title} ${DIM}(${m.price}c, ${m.venue})${R}`)
    }
    return
  }

  if (cmd === 'watch') {
    const tickers = args.slice(1).filter(a => !a.startsWith('--'))
    const thIdx = args.indexOf('--threshold')
    const intIdx = args.indexOf('--interval')
    const threshold = thIdx >= 0 ? parseInt(args[thIdx + 1]) : 5
    const interval = intIdx >= 0 ? parseInt(args[intIdx + 1]) : 60

    const monitor = new PriceMonitor({ tickers: tickers.length > 0 ? tickers : undefined, threshold, interval })
    monitor.on('started', (info) => {
      console.log(`${CYN}Watching${R} ${info.tickers.length > 0 ? info.tickers.join(', ') : 'all movers'} | threshold: ${info.threshold}c | interval: ${info.interval}s`)
      console.log(`${DIM}Press Ctrl+C to stop${R}\n`)
    })
    monitor.on('alert', (a) => {
      const color = a.delta > 0 ? GRN : RED
      const sign = a.delta > 0 ? '+' : ''
      const time = new Date(a.timestamp).toLocaleTimeString()
      console.log(`${BLD}${color}${sign}${a.delta}c${R} ${a.title} ${DIM}(${a.oldPrice}c→${a.newPrice}c, ${a.venue}, ${time})${R}`)
    })
    monitor.on('error', (err) => console.error(`${RED}Error: ${err.message}${R}`))
    process.on('SIGINT', () => { monitor.stop(); process.exit(0) })
    await monitor.start()
    return
  }

  console.log(HELP)
}
main()
