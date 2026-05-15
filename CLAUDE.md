# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install                        # Install dependencies
bun run dev                        # Dev server at http://localhost:5173 (watches src/ + index.html)
bun run build                      # Build to dist/ (bundle.js, bundle.css, simulation-worker.js)
bun run test                       # Build + run Playwright e2e tests
bun run test:ui                    # Build + run Playwright in UI mode
```

Run a single test file:
```bash
bunx playwright test tests/app.e2e.js
```

Data regeneration (requires external DuckDB at `../empresas/`):
```bash
python generate_network.py         # Outputs to output/network_vorcaro.csv
```

## Purpose

Vorcaros is an investigative visual platform for mapping corporate power networks. It lets journalists, researchers, and analysts explore how a group of individuals — here, members of the Vorcaro family — are connected through company ownership and partnerships under Brazilian corporate registry data (CNPJ/Receita Federal).

The core investigative questions it answers:
- Which companies does a target individual control or participate in?
- Who else sits on the same boards or shareholding structures?
- What economic sectors (CNAE) are those companies operating in?
- Are those companies active or inactive?

The graph is built by walking two degrees of separation from a set of seed CPFs: seed persons → their companies → all co-partners → their companies. This surfaces hidden connections that wouldn't be visible by looking at any single company in isolation.

Node types carry investigative meaning: people nodes (blue/purple) represent individuals; company nodes (green = ativa, red = baixada/inativa, orange = empresas of 2nd-degree partners). Edge labels show the legal role (sócio, administrador, etc.).

## Architecture

**Vorcaros** is a static single-page app. It has no backend or runtime database — all data is pre-generated CSV loaded in the browser.

### Build

`build.js` runs two parallel Bun builds:
1. `src/main.js` → `dist/bundle.[js|css]` (minified, tree-shaken, includes CSS)
2. `src/simulation-worker.js` → `dist/simulation-worker.js`

It then copies `output/` (the CSV data) and rewrites `index.html` paths for the bundles.

### Frontend modules

| File | Role |
|------|------|
| `src/main.js` | Entry point — wires UI to visualization |
| `src/viz.js` | `FastNetworkVisualization` class — all canvas rendering, zoom/pan, filtering, search, node selection |
| `src/ui.js` | Side panels: CNAE filter list (virtually scrolled), status filter, search bar |
| `src/simulation-worker.js` | Web Worker running d3-force; posts positions as `Float32Array` transferables to avoid main-thread blocking |
| `src/cnae-labels.js` | Static map of CNAE codes → human-readable descriptions |

### Rendering

Two overlaid `<canvas>` elements are used:
- `#links-canvas` — edges/links (redrawn less often)
- `#network-canvas` — nodes (redrawn every animation frame)

Viewport culling skips nodes and links outside the visible canvas area. The force simulation runs entirely in `simulation-worker.js` and posts `Float32Array` position arrays back to the main thread each tick.

### Data flow

1. `output/network_vorcaro.csv` is fetched at startup (source → target → relationship triplets)
2. Parsed in-browser to a node/link graph
3. Sent to the Web Worker for force layout
4. Rendered on canvas each tick

### URL deep-linking

`?n=NODENAME` selects and centers a specific node on load.

### Tests

Playwright e2e tests live in `tests/app.e2e.js`. The test runner starts its own HTTP server (`tests/server.js`) on port 5174. Config: `playwright.config.js`.

### Deployment

GitHub Actions (`.github/workflows/`) builds on push to `main` and deploys `dist/` to GitHub Pages.
