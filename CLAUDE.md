# Wine Cellar

Static site on GitHub Pages (served from `main`), with Supabase for login and data, and a Vercel proxy (`AI_PROXY_URL`) for AI label reading. No build step: plain ES modules.

## Layout
- `index.html`: page markup only. Buttons use `data-tab="name"` or `data-action="name"`, never `onclick`.
- `css/styles.css`: all shared styles.
- `js/config.js`: keys, URLs, and the `FEATURES` on/off switches.
- `js/app.js`: loads each feature with its own `import()` inside try/catch, so a broken feature only breaks its own tab.
- `js/core/`: shared pieces. `state.js` (data + events), `data.js` (all Supabase reads/writes for your own collection), `auth.js`, `ui.js` (tabs, actions, error boxes), `utils.js` (`escapeHtml`, normalization), `wine-names.js` (region spellings).
- `js/features/`: one file per feature. Each exports `init({ on })`.

## UI
iPhone-first. Bottom tab bar: Wines (`inventory.js`), Cellar (`cellar.js`, the visual fridge/shelf view), Add (`add-wine.js` + `label-scanner.js`), History (`consumed.js`), More (stats in `dashboard.js`, plus sub-pages: Locations and Clean up in `locations.js`, Friends in `friends.js`).
- Pop-ups use the shared bottom sheet: `openSheet(title, html)` / `closeSheet()` in `ui.js`. Messages use `toast()`, not `alert()`.
- Colors and sizes are CSS variables at the top of `css/styles.css`. Inputs stay at 16px or larger (iPhone zooms in on smaller ones).
- Parent locations are fridges/areas; child locations are shelves, drawn top to bottom in creation (id) order.

## Rules for changes
- Features must not import other features. They talk through `state` and events (`data:changed`, `tab:shown`, `subpage:shown`, `wine:edit`, `wine:show`, `cellar:highlight`, `auth:signed-in`, `auth:signed-out`).
- New feature: add `js/features/x.js`, add it to `FEATURES` in config.js and to `FEATURE_TABS` in app.js.
- Any user or friend text put into HTML goes through `escapeHtml()`.
- Register click handlers with `registerActions({...})` and use `data-action` + `data-id` attributes.
- Database writes go through `js/core/data.js` and must check `error` before changing anything else.

## Testing locally
`powershell -ExecutionPolicy Bypass -File tools\serve.ps1`, then open http://localhost:8080. It uses the real Supabase database, so changes made while testing are real.
