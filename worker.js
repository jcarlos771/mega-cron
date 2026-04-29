/**
 * MEGAdescuentos Cron Worker
 * Runs as a Railway service, executes cron jobs on schedule.
 * No external dependencies — pure Node.js fetch + setInterval.
 */

const API_URL =
  process.env.API_URL || "https://megadescuentos.okdescuentos.com/api";
const CRON_SECRET = process.env.CRON_SECRET || "";

if (!CRON_SECRET) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

async function run(name, endpoint) {
  // CRON_SECRET now travels as Bearer so it never lands in access logs or
  // Referer headers. Server still accepts ?secret= during rollout.
  const url = `${API_URL}/cron/${endpoint}`;
  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: AbortSignal.timeout(90000),
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    const ms = Date.now() - start;
    const summary = data.log
      ? data.log[data.log.length - 1]
      : JSON.stringify(data).substring(0, 100);
    console.log(`[${new Date().toISOString()}] ${name} (${ms}ms): ${summary}`);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] ${name} FAILED: ${err.message}`,
    );
  }
}

// ─── Schedule ───────────────────────────────────────────
// Each job has: name, endpoint, intervalMinutes

const jobs = [
  // Amazon — primary autopublish channel. Keepa data is reliable, so
  // we run aggressively (every 5 min) with a small per-run cap so the
  // site never floods.
  {
    name: "Auto-publish Amazon",
    endpoint: "auto-publish?source=amazon",
    interval: 5,
  },
  // ML autopublish removed: hard-blocked in /api/cron/auto-publish.
  // ML still enters via the inbox below (Oxylabs scrape) for manual
  // review by editors.
  {
    name: "Scrape Mercado Libre /ofertas (inbox only)",
    endpoint: "scrape-ml-portada?limit=20",
    interval: 60,
  },
  {
    name: "Auto-publish Raw Deals",
    endpoint: "auto-publish-raw-deals",
    interval: 60,
  },
  {
    name: "Revalidate ML and Community Deals",
    endpoint: "revalidate-deals",
    interval: 180,
  },
  {
    name: "Scrape Promodescuentos /nuevas",
    endpoint: "scrape-promodescuentos-portada",
    interval: 60,
  },
  { name: "Scrape Cazaofertas", endpoint: "scrape-cazaofertas", interval: 60 },
  { name: "Price check (Keepa)", endpoint: "price-check", interval: 60 },
  {
    name: "Process alert emails",
    endpoint: "process-alert-emails?limit=25",
    interval: 60,
  },
  { name: "Process comments", endpoint: "process-comments", interval: 60 },
  { name: "Ranking", endpoint: "ranking", interval: 120 },
  {
    name: "Refresh Amazon data",
    endpoint: "refresh-amazon-data?limit=30",
    interval: 360,
  },
  { name: "Expire deals", endpoint: "expire", interval: 1440 },
  { name: "Cleanup deals", endpoint: "cleanup-deals", interval: 1440 },
  // Trust System v2 — recalc trust_score + rank, expire old sandboxes.
  // Daily run; honours the trust.dryRun flag inside meganew-next.
  {
    name: "Trust recalc nightly",
    endpoint: "trust-recalc-nightly",
    interval: 1440,
  },
  // Defensive nightly resync of topic_deals. The sync hooks in deal
  // create/update + topic activate keep it fresh in the happy path,
  // but if any of those silently failed the join table can drift.
  {
    name: "Topics rematch nightly",
    endpoint: "topics-rematch",
    interval: 1440,
  },
];

console.log("=== MEGAdescuentos Cron Worker ===");
console.log(`API: ${API_URL}`);
console.log(`Jobs: ${jobs.length}`);
console.log("");

// Stagger start times so they don't all fire at once
jobs.forEach((job, i) => {
  const startDelay = i * 10000; // 10s between each job's first run
  const intervalMs = job.interval * 60 * 1000;

  setTimeout(() => {
    console.log(`[INIT] ${job.name}: every ${job.interval}min`);
    run(job.name, job.endpoint); // Run immediately
    setInterval(() => run(job.name, job.endpoint), intervalMs);
  }, startDelay);
});

// Keep process alive
setInterval(() => {}, 60000);
console.log("Worker started. Press Ctrl+C to stop.\n");
