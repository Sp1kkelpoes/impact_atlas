export const EARTH_KM = 6371.0088,
  TNT_J = 4.184e9;
export type Scenario = {
  name: string;
  mode: "asteroid" | "energy";
  lat: number;
  lon: number;
  diameter: number;
  velocity: number;
  angle: number;
  density: number;
  composition: "icy" | "rocky" | "metallic";
  target: number;
  ocean: boolean;
  depth: number;
  yield: number;
  unit: string;
};
export const units: Record<string, number> = {
  J: 1,
  t: TNT_J,
  kt: TNT_J * 1e3,
  Mt: TNT_J * 1e6,
  Gt: TNT_J * 1e9,
  Tt: TNT_J * 1e12,
};
export const initial: Scenario = {
  name: "Atlantic experiment",
  mode: "asteroid",
  lat: 28,
  lon: -42,
  diameter: 500,
  velocity: 20,
  angle: 45,
  density: 3000,
  composition: "rocky",
  target: 2500,
  ocean: true,
  depth: 4000,
  yield: 50,
  unit: "Mt",
};
export function bounded(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
export function sanitize(o: Partial<Scenario>): Scenario {
  if (!o || typeof o !== "object") o = {};
  return {
    ...initial,
    name: typeof o.name === "string" ? o.name.slice(0, 70) : initial.name,
    mode: o.mode === "energy" ? "energy" : "asteroid",
    lat: bounded(o.lat, -90, 90, initial.lat),
    lon: bounded(o.lon, -180, 180, initial.lon),
    diameter: bounded(o.diameter, 1, 1e6, 500),
    velocity: bounded(o.velocity, 11, 72, 20),
    angle: bounded(o.angle, 5, 90, 45),
    density: bounded(o.density, 300, 10000, 3000),
    composition: ["icy", "rocky", "metallic"].includes(o.composition || "")
      ? o.composition!
      : "rocky",
    target: bounded(o.target, 1500, 3500, 2500),
    ocean: typeof o.ocean === "boolean" ? o.ocean : initial.ocean,
    depth: bounded(o.depth, 10, 11000, 4000),
    yield: bounded(o.yield, 1e-9, 1e12, 50),
    unit: o.unit && o.unit in units ? o.unit : "Mt",
  };
}
export function calculate(input: Scenario) {
  const s = sanitize(input),
    volume = (Math.PI * s.diameter ** 3) / 6,
    mass = volume * s.density,
    energy =
      s.mode === "energy"
        ? s.yield * units[s.unit]
        : 0.5 * mass * (s.velocity * 1000) ** 2;
  const validCrater =
    s.mode === "asteroid" &&
    !s.ocean &&
    s.diameter >= 50 &&
    s.diameter <= 20000 &&
    s.angle >= 15;
  const transient = validCrater
    ? 1.161 *
      (s.density / s.target) ** (1 / 3) *
      s.diameter ** 0.78 *
      (s.velocity * 1000) ** 0.44 *
      9.81 ** -0.22 *
      Math.sin((s.angle * Math.PI) / 180) ** (1 / 3)
    : null;
  const final =
    transient === null
      ? null
      : 1.25 * transient < 3200
        ? 1.25 * transient
        : (1.17 * transient ** 1.13) / 3200 ** 0.13;
  return {
    volume,
    mass,
    energy,
    tons: energy / TNT_J,
    transient,
    crater: final,
    waveSpeed: Math.sqrt(9.81 * s.depth),
    displacedVolume:
      Math.PI * (s.diameter / 2) ** 2 * Math.min(s.depth, s.diameter),
    regime:
      s.diameter > 20000
        ? "Beyond regional scaling"
        : s.diameter < 200
          ? "Atmospheric entry unresolved"
          : "Ground impact assumed",
  };
}
export function distance(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180,
    phi = (b[1] - a[1]) * r,
    lambda = (b[0] - a[0]) * r;
  const h =
    Math.sin(phi / 2) ** 2 +
    Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(lambda / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function destination(
  lon: number,
  lat: number,
  bearing: number,
  km: number,
): [number, number] {
  const r = Math.PI / 180,
    a = km / EARTH_KM,
    p = lat * r,
    b = bearing * r;
  const y = Math.asin(
    Math.max(
      -1,
      Math.min(
        1,
        Math.sin(p) * Math.cos(a) + Math.cos(p) * Math.sin(a) * Math.cos(b),
      ),
    ),
  );
  const x =
    lon * r +
    Math.atan2(
      Math.sin(b) * Math.sin(a) * Math.cos(p),
      Math.cos(a) - Math.sin(p) * Math.sin(y),
    );
  return [((x / r + 540) % 360) - 180, y / r];
}
export function fmt(n: number | null, unit = "") {
  if (n === null) return "Not modeled";
  return (
    (Math.abs(n) >= 1e7 || (Math.abs(n) > 0 && Math.abs(n) < 0.01)
      ? n.toExponential(3)
      : n.toLocaleString("en-US", { maximumFractionDigits: 2 })) +
    (unit ? " " + unit : "")
  );
}
export function encode(s: Scenario) {
  return "#s=" + encodeURIComponent(JSON.stringify(sanitize(s)));
}
export function decode(hash: string): Scenario | null {
  try {
    if (!hash.startsWith("#s=")) return null;
    return sanitize(JSON.parse(decodeURIComponent(hash.slice(3))));
  } catch {
    return null;
  }
}
export const presets: Record<string, Partial<Scenario>> = {
  "Chelyabinsk · illustrative": {
    name: "Chelyabinsk analogue",
    diameter: 20,
    velocity: 19,
    angle: 18,
    density: 3300,
    composition: "rocky",
    lat: 54.8,
    lon: 61.1,
    ocean: false,
  },
  "Tunguska · illustrative": {
    name: "Tunguska analogue",
    diameter: 60,
    velocity: 17,
    angle: 35,
    density: 3000,
    composition: "rocky",
    lat: 60.9,
    lon: 101.9,
    ocean: false,
  },
  "Barringer · illustrative": {
    name: "Barringer analogue",
    diameter: 50,
    velocity: 12,
    angle: 45,
    density: 7800,
    composition: "metallic",
    lat: 35.03,
    lon: -111.02,
    ocean: false,
  },
  "Chesapeake Bay · illustrative": {
    name: "Chesapeake analogue",
    diameter: 3000,
    velocity: 20,
    angle: 45,
    density: 3000,
    composition: "rocky",
    lat: 37.28,
    lon: -76.02,
    ocean: true,
    depth: 100,
  },
  "Chicxulub · illustrative": {
    name: "Chicxulub analogue",
    diameter: 10000,
    velocity: 20,
    angle: 60,
    density: 3000,
    composition: "rocky",
    lat: 21.4,
    lon: -89.5,
    ocean: false,
  },
  "Atlantic · 500 m": initial,
  "Planet-scale · hypothetical": {
    name: "Planet-scale experiment",
    diameter: 1e6,
    velocity: 20,
    angle: 45,
    ocean: false,
  },
};
