# Verification report

## Executed successfully

- `npm test`: **21 tests passed** in 2 files.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `node --check` on production JavaScript and service worker: passed.
- Static production-asset verification: both generated JS/CSS references resolve under a GitHub repository subpath; referenced files exist.
- Standalone HTML verification: START.html embeds the script and stylesheet; no external script or stylesheet references remain.
- `npx playwright test --list`: successfully discovered **16 browser cases**, desktop and mobile. Listing is not execution.

### Mathematical and geographic tests (15)

Sphere mass and kinetic energy; D³/ρ/v² scaling; TNT conversions; monotonic conditional crater dimensions; domain suppression; finite supported extremes; URL input validation and round trips; all presets; NOAA wave-speed relationship; great-circle distances including antimeridian/antipodes; destinations near poles; circle radii and finite SVG paths; known land/ocean classification; land-source suppression; blocked-ray segment omission.

### Real component tests in jsdom (6)

App mounts and produces SVG geometry without NaN/Infinity; preset changes and bookmark/current-state restoration; nuclear energy conversions and methodology panel; converter; side-by-side map creation/removal; overlay controls; zoom transform; theme state; mobile drawer state; shared URL precedence.

These are DOM tests, **not visual browser tests**. They do not prove browser rendering, touch behavior, layout or downloads.

## Browser verification blocked

The supervised preview server started, but the available browser rejected `http://terminal.local:4173/` with `net::ERR_BLOCKED_BY_CLIENT`. There was no usable browser path for visual testing. No successful desktop/mobile screenshot inspection or browser interaction run is claimed.

The provided Playwright tests cover production loading/errors/network requests, presets, extreme inputs, energy conversion, bookmarks, zoom/pan/ruler, comparison, theme, JSON/PNG exports, URL restoration, horizontal mobile overflow and offline reload at a repository subpath. The GitHub Actions workflow runs them before deployment.

## Requirement status

| Requirement | Evidence / status |
|---|---|
| Site loads without JavaScript errors | DOM mount and build passed; actual browser unverified |
| No external tile 403 errors | No tile requests are implemented; actual browser network check unexecuted |
| Zoom and pan | Zoom DOM transform tested; pointer pan unverified in browser |
| Impact selection / marker dragging | Implemented; actual pointer interactions unverified |
| Nuclear inputs change calculations | Energy-only tab tested in DOM; damage modeling intentionally omitted |
| Asteroid inputs and presets | Physics and DOM preset tests passed |
| Extreme inputs avoid NaN / Infinity | Mathematical domain sweep and SVG tests passed |
| Overlays align geographically | Spherical radii/geographic path tests passed; visual placement unverified |
| Mobile layout | CSS and drawer DOM state implemented; rendered layout/touch unverified |
| Reload restores saved state | DOM remount and hash-state tests passed |
| GitHub Pages build | Build/static subpath checks passed; live deployment not performed |
| Screenshot export / clipboard / service worker | Implemented; browser behavior unverified |

## Deployment status

No GitHub account connection was available. No repository was created and no public URL was deployed or verified. The ZIP contains the full source, lockfile, production build, standalone HTML and deployment workflow.
