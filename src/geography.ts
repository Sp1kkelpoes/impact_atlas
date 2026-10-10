import { feature, mesh } from "topojson-client";
import { geoCircle, geoContains, geoBounds } from "d3-geo";
import world from "./world.json";
import { EARTH_KM, destination } from "./physics";
const topology = world as any;
export const land = feature(topology, topology.objects.land);
export const countries = feature(topology, topology.objects.countries);
export const borders = mesh(
  topology,
  topology.objects.countries,
  (a, b) => a !== b,
);
// Pre-filter individual land polygons by spherical bounds before point-in-polygon.
const landGeometries =
  (land as any).type === "FeatureCollection"
    ? (land as any).features.map((f: any) => f.geometry)
    : [(land as any).geometry];
const landPolygons = landGeometries
  .flatMap((g: any) =>
    g.type === "MultiPolygon" ? g.coordinates : [g.coordinates],
  )
  .map((coordinates: any) => {
    const polygon = { type: "Polygon" as const, coordinates };
    return { polygon, bounds: geoBounds(polygon) };
  });
export const onLand = (lon: number, lat: number) =>
  landPolygons.some(({ polygon, bounds }: any) => {
    const [[west, south], [east, north]] = bounds;
    return (
      lat >= south &&
      lat <= north &&
      (west <= east
        ? lon >= west && lon <= east
        : lon >= west || lon <= east) &&
      geoContains(polygon, [lon, lat])
    );
  });
export const circle = (lon: number, lat: number, km: number) =>
  geoCircle()
    .center([lon, lat])
    .radius(Math.min(179.9, ((km / EARTH_KM) * 180) / Math.PI))
    .precision(1)();
export const cities: [string, number, number][] = [
  ["Amsterdam", 4.9, 52.37],
  ["Groningen", 6.57, 53.22],
  ["Delfzijl", 6.92, 53.33],
  ["London", -0.13, 51.51],
  ["Paris", 2.35, 48.86],
  ["Berlin", 13.4, 52.52],
  ["Rome", 12.5, 41.9],
  ["Madrid", -3.7, 40.42],
  ["Oslo", 10.75, 59.91],
  ["Warsaw", 21, 52.23],
  ["Kyiv", 30.52, 50.45],
  ["Moscow", 37.62, 55.75],
  ["Istanbul", 28.98, 41],
  ["Cairo", 31.24, 30.04],
  ["Cape Town", 18.42, -33.93],
  ["Nairobi", 36.82, -1.29],
  ["Lagos", 3.38, 6.52],
  ["New York", -74.01, 40.71],
  ["Washington", -77.04, 38.91],
  ["Los Angeles", -118.24, 34.05],
  ["Chicago", -87.63, 41.88],
  ["Toronto", -79.38, 43.65],
  ["Vancouver", -123.12, 49.28],
  ["Mexico City", -99.13, 19.43],
  ["São Paulo", -46.63, -23.55],
  ["Buenos Aires", -58.38, -34.6],
  ["Lima", -77.04, -12.05],
  ["Santiago", -70.67, -33.45],
  ["Tokyo", 139.69, 35.69],
  ["Beijing", 116.4, 39.9],
  ["Shanghai", 121.47, 31.23],
  ["Seoul", 126.98, 37.57],
  ["Delhi", 77.21, 28.61],
  ["Mumbai", 72.88, 19.08],
  ["Singapore", 103.82, 1.35],
  ["Jakarta", 106.85, -6.21],
  ["Bangkok", 100.5, 13.75],
  ["Dubai", 55.27, 25.2],
  ["Sydney", 151.21, -33.87],
  ["Melbourne", 144.96, -37.81],
  ["Perth", 115.86, -31.95],
  ["Auckland", 174.76, -36.85],
  ["Honolulu", -157.86, 21.31],
  ["Reykjavík", -21.94, 64.15],
];
// Coarse straight-ray land interception. No refraction, diffraction or bathymetry.
export function oceanRays(lon: number, lat: number) {
  if (onLand(lon, lat)) return [];
  return Array.from({ length: 120 }, (_, i) => {
    let reach = 5000;
    for (let km = 25; km <= 5000; km += 25) {
      const p = destination(lon, lat, i * 3, km);
      if (onLand(...p)) {
        reach = km - 25;
        break;
      }
    }
    return reach;
  });
}
export function waveLine(
  lon: number,
  lat: number,
  radius: number,
  rays: number[],
) {
  const lines: [number, number][][] = [];
  let segment: [number, number][] = [];
  for (let i = 0; i <= rays.length; i++) {
    if (radius <= rays[i % rays.length])
      segment.push(destination(lon, lat, (i % rays.length) * 3, radius));
    else {
      if (segment.length > 1) lines.push(segment);
      segment = [];
    }
  }
  if (segment.length > 1) lines.push(segment);
  return { type: "MultiLineString" as const, coordinates: lines };
}
