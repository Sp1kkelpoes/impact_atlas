import { useEffect, useMemo, useRef, useState, useId } from "react";
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, ZoomTransform, ZoomBehavior } from "d3-zoom";
import { Scenario, calculate, EARTH_KM, distance, fmt } from "./physics";
import {
  land,
  borders,
  cities,
  circle,
  oceanRays,
  waveLine,
  onLand,
} from "./geography";
export type Layers = {
  grid: boolean;
  labels: boolean;
  crater: boolean;
  reference: boolean;
  wave: boolean;
};
type Props = {
  s: Scenario;
  onPick: (lat: number, lon: number) => void;
  overlays: Scenario[];
  layers: Layers;
  minutes: number;
  ruler: boolean;
  focus: number;
  dark: boolean;
  onInspect?: (s: Scenario) => void;
};
export function MapView({
  s,
  onPick,
  overlays,
  layers,
  minutes,
  ruler,
  focus,
  dark,
  onInspect,
}: Props) {
  const ref = useRef<SVGSVGElement>(null),
    container = useRef<HTMLDivElement>(null),
    behavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null),
    uid = useId().replace(/:/g, "");
  const [size, setSize] = useState([1000, 600]),
    [tr, setTr] = useState(new ZoomTransform(1, 0, 0)),
    [points, setPoints] = useState<[number, number][]>([]),
    [hover, setHover] = useState<[number, number] | null>(null),
    [ghost, setGhost] = useState<[number, number] | null>(null);
  const width = size[0],
    height = size[1],
    projection = useMemo(
      () =>
        geoEquirectangular()
          .scale(width / (2 * Math.PI))
          .translate([width / 2, height / 2]),
      [width, height],
    ),
    path = useMemo(() => geoPath(projection), [projection]);
  const landPath = useMemo(() => path(land), [path]),
    borderPath = useMemo(() => path(borders), [path]),
    gridPath = useMemo(() => path(geoGraticule10()), [path]);
  const result = calculate(s),
    rays = useMemo(
      () => (s.ocean && s.mode === "asteroid" ? oceanRays(s.lon, s.lat) : []),
      [s.lon, s.lat, s.ocean, s.mode],
    );
  useEffect(() => {
    const ob = new ResizeObserver((e) =>
      setSize([e[0].contentRect.width, e[0].contentRect.height]),
    );
    if (container.current) ob.observe(container.current);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 300])
      .filter(
        (e) =>
          !e.target.closest("[data-marker]") &&
          (!e.ctrlKey || e.type === "wheel") &&
          !e.button,
      )
      .on("zoom", (e) => setTr(e.transform));
    behavior.current = z;
    select(ref.current).call(z).on("dblclick.zoom", null);
    return () => {
      select(ref.current).on(".zoom", null);
    };
  }, []);
  useEffect(() => {
    if (!ref.current || !behavior.current) return;
    const p = projection([s.lon, s.lat])!;
    const km =
      s.mode === "asteroid" && result.crater
        ? Math.max((result.crater / 1000) * 4, 50)
        : s.ocean
          ? 4000
          : 2200;
    const k = Math.max(
      1,
      Math.min(
        100,
        (Math.min(width, height) * Math.PI * EARTH_KM) / (km * width),
      ),
    );
    select(ref.current).call(
      behavior.current.transform,
      zoomIdentity
        .translate(width / 2 - p[0] * k, height / 2 - p[1] * k)
        .scale(k),
    );
  }, [focus, width, height]);
  useEffect(() => {
    if (!ruler) setPoints([]);
  }, [ruler]);
  function coordinates(e: { clientX: number; clientY: number }) {
    const box = ref.current!.getBoundingClientRect(),
      p = projection.invert!(
        tr.invert([e.clientX - box.left, e.clientY - box.top]),
      );
    if (!p || p[1] < -90 || p[1] > 90) return null;
    return [((p[0] + 540) % 360) - 180, p[1]] as [number, number];
  }
  function pick(e: React.MouseEvent) {
    if ((e.target as Element).closest("[data-marker]")) return;
    const p = coordinates(e);
    if (!p) return;
    if (ruler) setPoints((old) => (old.length === 1 ? [old[0], p] : [p]));
    else onPick(p[1], p[0]);
  }
  function drag(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as SVGElement;
    el.setPointerCapture(e.pointerId);
    let latest: [number, number] | null = null;
    const move = (event: PointerEvent) => {
      const p = coordinates(event);
      if (p) {
        latest = p;
        setGhost(p);
      }
    };
    const up = (event: PointerEvent) => {
      if (latest && event.type !== "pointercancel")
        onPick(latest[1], latest[0]);
      setGhost(null);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }
  const waveRadius = (result.waveSpeed * minutes * 60) / 1000;
  return (
    <div className="map-container" ref={container}>
      <svg
        ref={ref}
        className="world-map"
        aria-label="Interactive world map"
        role="application"
        onClick={pick}
        onMouseMove={(e) => setHover(coordinates(e))}
        style={{ background: dark ? "#152b35" : "#e1edf0" }}
      >
        <defs>
          <mask id={"sea" + uid}>
            <rect
              x="-100000"
              y="-100000"
              width="200000"
              height="200000"
              fill="white"
            />
            <path d={landPath || ""} fill="black" />
          </mask>
        </defs>
        <g transform={tr.toString()}>
          {layers.grid && (
            <path
              d={gridPath || ""}
              fill="none"
              stroke={dark ? "#2e444d" : "#c3d5db"}
              strokeWidth={0.6 / tr.k}
            />
          )}
          <path
            d={landPath || ""}
            fill={dark ? "#303c3c" : "#f5f4eb"}
            stroke={dark ? "#69766d" : "#acb9ae"}
            strokeWidth={0.75 / tr.k}
          />
          <path
            d={borderPath || ""}
            fill="none"
            stroke={dark ? "#566260" : "#c3c8ba"}
            strokeWidth={0.6 / tr.k}
          />
          {[...overlays, s].map((scenario, index) => {
            if (scenario.mode === "energy") return null;
            const r = calculate(scenario),
              active = index === overlays.length,
              color = active ? "#b85530" : "#7256a4";
            return (
              <g
                key={index}
                onClick={(e) => {
                  if (!active) {
                    e.stopPropagation();
                    onInspect?.(scenario);
                  }
                }}
                style={{ cursor: active ? "inherit" : "pointer" }}
              >
                {layers.reference &&
                  [100, 500, 1000].map((km) => (
                    <path
                      key={km}
                      d={path(circle(scenario.lon, scenario.lat, km)) || ""}
                      fill="none"
                      stroke={active ? "#497c7b" : color}
                      strokeOpacity=".6"
                      strokeDasharray={`${4 / tr.k} ${4 / tr.k}`}
                      strokeWidth={1 / tr.k}
                    />
                  ))}
                {layers.crater && r.crater !== null && (
                  <path
                    d={
                      path(
                        circle(scenario.lon, scenario.lat, r.crater / 2000),
                      ) || ""
                    }
                    fill={color}
                    fillOpacity=".22"
                    stroke={color}
                    strokeWidth={2 / tr.k}
                  />
                )}
                {!active && (
                  <circle
                    cx={projection([scenario.lon, scenario.lat])![0]}
                    cy={projection([scenario.lon, scenario.lat])![1]}
                    r={4 / tr.k}
                    fill={color}
                  />
                )}
              </g>
            );
          })}
          {layers.wave &&
            s.mode === "asteroid" &&
            s.ocean &&
            rays.length > 0 &&
            waveRadius > 0 &&
            waveRadius <= 5000 && (
              <g mask={"url(#sea" + uid + ")"}>
                {[1, 0.72, 0.44].map((fraction, i) => (
                  <path
                    key={i}
                    d={
                      path(
                        waveLine(s.lon, s.lat, waveRadius * fraction, rays),
                      ) || ""
                    }
                    fill="none"
                    stroke="#277ba6"
                    opacity={1 - i * 0.23}
                    strokeWidth={(2 - i * 0.3) / tr.k}
                  />
                ))}
              </g>
            )}
          {layers.labels &&
            cities
              .filter((_, i) => tr.k > 3 || i % 3 === 0)
              .map(([name, lon, lat]) => {
                const p = projection([lon, lat])!;
                return (
                  <g key={name} style={{ pointerEvents: "none" }}>
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={1.8 / tr.k}
                      fill={dark ? "#c4d0d0" : "#667875"}
                    />
                    <text
                      x={p[0] + 4 / tr.k}
                      y={p[1] - 4 / tr.k}
                      fontSize={10 / tr.k}
                      fill={dark ? "#c4d0d0" : "#536b6a"}
                      stroke={dark ? "#303c3c" : "#f5f4eb"}
                      strokeWidth={2 / tr.k}
                      paintOrder="stroke"
                      fontFamily="Arial,sans-serif"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
          {points.length > 0 && (
            <g>
              <path
                d={path({ type: "LineString", coordinates: points }) || ""}
                stroke="#8b4daa"
                strokeWidth={2 / tr.k}
                fill="none"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={projection(p)![0]}
                  cy={projection(p)![1]}
                  r={4 / tr.k}
                  fill="#8b4daa"
                />
              ))}
            </g>
          )}
          <g
            data-marker="true"
            transform={`translate(${projection(ghost || [s.lon, s.lat])!.join(",")}) scale(${1 / tr.k})`}
            onPointerDown={drag}
            style={{ cursor: "grab", touchAction: "none" }}
          >
            <circle r="15" fill="#b8553022" />
            <circle r="7" fill="#fff" stroke="#b85530" strokeWidth="2" />
            <circle r="3" fill="#b85530" />
            <path
              d="M0 -22V-12M0 12V22M-22 0H-12M12 0H22"
              stroke="#b85530"
              strokeWidth="1.5"
            />
          </g>
        </g>
      </svg>
      <div className="map-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() =>
            ref.current &&
            behavior.current &&
            select(ref.current).call(behavior.current.scaleBy, 1.7)
          }
        >
          +
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() =>
            ref.current &&
            behavior.current &&
            select(ref.current).call(behavior.current.scaleBy, 1 / 1.7)
          }
        >
          −
        </button>
        <button
          title="World view"
          aria-label="World view"
          onClick={() =>
            ref.current &&
            behavior.current &&
            select(ref.current).call(behavior.current.transform, zoomIdentity)
          }
        >
          ◎
        </button>
      </div>
      <div className="map-caption">
        <span className="status-dot" /> BUNDLED VECTOR MAP{" "}
        <span>· No tile requests</span>
      </div>
      {ruler && (
        <div className="ruler-note">
          {points.length === 2
            ? `Great-circle distance: ${fmt(distance(points[0], points[1]), "km")}`
            : "Ruler: select two points on the map"}
        </div>
      )}
      <div className="map-attribution">
        Natural Earth · 1:110m · Spherical equirectangular
      </div>
      <div className="map-coords">
        {hover
          ? `${hover[1].toFixed(3)}°, ${hover[0].toFixed(3)}°`
          : `${s.lat.toFixed(3)}°, ${s.lon.toFixed(3)}°`}{" "}
        <span> / {tr.k.toFixed(1)}×</span>
      </div>
    </div>
  );
}
