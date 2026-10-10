import http from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
const root = resolve("dist"),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
  };
http
  .createServer((req, res) => {
    try {
      let path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      ).replace(/^\/impact-atlas(?=\/|$)/, "");
      if (path === "/" || path === "") path = "/index.html";
      const file = resolve(root, "." + path);
      if (!file.startsWith(root + "/") || !statSync(file).isFile())
        throw Error();
      res.setHeader(
        "Content-Type",
        types[extname(file)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-cache");
      res.end(readFileSync(file));
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("Production fixture: http://127.0.0.1:4173/impact-atlas/"),
  );
