# kalshi-price-monitor

Simple terminal monitor that watches Kalshi prediction market prices and alerts when markets move significantly.

## Usage

```bash
npx tsx monitor.ts
```

### Options

```bash
npx tsx monitor.ts --threshold 10      # alert on 10%+ moves (default: 5%)
npx tsx monitor.ts --interval 300      # check every 5 minutes (default: 60s)
npx tsx monitor.ts --topic "oil"       # filter to a specific topic
```

### Example output

```
Monitoring Kalshi prices | threshold: 5% | interval: 60s

[2:15:30 PM] 2 significant move(s):

 Will oil exceed $100 by Dec 2026?
  kalshi | 35c -> 42c (+20.0%)
  ticker: KXWTIMAX-26DEC31-T100 | vol: 12,450

 Fed rate cut by June?
  kalshi | 62c -> 55c (-11.3%)
  ticker: KXFEDCUT-26JUN | vol: 8,200
```

## How it works

Polls the [SimpleFunctions](https://simplefunctions.dev) `/api/public/changes` endpoint at a configurable interval and filters for moves above the threshold. No API key required.

## License

MIT

---

**Part of [SimpleFunctions](https://simplefunctions.dev)** — context flow for prediction markets.

- [Awesome Prediction Markets](https://github.com/spfunctions/awesome-prediction-markets) — curated list for developers
- [CLI](https://github.com/spfunctions/simplefunctions-cli) — 42 commands for prediction market intelligence
- [MCP Server](https://simplefunctions.dev/api/mcp/mcp) — connect any LLM to prediction markets
- [REST API](https://simplefunctions.dev/docs) — structured market data for your app
