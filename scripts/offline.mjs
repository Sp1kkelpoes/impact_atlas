import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const html = readFileSync("dist/index.html", "utf8");
let single = html
  .replace(
    /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
    (_, path) =>
      '<script type="module">' +
      readFileSync("dist/" + path.replace(/^\.\//, ""), "utf8").replace(
        /<\/script/gi,
        "<\\/script",
      ) +
      "</script>",
  )
  .replace(
    /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
    (_, path) =>
      "<style>" +
      readFileSync("dist/" + path.replace(/^\.\//, ""), "utf8") +
      "</style>",
  );
writeFileSync("START.html", single);
const assets = readdirSync("dist/assets").map((x) => "./assets/" + x);
const version = assets.join("-").replace(/[^a-zA-Z0-9]/g, "");
writeFileSync(
  "dist/sw.js",
  `const PREFIX='impact-atlas-'+new URL(self.registration.scope).pathname;const CACHE=PREFIX+${JSON.stringify(version)};const URLS=${JSON.stringify(["./", "./index.html", ...assets])};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))])));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});`,
);
console.log(
  "Built START.html (standalone offline) and sw.js (hosted offline cache).",
);
