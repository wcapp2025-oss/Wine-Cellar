# Wine AI proxy

Small server on Vercel (project `wine-ai-proxy`) that holds the Anthropic API key so the app never exposes it.

- `api/analyze-wine.js`: reads a label photo (used by Scan label).
- `api/wine-advice.js`: food pairing and drinking-window advice (used by the Tonight tab and "Ask AI"). Only answers requests that carry a valid app sign-in.

Environment variable on Vercel: `ANTHROPIC_API_KEY`.

## Deploy
From this `proxy` folder: `npx vercel --prod` (needs Node.js and `npx vercel login` once).
GitHub Pages does not serve this folder; it only matters to Vercel.
