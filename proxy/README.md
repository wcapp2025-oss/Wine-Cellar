# Wine AI proxy

Small server on Vercel (project `wine-ai-proxy`) that holds the Anthropic API key so the app never exposes it.

- `api/analyze-wine.js`: reads a label photo (used by Scan label).
- `api/wine-advice.js`: food pairing and drinking-window advice (used by the Tonight tab and "Ask AI"). Only answers requests that carry a valid app sign-in.

Environment variable on Vercel: `ANTHROPIC_API_KEY`.

## Deploy
From this `proxy` folder: `npx vercel deploy --prod` (needs Node.js and `npx vercel login` once; the folder is already linked to the project).
No `vercel.json`: Vercel finds the `api/` functions automatically. The old legacy `builds`/`routes` config made extensionless URLs like `/api/analyze-wine` return 404.
GitHub Pages does not serve this folder; it only matters to Vercel.
