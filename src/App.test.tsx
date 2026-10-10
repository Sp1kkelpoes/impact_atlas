// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
let root: Root, host: HTMLDivElement;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
class Observer {
  constructor(private cb: any) {}
  observe() {
    this.cb([{ contentRect: { width: 1000, height: 500 } }]);
  }
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", Observer);
Object.defineProperty(SVGSVGElement.prototype, "width", {
  get() {
    return { baseVal: { value: 1000 } };
  },
});
Object.defineProperty(SVGSVGElement.prototype, "height", {
  get() {
    return { baseVal: { value: 500 } };
  },
});
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function mount() {
  await act(async () => root.render(<App />));
}
function button(text: string) {
  const b = [...host.querySelectorAll("button")].find(
    (x) => x.textContent?.trim() === text,
  );
  expect(b, `button ${text}`).toBeTruthy();
  return b!;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
async function select(label: string, value: string) {
  const el = host.querySelector(`[aria-label="${label}"]`) as HTMLSelectElement;
  await act(async () => {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("mounts real SVG map, without NaN coordinates or empty land geometry", async () => {
  await mount();
  expect(host.querySelectorAll(".world-map path").length).toBeGreaterThan(8);
  expect(host.innerHTML).not.toMatch(/NaN|Infinity/);
  expect(host.querySelector(".metrics")?.textContent).toContain(
    "INCIDENT KINETIC ENERGY",
  );
});
it("presets update scientific results and persist on reload", async () => {
  await mount();
  await select("Asteroid preset", "Chicxulub · illustrative");
  expect(
    (host.querySelector('[aria-label="Diameter"]') as HTMLInputElement).value,
  ).toBe("10000");
  expect(host.querySelector(".metrics")?.textContent).toContain(
    "CONDITIONAL FINAL CRATER",
  );
  await click("＋ Bookmark scenario");
  expect(
    JSON.parse(localStorage.getItem("impact-atlas:bookmarks")!),
  ).toHaveLength(1);
  await act(async () => {
    root.unmount();
    root = createRoot(host);
    root.render(<App />);
  });
  expect(
    (host.querySelector('[aria-label="Diameter"]') as HTMLInputElement).value,
  ).toBe("10000");
});
it("nuclear energy presets update conversions; converter is functional", async () => {
  await mount();
  await click("⚛ Nuclear energy");
  await select("Energy preset", "Hypothetical 1 Gt|1|Gt");
  expect(host.querySelector(".metric")?.textContent).toContain("4.184e+18");
  await click("Equations & sources");
  expect(host.querySelector(".detail-panel")?.textContent).toContain("Energy conversion");
  expect(host.querySelector(".detail-panel")?.textContent).not.toContain("Conditional crater model");
  await click("Unit converter");
  await click("Use scenario energy");
  expect(host.querySelector("table")?.textContent).toContain("4.184e+18");
});
it("comparison and overlay controls create and remove actual maps/layers", async () => {
  await mount();
  await click("⇄ Compare");
  expect(host.querySelectorAll(".world-map")).toHaveLength(2);
  await click("Close comparison");
  expect(host.querySelectorAll(".world-map")).toHaveLength(1);
  await click("＋ Overlay");
  expect(button("Clear 1 overlays ×")).toBeTruthy();
  await click("Clear 1 overlays ×");
  expect(host.querySelector(".map-legend")?.textContent).not.toContain("Clear");
});
it("zoom control changes SVG transform, theme and mobile drawer change state", async () => {
  await mount();
  const group = host.querySelector(".world-map>g")!,
    old = group.getAttribute("transform");
  await act(async () =>
    (host.querySelector('[aria-label="Zoom in"]') as HTMLButtonElement).click(),
  );
  expect(group.getAttribute("transform")).not.toBe(old);
  await click("◐");
  expect(document.documentElement.dataset.theme).toBe("dark");
  await click("☷ Controls");
  expect(host.querySelector("aside")?.className).toBe("open");
});
it("shared URL input overrides saved state", async () => {
  window.history.replaceState(
    null,
    "",
    "/#s=" +
      encodeURIComponent(
        JSON.stringify({ name: "Shared test", diameter: 12345 }),
      ),
  );
  await mount();
  expect(
    (host.querySelector('[aria-label="Scenario name"]') as HTMLInputElement)
      .value,
  ).toBe("Shared test");
  expect(
    (host.querySelector('[aria-label="Diameter"]') as HTMLInputElement).value,
  ).toBe("12345");
});
