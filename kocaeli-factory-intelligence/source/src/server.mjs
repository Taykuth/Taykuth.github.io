/** Local service wrapper: serves the dashboard and exposes auditable model endpoints. */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assessTelemetry } from "./model-core.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const riskArtifact = JSON.parse(readFileSync(resolve(root, "models", "risk_model.json"), "utf8"));
const anomalyArtifact = JSON.parse(readFileSync(resolve(root, "models", "anomaly_model.json"), "utf8"));
const report = JSON.parse(readFileSync(resolve(root, "reports", "model_report.json"), "utf8"));
const port = Number(process.env.PORT || 8080);
const mimeTypes = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}
function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; if (body.length > 10000) reject(new Error("Request body is too large")); });
    request.on("end", () => resolveBody(body)); request.on("error", reject);
  });
}
function staticFile(pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(dist, requested);
  const pathFromDist = relative(dist, candidate);
  return pathFromDist && !pathFromDist.startsWith("..") && !isAbsolute(pathFromDist) ? candidate : null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { status: "ok", model_generated_at: report.generated_at });
    if (request.method === "GET" && url.pathname === "/api/model-report") return sendJson(response, 200, report);
    if (request.method === "POST" && url.pathname === "/api/predict") {
      const input = JSON.parse(await readBody(request));
      return sendJson(response, 200, { input, assessment: assessTelemetry(input, riskArtifact, anomalyArtifact) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "Method not allowed" });
    const file = staticFile(url.pathname);
    if (!file || !existsSync(file)) return sendJson(response, 404, { error: "Not found" });
    const content = readFileSync(file);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(file)] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Bad request" });
  }
});

server.listen(port, () => console.log(`KFI local service listening on http://127.0.0.1:${port}`));

