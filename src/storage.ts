import { Scenario, sanitize } from "./physics";
export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem("impact-atlas:" + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem("impact-atlas:" + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function bookmarks(): Scenario[] {
  const list = read<unknown>("bookmarks", []);
  return Array.isArray(list)
    ? list
        .filter((x) => x && typeof x === "object")
        .slice(0, 20)
        .map(sanitize)
    : [];
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function screenshot() {
  const svg = document.querySelector(".world-map") as SVGSVGElement;
  if (!svg) throw Error("No map");
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(rect.width));
  copy.setAttribute("height", String(rect.height));
  const xml = new XMLSerializer().serializeToString(copy),
    url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = rect.width * 2;
    c.height = rect.height * 2;
    const ctx = c.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.fillStyle = getComputedStyle(svg).backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
    ctx.fillStyle = "#183d42";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "IMPACT ATLAS · Educational model · Natural Earth · Not a hazard forecast",
      15,
      rect.height - 15,
    );
    const a = document.createElement("a");
    a.download = "impact-atlas-map.png";
    a.href = c.toDataURL("image/png");
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
