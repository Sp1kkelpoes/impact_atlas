import { useEffect, useState } from "react";
import { MapView, Layers } from "./MapView";
import {
  Scenario,
  initial,
  sanitize,
  calculate,
  presets,
  fmt,
  units,
  encode,
  decode,
} from "./physics";
import { cities, onLand } from "./geography";
import { read, save, bookmarks, download, screenshot } from "./storage";
function Num({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="field">
      <span>
        {label}
        <em>{unit}</em>
      </span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (
            e.target.value.trim() &&
            Number.isFinite(n) &&
            n >= min &&
            n <= max
          )
            onChange(n);
        }}
        onBlur={() => {
          const n = Number(draft);
          if (draft.trim() && Number.isFinite(n)) {
            const v = Math.max(min, Math.min(max, n));
            onChange(v);
            setDraft(String(v));
          } else setDraft(String(value));
        }}
      />
    </label>
  );
}
const labels: Record<keyof Layers, string> = {
  crater: "Conditional crater footprint",
  wave: "Ocean travel wavefronts",
  reference: "Reference distances · 100 / 500 / 1,000 km",
  labels: "City labels",
  grid: "Latitude / longitude grid",
};
export default function App() {
  const [s, setS] = useState<Scenario>(
      () => decode(location.hash) || sanitize(read("last", initial)),
    ),
    [dark, setDark] = useState(() => read("dark", false)),
    [saved, setSaved] = useState(bookmarks),
    [overlays, setOverlays] = useState<Scenario[]>([]),
    [comparison, setComparison] = useState<Scenario | null>(null),
    [layers, setLayers] = useState<Layers>({
      grid: true,
      labels: true,
      crater: true,
      reference: true,
      wave: true,
    }),
    [focus, setFocus] = useState(0),
    [ruler, setRuler] = useState(false),
    [minutes, setMinutes] = useState(60),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(30),
    [query, setQuery] = useState(""),
    [history, setHistory] = useState<string[]>(() => {
      const h = read<unknown>("history", []);
      return Array.isArray(h)
        ? h.filter((x) => typeof x === "string").slice(0, 6)
        : [];
    }),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("overview"),
    [mobile, setMobile] = useState(false),
    [converter, setConverter] = useState(1),
    [convertUnit, setConvertUnit] = useState("Mt");
  const r = calculate(s),
    land = onLand(s.lon, s.lat),
    waveValid = s.mode === "asteroid" && s.ocean && !land;
  function patch(p: Partial<Scenario>) {
    setS((old) => sanitize({ ...old, ...p }));
  }
  function load(v: Scenario) {
    setS(sanitize(v));
    setFocus((x) => x + 1);
    setPlaying(false);
    setMinutes(60);
    setMobile(false);
  }
  function reset() {
    window.history.replaceState(null, "", location.pathname);
    load(initial);
    setComparison(null);
    setOverlays([]);
    setRuler(false);
    setLayers({
      grid: true,
      labels: true,
      crater: true,
      reference: true,
      wave: true,
    });
    setTab("overview");
    setNotice("Controls reset. Bookmarks retained.");
  }
  useEffect(() => {
    save("last", s);
  }, [s]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    save("dark", dark);
  }, [dark]);
  useEffect(() => {
    function changed() {
      const next = decode(location.hash);
      if (next) load(next);
    }
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!playing || !waveValid) return;
    const timer = setInterval(
      () =>
        setMinutes((t) => {
          const next = t + speed / 10;
          if (next >= 360) {
            setPlaying(false);
            return 360;
          }
          return next;
        }),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, speed, waveValid]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input,select,textarea")) return;
      if (e.key.toLowerCase() === "r") setRuler((v) => !v);
      if (e.key.toLowerCase() === "f") setFocus((v) => v + 1);
      if (e.key === " " && waveValid) {
        e.preventDefault();
        setPlaying((v) => !v);
      }
      if (e.key === "Escape") setMobile(false);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [waveValid]);
  function search(text = query) {
    const q = text.trim();
    if (!q) {
      setNotice("Enter a city or latitude, longitude.");
      return;
    }
    const coords = q.split(/[,\s]+/).map(Number);
    const city =
      cities.find((c) => c[0].toLocaleLowerCase() === q.toLocaleLowerCase()) ||
      cities.find((c) => c[0].toLowerCase().startsWith(q.toLowerCase()));
    let lat: number, lon: number;
    if (
      coords.length === 2 &&
      coords.every(Number.isFinite) &&
      Math.abs(coords[0]) <= 90 &&
      Math.abs(coords[1]) <= 180
    ) {
      [lat, lon] = coords;
    } else if (city) {
      [, lon, lat] = city;
    } else {
      setNotice(
        "Not found. Search a listed city, or enter latitude, longitude.",
      );
      return;
    }
    patch({ lat, lon, ocean: !onLand(lon, lat) });
    setFocus((v) => v + 1);
    setQuery(q);
    const h = [q, ...history.filter((x) => x !== q)].slice(0, 6);
    setHistory(h);
    save("history", h);
  }
  function bookmark() {
    const list = [s, ...saved].slice(0, 20);
    if (save("bookmarks", list)) {
      setSaved(list);
      setNotice("Scenario bookmarked on this device.");
    } else setNotice("Browser storage unavailable. Export JSON instead.");
  }
  async function share() {
    if (location.protocol === "file:") {
      setNotice(
        "For shareable web links, host this project on GitHub Pages. Export JSON to share offline.",
      );
      return;
    }
    const url = location.origin + location.pathname + encode(s);
    historyReplace(url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Scenario link copied.");
    } catch {
      setNotice("Scenario is in the address bar. Copy its URL to share.");
    }
  }
  function historyReplace(url: string) {
    window.history.replaceState(null, "", url);
  }
  const num = (
    key: keyof Scenario,
    label: string,
    min: number,
    max: number,
    unit: string,
  ) => (
    <Num
      label={label}
      value={s[key] as number}
      onChange={(v) => patch({ [key]: v })}
      min={min}
      max={max}
      unit={unit}
    />
  );
  return (
    <div className="app">
      <header>
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">◎</span>
          <span>
            IMPACT<span className="brand-light"> ATLAS</span>
            <small>PLANETARY EFFECTS EXPLORER</small>
          </span>
        </a>
        <div className="header-center">
          <span className="version">2.0</span>{" "}
          <span>Explore scale. Understand uncertainty.</span>
        </div>
        <nav>
          <button
            className="mobile-toggle"
            onClick={() => setMobile((v) => !v)}
          >
            ☷ Controls
          </button>
          <button
            onClick={() => setTab(tab === "methods" ? "overview" : "methods")}
          >
            Methodology
          </button>
          <button
            aria-label="Toggle dark mode"
            onClick={() => setDark((v) => !v)}
          >
            {dark ? "☀" : "◐"}
          </button>
          <button className="share" onClick={share}>
            Share scenario ↗
          </button>
        </nav>
      </header>
      <div className="workspace">
        <aside className={mobile ? "open" : ""}>
          <div className="side-intro">
            <span className="eyebrow">01 / CONFIGURE</span>
            <h1>Explore an impact</h1>
            <p>Set the conditions. Follow the physics.</p>
          </div>
          <div className="mode-tabs">
            <button
              className={s.mode === "asteroid" ? "active" : ""}
              onClick={() => patch({ mode: "asteroid" })}
            >
              ☄ Asteroid
            </button>
            <button
              className={s.mode === "energy" ? "active" : ""}
              onClick={() => patch({ mode: "energy" })}
            >
              ⚛ Nuclear energy
            </button>
          </div>
          <section>
            <label className="field">
              <span>Scenario name</span>
              <input
                aria-label="Scenario name"
                value={s.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            {s.mode === "asteroid" ? (
              <>
                <label className="field">
                  <span>
                    Load an analogue <em>Illustrative inputs</em>
                  </span>
                  <select
                    aria-label="Asteroid preset"
                    value=""
                    onChange={(e) =>
                      load(
                        sanitize({
                          ...initial,
                          ...presets[e.target.value],
                          mode: "asteroid",
                        }),
                      )
                    }
                  >
                    <option value="" disabled>
                      Choose a reference event…
                    </option>
                    {Object.keys(presets).map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                {num("diameter", "Diameter", 1, 1e6, "m")}
                <input
                  aria-label="Diameter logarithmic slider"
                  className="range"
                  type="range"
                  min="0"
                  max="6"
                  step=".01"
                  value={Math.log10(s.diameter)}
                  onChange={(e) =>
                    patch({
                      diameter: Math.round(10 ** Number(e.target.value)),
                    })
                  }
                />
                <div className="range-labels">
                  <span>1 m</span>
                  <span>1 km</span>
                  <span>1,000 km</span>
                </div>
                <div className="field-row">
                  {num("velocity", "Velocity", 11, 72, "km/s")}
                  {num("angle", "Entry angle", 5, 90, "° above horizon")}
                </div>
                <label className="field">
                  <span>Composition</span>
                  <select
                    aria-label="Composition"
                    value={s.composition}
                    onChange={(e) => {
                      const composition = e.target
                        .value as Scenario["composition"];
                      patch({
                        composition,
                        density: { icy: 1000, rocky: 3000, metallic: 7800 }[
                          composition
                        ],
                      });
                    }}
                  >
                    <option value="icy">Icy / porous</option>
                    <option value="rocky">Rocky / silicate</option>
                    <option value="metallic">Metallic / iron</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <div className="note">
                  Energy comparisons only. No weapon damage contours, burst
                  optimization or fallout model.
                </div>
                <label className="field">
                  <span>Energy reference</span>
                  <select
                    aria-label="Energy preset"
                    value=""
                    onChange={(e) => {
                      const [name, yieldValue, unit] =
                        e.target.value.split("|");
                      patch({ name, yield: Number(yieldValue), unit });
                    }}
                  >
                    <option value="" disabled>
                      Choose a reference…
                    </option>
                    <option value="Trinity energy reference|21|kt">
                      Trinity · approximately 21 kt
                    </option>
                    <option value="Ivy Mike energy reference|10.4|Mt">
                      Ivy Mike · approximately 10.4 Mt
                    </option>
                    <option value="Tsar Bomba energy reference|50|Mt">
                      Tsar Bomba · approximately 50 Mt
                    </option>
                    <option value="Hypothetical 1 Gt|1|Gt">
                      Hypothetical · 1 Gt
                    </option>
                    <option value="Hypothetical 100 Gt|100|Gt">
                      Hypothetical · 100 Gt
                    </option>
                  </select>
                </label>
                <div className="field-row">
                  {num(
                    "yield",
                    "Energy input",
                    1e-9,
                    1e12,
                    "scientific notation",
                  )}
                  <label className="field">
                    <span>Unit</span>
                    <select
                      aria-label="Energy unit"
                      value={s.unit}
                      onChange={(e) => patch({ unit: e.target.value })}
                    >
                      {Object.keys(units).map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="muted">
                  TNT equivalence compares total energy, not physical
                  consequences. A nuclear detonation and an asteroid do not
                  couple energy to their surroundings in the same way.
                </p>
              </>
            )}
          </section>
          <section>
            <h2>
              Location <span>Click or drag on map</span>
            </h2>
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <input
                list="cities"
                aria-label="Search city or coordinates"
                placeholder="City or latitude, longitude"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button aria-label="Search location" type="submit">
                ↗
              </button>
            </form>
            <datalist id="cities">
              {cities.map((c) => (
                <option key={c[0]} value={c[0]} />
              ))}
            </datalist>
            <p className="tiny">
              Offline index: {cities.length} cities · all coordinates supported
            </p>
            {history.length > 0 && (
              <div className="history">
                {history.slice(0, 3).map((h) => (
                  <button key={h} onClick={() => search(h)}>
                    {h}
                  </button>
                ))}
              </div>
            )}
            <div className="field-row">
              {num("lat", "Latitude", -90, 90, "°")}
              {num("lon", "Longitude", -180, 180, "°")}
            </div>
            {s.mode === "asteroid" && (
              <>
                <label className="field">
                  <span>Impact environment</span>
                  <select
                    aria-label="Impact environment"
                    value={s.ocean ? "ocean" : "land"}
                    onChange={(e) =>
                      patch({ ocean: e.target.value === "ocean" })
                    }
                  >
                    <option value="land">Land · conditional crater</option>
                    <option value="ocean">Ocean · wave travel concept</option>
                  </select>
                </label>
                {s.ocean === land && (
                  <p className="warning">
                    Selected environment differs from the coarse map.{" "}
                    {s.ocean
                      ? "Ocean animation disabled at this land point."
                      : "Land equations are hypothetical at this ocean point."}
                  </p>
                )}
              </>
            )}
          </section>
          <details>
            <summary>Advanced physical assumptions</summary>
            <section>
              {s.mode === "asteroid" && (
                <>
                  {num("density", "Bulk density", 300, 10000, "kg/m³")}
                  {num("target", "Target density", 1500, 3500, "kg/m³")}
                  {num("depth", "Uniform ocean depth", 10, 11000, "m")}
                  <p className="tiny">
                    No atmospheric trajectory solver. Crater scaling assumes
                    intact impact at the specified velocity. Earth gravity: 9.81
                    m/s².
                  </p>
                </>
              )}
              <p className="tiny">
                Spherical Earth radius: 6,371.0088 km. Geography is simplified
                and unsuitable for street-level or coastal decisions.
              </p>
            </section>
          </details>
          <details open>
            <summary>Map layers</summary>
            <section className="layer-list">
              {(Object.keys(labels) as (keyof Layers)[]).map((k) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={layers[k]}
                    onChange={(e) =>
                      setLayers({ ...layers, [k]: e.target.checked })
                    }
                  />
                  <span className={"layer-dot " + k} />
                  {labels[k]}
                </label>
              ))}
              <p className="tiny">
                Dashed circles are distance references, not damage zones.
              </p>
            </section>
          </details>
          <details>
            <summary>
              Bookmarks <span>{saved.length}</span>
            </summary>
            <section>
              {saved.length === 0 ? (
                <p className="muted">Save a scenario to return to it later.</p>
              ) : (
                saved.map((b, i) => (
                  <div className="bookmark" key={i}>
                    <button onClick={() => load(b)}>
                      {b.name}
                      <small>
                        {b.mode} · {b.lat.toFixed(1)}°, {b.lon.toFixed(1)}°
                      </small>
                    </button>
                    <button
                      aria-label={"Delete bookmark " + i}
                      onClick={() => {
                        const next = saved.filter((_, n) => n !== i);
                        setSaved(next);
                        save("bookmarks", next);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </section>
          </details>
          <div className="sidebar-bottom">
            <button className="primary" onClick={bookmark}>
              ＋ Bookmark scenario
            </button>
            <button onClick={reset}>Reset controls</button>
          </div>
        </aside>
        <main>
          <div className="map-topbar">
            <div>
              <span className="eyebrow">02 / EXPLORE</span>
              <strong>{s.name}</strong>
              <span className="small-tag">
                {s.mode === "energy"
                  ? "Energy reference"
                  : s.ocean
                    ? "Ocean scenario"
                    : "Land scenario"}
              </span>
            </div>
            <div className="map-actions">
              <button
                className={ruler ? "selected" : ""}
                onClick={() => setRuler((v) => !v)}
              >
                ⌁ Ruler
              </button>
              <button onClick={() => setFocus((v) => v + 1)}>⌖ Fit</button>
              <button
                onClick={() => {
                  setOverlays((v) => [...v, s].slice(-5));
                  setNotice(
                    "Snapshot added. Change inputs to compare footprints.",
                  );
                }}
              >
                ＋ Overlay
              </button>
              <button
                className={comparison ? "selected" : ""}
                onClick={() => setComparison(comparison ? null : { ...s })}
              >
                {comparison ? "Close comparison" : "⇄ Compare"}
              </button>
            </div>
          </div>
          <div className={"maps " + (comparison ? "split" : "")}>
            <div className="map-cell">
              {comparison && (
                <div className="compare-caption">A · Live scenario</div>
              )}
              <MapView
                s={s}
                layers={layers}
                overlays={overlays}
                onInspect={load}
                onPick={(lat, lon) =>
                  patch({ lat, lon, ocean: !onLand(lon, lat) })
                }
                minutes={minutes}
                ruler={ruler}
                focus={focus}
                dark={dark}
              />
            </div>
            {comparison && (
              <div className="map-cell">
                <div className="compare-caption">
                  B · Pinned: {comparison.name}
                  <button onClick={() => setComparison({ ...s })}>
                    Replace with A
                  </button>
                </div>
                <MapView
                  s={comparison}
                  layers={layers}
                  overlays={[]}
                  onPick={(lat, lon) =>
                    setComparison({
                      ...comparison,
                      lat,
                      lon,
                      ocean: !onLand(lon, lat),
                    })
                  }
                  minutes={minutes}
                  ruler={ruler}
                  focus={focus}
                  dark={dark}
                />
              </div>
            )}
            <div className="map-legend">
              <span>
                <i className="orange" /> Conditional crater
              </span>
              <span>
                <i className="blue" /> Ocean travel concept
              </span>
              <span>
                <i className="dashed" /> Reference distance
              </span>
              {overlays.length > 0 && (
                <button onClick={() => setOverlays([])}>
                  Clear {overlays.length} overlays ×
                </button>
              )}
            </div>
          </div>
          {waveValid && (
            <div className="timeline">
              <button
                aria-label={playing ? "Pause animation" : "Play animation"}
                onClick={() => setPlaying((v) => !v)}
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button
                aria-label="Restart animation"
                onClick={() => {
                  setMinutes(0);
                  setPlaying(true);
                }}
              >
                ↺
              </button>
              <span className="timeline-label">WAVE TRAVEL</span>
              <input
                aria-label="Wave time minutes"
                type="range"
                min="0"
                max="360"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
              <strong>
                {Math.floor(minutes / 60)}h{" "}
                {Math.floor(minutes % 60)
                  .toString()
                  .padStart(2, "0")}
                m
              </strong>
              <select
                aria-label="Animation speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value="5">5 min/s</option>
                <option value="30">30 min/s</option>
                <option value="60">60 min/s</option>
              </select>
              <span className="tiny">Uniform depth · not a forecast</span>
            </div>
          )}
          <div className="results">
            <div className="result-tabs">
              <div>
                {[
                  ["overview", "Results"],
                  ["methods", "Equations & sources"],
                  ["limits", "Model limits"],
                  ["converter", "Unit converter"],
                ].map(([id, title]) => (
                  <button
                    key={id}
                    className={tab === id ? "active" : ""}
                    onClick={() => setTab(id)}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <div>
                <button
                  onClick={() =>
                    download(
                      "impact-atlas-results.json",
                      JSON.stringify(
                        {
                          version: "2.0",
                          inputs: s,
                          results: r,
                          comparison: comparison
                            ? {
                                inputs: comparison,
                                results: calculate(comparison),
                              }
                            : null,
                          overlays,
                          limitations: [
                            "Conditional crater: no atmospheric solver",
                            "Wavefront: uniform depth, coarse land interception, no amplitude prediction",
                            "No nuclear damage simulation",
                          ],
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  ↓ JSON
                </button>
                <button
                  onClick={() =>
                    screenshot().catch(() =>
                      setNotice(
                        "PNG export failed in this browser. Try another browser.",
                      ),
                    )
                  }
                >
                  ↓ Map PNG
                </button>
              </div>
            </div>
            {tab === "overview" && (
              <>
                <div className="result-heading">
                  <span className="eyebrow">03 / UNDERSTAND</span>
                  <span className="model-status">
                    {s.mode === "energy" ? "Energy conversion" : r.regime} ·
                    educational approximation
                  </span>
                </div>
                <div className="metrics">
                  <Metric
                    label={
                      s.mode === "energy"
                        ? "TOTAL ENERGY"
                        : "INCIDENT KINETIC ENERGY"
                    }
                    value={fmt(r.energy)}
                    unit="joules"
                    accent
                  />
                  <Metric
                    label="TNT EQUIVALENT"
                    value={fmt(r.tons / 1e6)}
                    unit="megatons TNT"
                  />
                  {s.mode === "asteroid" ? (
                    <>
                      <Metric
                        label="ASTEROID MASS"
                        value={fmt(r.mass)}
                        unit="kilograms"
                      />
                      <Metric
                        label={
                          s.ocean
                            ? "SHALLOW-WATER SPEED"
                            : "CONDITIONAL FINAL CRATER"
                        }
                        value={
                          s.ocean
                            ? fmt(r.waveSpeed * 3.6)
                            : fmt(r.crater === null ? null : r.crater / 1000)
                        }
                        unit={
                          s.ocean
                            ? "km/h · uniform depth"
                            : "km · intact-body assumption"
                        }
                      />
                    </>
                  ) : (
                    <>
                      <Metric
                        label="TRINITY ENERGY UNITS"
                        value={fmt(r.tons / 21000)}
                        unit="energy ratio only"
                      />
                      <Metric
                        label="GIGATONS TNT"
                        value={fmt(r.tons / 1e9)}
                        unit="Gt"
                      />
                    </>
                  )}
                </div>
                {comparison && (
                  <div className="comparison-results">
                    <strong>B · {comparison.name}</strong>
                    <span>{fmt(calculate(comparison).energy, "J")}</span>
                    <span>
                      A / B energy:{" "}
                      {fmt(r.energy / calculate(comparison).energy)}×
                    </span>
                    {comparison.mode === "asteroid" && (
                      <span>{fmt(calculate(comparison).mass, "kg")}</span>
                    )}
                  </div>
                )}
                <div className="result-note">
                  {s.mode === "energy"
                    ? "Energy equivalence is not equivalence of damage. This module has no geographic damage footprint."
                    : s.diameter > 20000
                      ? "Planet-scale regime: ordinary crater equations are disabled. Energy is calculated; climate, ocean loss and planetary response are not predicted."
                      : s.ocean
                        ? "Wavefronts illustrate travel time only. Coarse land interception blocks direct rays; no refraction, coastal run-up, inundation or wave-height prediction."
                        : "Crater size is conditional on an intact body reaching the ground at input speed. It is not an atmospheric-entry prediction. For small objects, this condition may be unrealistic."}
                </div>
              </>
            )}
            {tab === "methods" &&
              (s.mode === "energy" ? (
                <div className="detail-panel">
                  <div>
                    <h3>Energy conversion</h3>
                    <p>E = input × unit conversion factor.</p>
                    <p>
                      {fmt(s.yield)} {s.unit} × {fmt(units[s.unit])} J/{s.unit}{" "}
                      = <b>{fmt(r.energy, "J")}</b>
                    </p>
                    <p>
                      1 ton TNT = 4.184 × 10⁹ J. Nuclear conversion outputs do
                      not depend on location or asteroid parameters.
                    </p>
                  </div>
                  <div>
                    <h3>Interpretation</h3>
                    <p>
                      These are total-energy comparisons. They predict no
                      physical footprint, casualty count or environmental
                      equivalence. Historical reference yields are approximate.
                    </p>
                    <p>
                      <a
                        href="https://www.energy.gov/management/october-31-1952-mike-test"
                        target="_blank"
                        rel="noreferrer"
                      >
                        US Department of Energy · Ivy Mike reference
                      </a>
                    </p>
                    <p>
                      <a
                        href="https://www.norsar.no/nyheter/60-ar-etter-provesprengningen-av-tsar-bomba"
                        target="_blank"
                        rel="noreferrer"
                      >
                        NORSAR · Tsar Bomba context
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="detail-panel">
                  <div>
                    <h3>Transparent calculations</h3>
                    <p>
                      Sphere volume V = πD³ / 6 = <b>{fmt(r.volume, "m³")}</b>
                      <br />
                      Mass m = ρV = <b>{fmt(r.mass, "kg")}</b>
                      <br />
                      Incident energy E = ½mv². Velocity is converted from km/s
                      to m/s.
                      <br />1 ton TNT = 4.184 × 10⁹ J.
                    </p>
                    <h3>Conditional crater model</h3>
                    <p className="equation">
                      Dₜ = 1.161 (ρᵢ/ρₜ)⅓ D⁰·⁷⁸ v⁰·⁴⁴ g⁻⁰·²² sin(θ)⅓
                    </p>
                    <p>
                      SI units. Transient diameter:{" "}
                      <b>{fmt(r.transient, "m")}</b>. Final simple crater:
                      1.25Dₜ; complex crater: 1.17Dₜ¹·¹³ / 3200⁰·¹³. Transition
                      uses 1.25Dₜ = 3.2 km.
                    </p>
                    <p>
                      Enabled only for land, diameter 50 m–20 km, angle ≥15°.
                      These conservative application limits do not validate
                      atmospheric survival.
                    </p>
                  </div>
                  <div>
                    <h3>Ocean travel model</h3>
                    <p>
                      c = √(gh), with g = 9.81 m/s². Distance = c × elapsed
                      time. Three wavefronts are illustrative phase markers, not
                      a simulated wave train. Direct rays stop at sampled land
                      intersections.
                    </p>
                    <p>
                      Geometric swept-water volume:{" "}
                      <b>{fmt(r.displacedVolume, "m³")}</b> = π(D/2)² min(D,h).
                      This is a cylinder-volume illustration, not cavity
                      displacement or tsunami amplitude.
                    </p>
                    <h3>References & data</h3>
                    <ul className="sources">
                      <li>
                        <a
                          href="https://doi.org/10.1111/j.1945-5100.2005.tb00157.x"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Collins, Melosh & Marcus (2005)
                        </a>{" "}
                        · selected crater scaling; independent implementation.
                      </li>
                      <li>
                        <a
                          href="https://www.noaa.gov/jetstream/tsunamis/tsunami-propagation"
                          target="_blank"
                          rel="noreferrer"
                        >
                          NOAA · Tsunami propagation
                        </a>{" "}
                        · shallow-water wave speed.
                      </li>
                      <li>
                        <a
                          href="https://www.energy.gov/management/october-31-1952-mike-test"
                          target="_blank"
                          rel="noreferrer"
                        >
                          US DOE · Ivy Mike
                        </a>{" "}
                        · historical energy reference.
                      </li>
                      <li>
                        <a
                          href="https://www.naturalearthdata.com/about/terms-of-use/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Natural Earth
                        </a>{" "}
                        · public-domain geography; world-atlas packaging.
                      </li>
                    </ul>
                    <p className="tiny">
                      Not an implementation or endorsement of the full Earth
                      Impact Effects Program.
                    </p>
                  </div>
                </div>
              ))}
            {tab === "limits" && (
              <div className="detail-panel">
                <div>
                  <h3>What the numbers do — and do not — mean</h3>
                  <p>
                    <b>Atmospheric entry:</b> breakup, ablation and airburst
                    altitude require a trajectory and material-strength model.
                    Small rocky and icy objects may fragment. No
                    airburst/ground-impact verdict is asserted.
                  </p>
                  {s.mode === "asteroid" && (
                    <>
                      <p>
                        <b>
                          Asteroid sensitivity (not a nuclear-yield
                          uncertainty):
                        </b>{" "}
                        input uncertainty dominates energy: E ∝ ρD³v². The range
                        below varies D ±20% and v ±10%, holding density fixed.
                        It is a sensitivity envelope, not a confidence interval.
                      </p>
                      <p className="sensitivity">
                        {fmt(r.energy * 0.8 ** 3 * 0.9 ** 2, "J")} —{" "}
                        {fmt(r.energy * 1.2 ** 3 * 1.1 ** 2, "J")}
                      </p>
                    </>
                  )}
                  <p>
                    <b>Other consequences:</b> ejecta, thermal radiation, blast
                    overpressure, ground shaking, impact frequency and global
                    climate response are not quantitatively modeled. No casualty
                    predictions.
                  </p>
                </div>
                <div>
                  <h3>Ocean and geographic limitations</h3>
                  <p>
                    <b>Wave height</b> is crest-to-trough water elevation.{" "}
                    <b>Run-up</b> is maximum vertical reach above reference sea
                    level on land. <b>Inundation</b> is the inland flooded area.
                    Travel-time rings predict none of these.
                  </p>
                  <p>
                    Uniform-depth, straight-ray propagation uses 3° directions
                    and 25 km land sampling, ending at 5,000 km. Small islands
                    and narrow land barriers can be missed. There is no
                    refraction, diffraction, dispersion or bathymetry.
                  </p>
                  <p>
                    The bundled 1:110m geography is intentionally coarse.
                    Ocean/land selection can be wrong near coastlines. Satellite
                    imagery and street-level geocoding are not included.
                  </p>
                  <p>
                    <b>Keyboard:</b> R ruler · F fit · Space play/pause ocean
                    animation · Esc close mobile controls.
                  </p>
                </div>
              </div>
            )}
            {tab === "converter" && (
              <div className="converter">
                <div>
                  <h3>Energy unit converter</h3>
                  <div className="field-row">
                    <Num
                      label="Conversion value"
                      value={converter}
                      min={1e-20}
                      max={1e40}
                      onChange={setConverter}
                    />
                    <label className="field">
                      <span>From</span>
                      <select
                        aria-label="Conversion unit"
                        value={convertUnit}
                        onChange={(e) => setConvertUnit(e.target.value)}
                      >
                        {Object.keys(units).map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      setConverter(r.energy);
                      setConvertUnit("J");
                    }}
                  >
                    Use scenario energy
                  </button>
                </div>
                <table>
                  <tbody>
                    {Object.entries(units).map(([u, f]) => (
                      <tr key={u}>
                        <th>{u === "t" ? "tons TNT" : u}</th>
                        <td>{fmt((converter * units[convertUnit]) / f)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <footer>
            <span>
              <span className="status-dot" /> All calculations run locally
            </span>
            <span>Educational use · no hazard or evacuation guidance</span>
            <span>IMPACT ATLAS / 2.0</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className={"metric " + (accent ? "accent" : "")}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}
