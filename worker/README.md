# Kenya Quest API

Primary TypeScript API on Cloudflare Workers. Run `npm ci`, then `npm run dev` (port 8787). The root workspace's `npm run dev` also starts the client.

- `npm test`: build/typecheck and API regression tests.
- `npm run build`: validate TypeScript and bundle the API.
- `npm run deploy:check`: test and prepare deployment without publishing.
- `npm run deploy`: test and publish to the configured Cloudflare account.

Canonical data lives in `../data/`. Imports are bundled by Wrangler. Invalid IDs, coordinates or broken relationships prevent startup. Both this Worker and the optional FastAPI app use that data.

The client Worker connects through an `API` service binding, so its browser requests use the same origin. Optional `ALLOWED_ORIGINS` (a comma-separated variable) permits additional direct browser consumers. Localhost on port 5173 is allowed by default.

See the workspace README for endpoint details and deployment order. No secrets or database are required.
