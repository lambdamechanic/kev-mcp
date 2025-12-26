import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const TOOLTEST_INSTALL_HINT =
  "tooltest not installed. Install with: cargo install --git https://github.com/lambdamechanic/tooltest";

function ensureTooltestInstalled() {
  const check = spawnSync("tooltest", ["--version"], { stdio: "pipe" });
  if (check.error && check.error.code === "ENOENT") {
    throw new Error(TOOLTEST_INSTALL_HINT);
  }
  if (check.error) {
    throw check.error;
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a free port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function isServerHealthy(port) {
  return await new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/health",
        method: "GET",
        timeout: 1000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve(res.statusCode === 200 && body.includes('"status":"ok"'));
        });
      }
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForServerReady(port, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerHealthy(port)) {
      return;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for server on port ${port}`);
}

async function stopProcess(child, label) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exitPromise = once(child, "exit").catch(() => null);
  const closePromise = once(child, "close").catch(() => null);

  child.kill("SIGTERM");
  const timeout = delay(3000).then(() => "timeout");
  const result = await Promise.race([exitPromise, closePromise, timeout]);

  if (result === "timeout" && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }

  await Promise.race([exitPromise, closePromise, delay(3000)]);

  if (child.exitCode === null && child.signalCode === null) {
    throw new Error(`Failed to stop ${label}`);
  }
}

function parseTooltestOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("tooltest produced no stdout");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split("\n").reverse();
    for (const line of lines) {
      const candidate = line.trim();
      if (!candidate || !candidate.startsWith("{")) {
        continue;
      }
      try {
        return JSON.parse(candidate);
      } catch {
        continue;
      }
    }
  }

  throw new Error(`Failed to parse tooltest JSON output. stdout: ${trimmed}`);
}

async function runTooltest(url) {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "tooltest",
      ["--generator-mode", "state-machine", "--cases", "100", "http", "--url", url],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

test("tooltest against local MCP HTTP server", async () => {
  ensureTooltestInstalled();

  const port = await getFreePort();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kev-mcp-tooltest-"));
  const cachePath = path.join(tempDir, "kev-cache.json");
  const now = Date.now();
  const kevData = {
    title: "Test KEV",
    catalogVersion: "2024.01.01",
    dateReleased: "2024-01-01",
    count: 1,
    vulnerabilities: [
      {
        cveID: "CVE-2024-0001",
        vendorProject: "Acme",
        product: "Widget",
        vulnerabilityName: "Test Vulnerability",
        dateAdded: "2024-01-01",
        shortDescription: "Test entry for local tooltest.",
        requiredAction: "Update to fixed version.",
        dueDate: "2024-02-01",
        knownRansomwareCampaignUse: "Unknown",
        notes: "",
        cwes: ["CWE-79"],
      },
    ],
  };
  await fs.writeFile(cachePath, JSON.stringify({ data: kevData, timestamp: now }), "utf8");

  const serverProcess = spawn(
    "node",
    ["build/kev-mcp-bundle.cjs", "--transport", "http"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        KEV_CACHE_PATH: cachePath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const serverStdout = [];
  const serverStderr = [];
  serverProcess.stdout.on("data", (chunk) => serverStdout.push(chunk));
  serverProcess.stderr.on("data", (chunk) => serverStderr.push(chunk));

  try {
    await waitForServerReady(port);
    const url = `http://127.0.0.1:${port}/mcp`;
    const result = await runTooltest(url);
    const parsed = parseTooltestOutput(result.stdout);

    if (result.code !== 0) {
      const serverLogs = Buffer.concat(serverStderr).toString("utf8").trim();
      throw new Error(
        `tooltest exited with code ${result.code}. stdout: ${result.stdout.trim()} stderr: ${result.stderr.trim()} server: ${serverLogs}`
      );
    }

    assert.equal(
      parsed?.outcome?.status,
      "success",
      `tooltest outcome was not success. stdout: ${result.stdout.trim()}`
    );
  } finally {
    await stopProcess(serverProcess, "MCP server");
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}, { timeout: 120000 });
