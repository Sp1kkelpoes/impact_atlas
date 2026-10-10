import { describe, it, expect } from "vitest";
import {
  calculate,
  initial,
  sanitize,
  units,
  distance,
  destination,
  EARTH_KM,
  encode,
  decode,
  presets,
} from "./physics";
import { circle, onLand, oceanRays, waveLine } from "./geography";
import { geoArea, geoDistance, geoEquirectangular, geoPath } from "d3-geo";
describe("physical calculations", () => {
  it("sphere mass and kinetic energy independently agree", () => {
    const r = calculate({
      ...initial,
      diameter: 2,
      density: 3000,
      velocity: 20,
    });
    expect(r.mass).toBeCloseTo((4 / 3) * Math.PI * 3000, 6);
    expect(r.energy).toBeCloseTo(r.mass * 200000000, 0);
  });
  it("energy scales with D cubed, density linearly, speed squared", () => {
    const r = calculate(initial);
    expect(
      calculate({ ...initial, diameter: 1000 }).energy / r.energy,
    ).toBeCloseTo(8);
    expect(
      calculate({ ...initial, velocity: 40 }).energy / r.energy,
    ).toBeCloseTo(4);
    expect(
      calculate({ ...initial, density: 6000 }).energy / r.energy,
    ).toBeCloseTo(2);
  });
  it("TNT conversions are consistent from J through Tt", () => {
    for (const [unit, value] of Object.entries(units))
      expect(
        calculate({ ...initial, mode: "energy", yield: 1, unit }).energy,
      ).toBe(value);
    expect(units.Mt / units.t).toBe(1e6);
  });
  it("crater dimensions grow monotonically in valid regime", () => {
    let last = 0;
    for (const diameter of [50, 100, 500, 1000, 10000, 20000]) {
      const r = calculate({ ...initial, ocean: false, diameter });
      expect(r.crater!).toBeGreaterThan(last);
      expect(r.crater!).toBeGreaterThan(r.transient!);
      last = r.crater!;
    }
  });
  it("invalid crater domains are withheld, including ocean and planet scale", () => {
    for (const p of [
      { diameter: 1 },
      { diameter: 1000000 },
      { angle: 5 },
      { ocean: true },
    ])
      expect(calculate({ ...initial, ocean: false, ...p }).crater).toBeNull();
  });
  it("all supported extremes remain finite", () => {
    for (const diameter of [1, 50, 200, 20000, 1e6])
      for (const velocity of [11, 72])
        for (const density of [300, 10000])
          for (const angle of [5, 90])
            for (const ocean of [true, false]) {
              for (const v of Object.values(
                calculate({
                  ...initial,
                  diameter,
                  velocity,
                  density,
                  angle,
                  ocean,
                }),
              ))
                if (typeof v === "number")
                  expect(Number.isFinite(v)).toBe(true);
            }
  });
  it("hostile URL state is bounded and malformed links are safe", () => {
    expect(decode("#s=%invalid")).toBeNull();
    expect(
      sanitize({ diameter: Infinity, velocity: -5, lat: 500, unit: "garbage" }),
    ).toMatchObject({ diameter: 500, velocity: 11, lat: 90, unit: "Mt" });
    expect(decode(encode({ ...initial, name: "A & B / ☄" }))?.name).toBe(
      "A & B / ☄",
    );
  });
  it("all presets calculate and round trip", () => {
    for (const p of Object.values(presets)) {
      const s = sanitize({ ...initial, ...p });
      expect(decode(encode(s))).toEqual(s);
      expect(calculate(s).energy).toBeGreaterThan(0);
    }
  });
  it("wave speed matches NOAA shallow-water relationship", () => {
    expect(calculate({ ...initial, depth: 4000 }).waveSpeed).toBeCloseTo(
      198.090888,
      4,
    );
  });
});
describe("spherical geography", () => {
  it("great-circle distances handle dateline and antipodes", () => {
    expect(distance([179, 0], [-179, 0])).toBeCloseTo(222.39016, 3);
    expect(distance([0, 0], [180, 0])).toBeCloseTo(Math.PI * EARTH_KM, 6);
    expect(distance([6, 53], [6, 53])).toBe(0);
  });
  it("destination matches specified distance at poles and dateline", () => {
    for (const center of [
      [179, 0],
      [15, 89],
      [-175, -80],
    ])
      for (const km of [1, 100, 1000, 15000])
        for (const angle of [0, 90, 180, 270]) {
          const d = destination(center[0], center[1], angle, km);
          expect(distance(center as [number, number], d)).toBeCloseTo(km, 5);
        }
  });
  it("geodesic circles preserve angular radius and finite SVG paths", () => {
    for (const lon of [-179, 0, 179])
      for (const lat of [-89, 0, 89])
        for (const km of [1, 1000, 15000]) {
          const c = circle(lon, lat, km);
          for (const p of c.coordinates[0])
            expect(
              geoDistance([lon, lat], p as [number, number]) * EARTH_KM,
            ).toBeCloseTo(km, 4);
          const svg = geoPath(geoEquirectangular())(c)!;
          expect(svg).not.toMatch(/NaN|Infinity/);
          expect(geoArea(c)).toBeGreaterThan(0);
        }
  });
  it("offline land mask identifies known inland and ocean points", () => {
    expect(onLand(10, 50)).toBe(true);
    expect(onLand(-42, 28)).toBe(false);
    expect(onLand(134, -25)).toBe(true);
  });
  it("land source cannot emit ocean rays", () =>
    expect(oceanRays(10, 50)).toEqual([]));
  it("wavefront omits blocked ray segments", () => {
    const line = waveLine(0, 0, 500, [0, 1000, 1000, 0]);
    expect(line.coordinates.length).toBe(1);
    expect(line.coordinates[0]).toHaveLength(2);
  });
});
