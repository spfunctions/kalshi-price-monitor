/**
 * Kalshi Price Monitor
 *
 * Polls the SimpleFunctions /api/public/changes endpoint and prints
 * markets that moved more than a configurable threshold.
 *
 * Usage:
 *   npx tsx monitor.ts                     # default: 5% threshold, 60s interval
 *   npx tsx monitor.ts --threshold 10      # alert on 10%+ moves
 *   npx tsx monitor.ts --interval 300      # check every 5 minutes
 *   npx tsx monitor.ts --topic "oil"       # filter to a topic
 */

const API = "https://simplefunctions.dev/api/public/changes";

interface Change {
  ticker: string;
  title: string;
  venue: string;
  previousPrice: number;
  currentPrice: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let threshold = 5;
  let interval = 60;
  let topic = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--threshold" && args[i + 1]) threshold = Number(args[++i]);
    if (args[i] === "--interval" && args[i + 1]) interval = Number(args[++i]);
    if (args[i] === "--topic" && args[i + 1]) topic = args[++i];
  }

  return { threshold, interval, topic };
}

function formatChange(c: Change): string {
  const arrow = c.changePercent > 0 ? "\u2191" : "\u2193";
  const sign = c.changePercent > 0 ? "+" : "";
  return [
    `${arrow} ${c.title}`,
    `  ${c.venue} | ${c.previousPrice}\u00a2 \u2192 ${c.currentPrice}\u00a2 (${sign}${c.changePercent.toFixed(1)}%)`,
    `  ticker: ${c.ticker} | vol: ${c.volume.toLocaleString()}`,
  ].join("\n");
}

async function poll(threshold: number, topic: string) {
  const params = new URLSearchParams({ hours: "1" });
  if (topic) params.set("topic", topic);

  const res = await fetch(`${API}?${params}`);
  if (!res.ok) {
    console.error(`API error: ${res.status}`);
    return;
  }

  const data = await res.json();
  const changes: Change[] = (data.changes ?? []).filter(
    (c: Change) => Math.abs(c.changePercent) >= threshold
  );

  if (changes.length === 0) {
    console.log(`[${new Date().toLocaleTimeString()}] No moves above ${threshold}% threshold`);
    return;
  }

  console.log(`\n[${new Date().toLocaleTimeString()}] ${changes.length} significant move(s):\n`);
  changes.forEach((c) => console.log(formatChange(c) + "\n"));
}

async function main() {
  const { threshold, interval, topic } = parseArgs();
  console.log(`Monitoring Kalshi prices | threshold: ${threshold}% | interval: ${interval}s${topic ? ` | topic: ${topic}` : ""}\n`);

  await poll(threshold, topic);
  setInterval(() => poll(threshold, topic), interval * 1000);
}

main();
