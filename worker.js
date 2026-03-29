/**
 * MEGAdescuentos Cron Worker
 * Runs as a Railway service, executes cron jobs on schedule.
 * No external dependencies — pure Node.js fetch + setInterval.
 */

const API_URL = process.env.API_URL || 'https://megadescuentos.okdescuentos.com/api';
const CRON_SECRET = process.env.CRON_SECRET || '';

if (!CRON_SECRET) {
  console.error('CRON_SECRET is required');
  process.exit(1);
}

async function run(name, endpoint) {
  const url = `${API_URL}/cron/${endpoint}${endpoint.includes('?') ? '&' : '?'}secret=${CRON_SECRET}`;
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    const data = await res.json();
    const ms = Date.now() - start;
    const summary = data.log ? data.log[data.log.length - 1] : JSON.stringify(data).substring(0, 100);
    console.log(`[${new Date().toISOString()}] ${name} (${ms}ms): ${summary}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ${name} FAILED: ${err.message}`);
  }
}

// ─── Schedule ───────────────────────────────────────────
// Each job has: name, endpoint, intervalMinutes

const jobs = [
  { name: 'Auto-publish Amazon',  endpoint: 'auto-publish-amazon?limit=5', interval: 60 },
  { name: 'Process comments',     endpoint: 'process-comments',            interval: 15 },
  { name: 'Price check (Keepa)',  endpoint: 'price-check',                 interval: 60 },
  { name: 'Enhance deals (AI)',   endpoint: 'enhance-deals?limit=10',      interval: 120 },
  { name: 'Ranking',              endpoint: 'ranking',                     interval: 120 },
  { name: 'Refresh Amazon data',  endpoint: 'refresh-amazon-data?limit=20', interval: 360 },
  { name: 'Expire deals',         endpoint: 'expire',                      interval: 720 },
  { name: 'Cleanup deals',        endpoint: 'cleanup-deals',               interval: 720 },
];

console.log('=== MEGAdescuentos Cron Worker ===');
console.log(`API: ${API_URL}`);
console.log(`Jobs: ${jobs.length}`);
console.log('');

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
console.log('Worker started. Press Ctrl+C to stop.\n');
