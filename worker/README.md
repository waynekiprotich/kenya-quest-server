# Kenya Quest API (Cloudflare Worker)

TypeScript port of the FastAPI app in the parent directory (`../main.py`).
Same endpoints, same response shapes, same JSON seed data — no database, no
auth, nothing else changed. See [MIGRATION.md](../../MIGRATION.md) (project
root) for the full inventory and mapping notes.

The FastAPI app (`../main.py`) is left untouched as a fallback/reference
until this Worker is verified in production.

## Local development

```bash
cd server/worker
npm install
npm run dev
```

Serves on `http://localhost:8787` by default. Point the client at it either by
editing `client/vite.config.js`'s proxy target, or running the client with:

```bash
VITE_API_URL=http://localhost:8787/api npm run dev
```

## Deploy

```bash
cd server/worker
npx wrangler login   # once
npm run deploy
```

This publishes to `*.<your-subdomain>.workers.dev` by default, or a custom
route if configured in `wrangler.toml`.

## Before going to production

- Update `src/cors.ts`'s allowed origins (or wire an `ALLOWED_ORIGINS` var) to
  include the real Cloudflare Pages domain — today it only allows
  `localhost:5173` / `127.0.0.1:5173`, matching the original FastAPI config.
- Update the client's `VITE_API_URL` to the deployed Worker URL.

## Environment variables / secrets

None required. The current app has no database, no auth, and no external
services — there is nothing to put in `wrangler secret put`. Add entries to
`Env` in `src/types.ts` and `wrangler.toml` if that changes.
