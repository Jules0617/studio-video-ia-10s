import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import generateHandler from "./api/generate.js";
import statusHandler from "./api/status.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4"
};

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (urlObj.pathname === "/api/generate" || urlObj.pathname === "/api/status") {
      const chunks = [];
      for await (const chunk of chunks.length ? chunks : req) {
        chunks.push(chunk);
      }
      const bodyBuffer = Buffer.concat(chunks);
      const webReq = new Request(urlObj.toString(), {
        method: req.method,
        headers: req.headers,
        body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuffer
      });

      const handler = urlObj.pathname === "/api/generate" ? generateHandler : statusHandler;
      const webResp = await handler(webReq);

      res.statusCode = webResp.status;
      webResp.headers.forEach((val, key) => res.setHeader(key, val));

      if (webResp.body) {
        const reader = webResp.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      }
      res.end();
      return;
    }

    let filePath = path.join(__dirname, urlObj.pathname === "/" ? "index.html" : urlObj.pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(__dirname, "index.html");
    }

    const ext = path.extname(filePath);
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
