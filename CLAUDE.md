# mega-cron

Railway cron worker for MEGAdescuentos. Pure Node.js `fetch` + `setInterval`,
no external deps. Fires HTTP calls to the `/api/cron/*` endpoints in
`meganew-next` on a fixed schedule. This repo should stay deliberately small.

- Hosting: Railway (auto-deploys on push to `main`)
- Entry: `worker.js` (single file)

## Read First

1. `worker.js` — the entire worker is ~70 lines
2. `git status --short`

## Canonical Commands

```bash
node worker.js       # run locally with API_URL + CRON_SECRET env vars
```

## Operating Rules

- All jobs live in the `jobs` array in `worker.js`. One row per job:
  `{ name, endpoint, interval }`.
- `interval` is in minutes.
- Endpoints are resolved as `${API_URL}/cron/${endpoint}?secret=${CRON_SECRET}`.
  The actual implementations live in `meganew-next/src/app/api/cron/*`.
- Keep each job idempotent and under ~90s (the fetch has a 90s timeout).
- Startup is staggered 10s between jobs so they don't fire simultaneously.
- Do NOT add dependencies. The value of this repo is that it has zero deps
  and zero build step.

## Required Env Vars

- `API_URL` → usually `https://megadescuentos.okdescuentos.com/api`
- `CRON_SECRET` → must match the secret accepted by meganew-next cron routes

## Current Schedule

Keep this section in sync with `worker.js` when adding jobs.

| Job                               | Endpoint                         | Interval |
| --------------------------------- | -------------------------------- | -------- |
| Auto-publish Amazon               | `auto-publish?source=amazon`     | 180 min  |
| Auto-publish Raw Deals            | `auto-publish-raw-deals`         | 120 min  |
| Revalidate ML and Community Deals | `revalidate-deals`               | 180 min  |
| Scrape Promodescuentos /nuevas    | `scrape-promodescuentos-portada` | 30 min   |
| Scrape Cazaofertas                | `scrape-cazaofertas`             | 60 min   |
| Price check (Keepa)               | `price-check`                    | 60 min   |
| Process alert emails              | `process-alert-emails?limit=25`  | 60 min   |
| Process comments                  | `process-comments`               | 60 min   |
| Ranking                           | `ranking`                        | 120 min  |
| Refresh Amazon data               | `refresh-amazon-data?limit=30`   | 360 min  |
| Expire deals                      | `expire`                         | 1440 min |
| Cleanup deals                     | `cleanup-deals`                  | 1440 min |

## Related Repos

- API (endpoint implementations): `~/Desktop/MEGAdescuentos2026/meganew-next` →
  `jcarlos771/meganew-next`
