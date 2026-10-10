# IMPACT ATLAS 2.0

Offline-first asteroid impact explorer and nuclear **energy comparison** tool. React, TypeScript, Vite, D3 geographic rendering, Natural Earth. Independent implementation; no NUKEMAP or Neal.fun code or assets.

**Scope:** this is an educational approximation, not a hazard forecast. The nuclear tab intentionally compares energies only; it does not model nuclear weapon damage, burst height, fallout, thermal or blast contours. Asteroid atmospheric entry and many secondary effects are not quantitatively modeled. See `SCIENCE.md` and `TEST_REPORT.md`.

## Open immediately

Unzip the delivery and open **START.html** in a modern browser. It bundles React, the map, geography, styles and calculations in one file, without network dependencies. No installation required. Browser file-origin storage and clipboard policies differ; if bookmarks do not persist, use the hosted version or export JSON. Scenario URLs require hosting.

The `dist/` directory is the prebuilt website. Serve it over HTTP rather than double-clicking its modular `index.html`.

## Run and develop

Install Node.js 22.12 or newer (Node 22 LTS recommended), then in the project folder:

```sh
npm ci
npm run dev
```

Open http://localhost:4173. Stop with Ctrl+C.

```sh
npm test                # Mathematical/geographic tests + jsdom interaction tests
npm run build           # TypeScript check, production site, START.html, offline cache
npm run preview         # Preview production at http://localhost:4173
```

To run browser tests, stop any other process on port 4173 first:

```sh
npx playwright install chromium
npm run test:browser
```

On Linux, use `npx playwright install --with-deps chromium` if OS browser libraries are missing. Tests launch their own production server and test a `/impact-atlas/` repository path at desktop and mobile sizes. Browser tests were supplied but could not be executed in the delivery environment; see `TEST_REPORT.md`.

## Deploy to GitHub Pages

No GitHub repository or public deployment was created in this session. The supplied workflow builds, tests and deploys your own copy.

1. Create a GitHub repository named **impact-atlas** (public works with free GitHub Pages). Start with an empty repository.
2. Extract this ZIP. Upload or commit the **contents** of the `impact-atlas` folder to the repository root. Include the hidden `.github/workflows/deploy.yml` file and `package-lock.json`; exclude `node_modules`. If uploading through the website, ensure the hidden workflow folder is included.
3. In the repository, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push to `main`, or select **Actions → Test and deploy IMPACT ATLAS → Run workflow**. The browser-test gate must pass before deployment.
5. Wait for the workflow to finish. Its deployment step and Settings → Pages display the actual published URL, typically `https://YOUR-USERNAME.github.io/impact-atlas/`. Verify that URL yourself; it is an example here, not a live deployment claim.

Optional Git commands, from the extracted project directory:

```sh
git init
git add .
git commit -m "Build IMPACT ATLAS 2.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/impact-atlas.git
git push -u origin main
```

If a workflow test fails, inspect the Actions logs and downloadable `browser-test-results` trace rather than bypassing the test gate.

### Repository paths and domains

Vite uses `base: './'`, so assets are relative and work at a repository subpath or a domain root. There is no server-side router. Scenario state uses a URL fragment and requires no rewrite rules.

For a custom domain, add the domain in GitHub Pages settings, follow GitHub's displayed DNS instructions, and put the domain alone in `public/CNAME` before the next build. Do not put `https://` or a path in CNAME. Enable HTTPS after GitHub provisions its certificate.

## Features and controls

- Offline country borders/coastlines, 44-city index, coordinate search and search history.
- Pan/zoom, draggable source, latitude/longitude inputs, great-circle distance ruler, fit and world view.
- Spherical contours that clip correctly at the antimeridian; full latitude range, including polar geometry.
- Asteroid diameter 1 m–1,000 km, velocity, angle, density, composition, land/ocean target and density.
- Mass, kinetic energy and TNT equivalence; conditional land crater scaling within explicitly limited domains.
- Five historical-event analogues, an Atlantic example and a hypothetical planet-scale preset. Input estimates are illustrative, not historical reconstructions.
- Uniform-depth wave travel animation, speed adjustment, pause, restart and time slider. Coarse rays stop at land, and the ocean mask suppresses terrestrial wavefront rendering.
- Nuclear energy references, scientific-notation input, J/t/kt/Mt/Gt/Tt converter.
- Up to five overlay snapshots, pinned side-by-side comparison, up to twenty device-local bookmarks.
- Shareable scenario URL, current-state restoration, JSON results export, map-only PNG export.
- Light/dark mode, compact responsive layout, mobile control drawer, loading/error recovery boundary.
- Keyboard: R = ruler, F = fit, Space = ocean play/pause, Esc = close mobile drawer.

The map click and marker drop infer environment from coarse geography. You can override land/ocean afterward. Near-coast classification is approximate. Comparison B is pinned when Compare is clicked; edits to A do not change B. B's source remains selectable; “Replace with A” takes a new snapshot. Click an overlay footprint to inspect its input scenario.

### Offline behavior

`START.html` has no external dependencies. On HTTPS/localhost, the production version also caches its own assets with a service worker after the first successful load, enabling offline reload. Development mode does not register that worker. External citation links naturally need internet. No tile servers, external fonts, analytics, geocoding service or API keys are used.

LocalStorage is best-effort browser storage, not a cloud account. Clearing site data removes bookmarks/history. JSON exports include inputs and limitations; import is not implemented. Share links contain scenario parameters only. A hash-linked scenario takes precedence over locally saved current state on reload.

## Structure

```
src/physics.ts        Pure equations, units, input validation, presets
src/geography.ts      Bundled geography, geodesic circles, ocean ray masking
src/MapView.tsx       SVG map, pan/zoom, drag and ruler
src/App.tsx           Controls, result panels, comparison and state
src/storage.ts       Browser persistence and exports
src/world.json       Bundled Natural Earth world-atlas geometry
src/*.test.*         Executed unit and jsdom tests
tests/               Playwright browser tests
scripts/offline.mjs  Standalone HTML and service-worker generation
.github/workflows/   GitHub Pages build/test/deployment
```

## Deliberate limitations

No satellite layer, full worldwide geocoder, city/street-level basemap, atmospheric trajectory solver, quantitative ejecta/thermal/shock/seismic/frequency model, hydrodynamic tsunami amplitudes, coastal run-up or inundation. No casualty estimates or nuclear damage simulation. Planet-scale crater outputs are withheld rather than extrapolated. Details, assumptions and references are inside the app and `SCIENCE.md`.

MIT for original code. Natural Earth geography is public domain; bundled dependency licenses are listed in `THIRD_PARTY_NOTICES.txt`.
