const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("node:path");

const activeRequests = new Map();

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: "Difyナレッジ検索テスター",
    backgroundColor: "#f6f7f6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.loadFile(path.join(__dirname, "index.html"));
}

function normalizeAuthorization(value) {
  const trimmed = String(value || "").trim();
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
}

function normalizePayload(text, contentType) {
  if (!text)
    return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    }
    catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  }
  catch {
    return text;
  }
}

function validateRetrievePayload(payload) {
  if (!payload || typeof payload !== "object")
    throw new Error("Invalid retrieve payload.");

  const endpoint = new URL(String(payload.url || ""));
  if (!["http:", "https:"].includes(endpoint.protocol))
    throw new Error("Base URL must use http or https.");

  if (!String(payload.apiKey || "").trim())
    throw new Error("API key is required.");

  if (!payload.body || typeof payload.body !== "object")
    throw new Error("Request body is required.");

  return endpoint.toString();
}

ipcMain.handle("dify:retrieve", async (_event, payload) => {
  let requestId = "";

  try {
    requestId = String(payload?.requestId || "");
    const url = validateRetrievePayload(payload);
    const controller = new AbortController();

    if (requestId)
      activeRequests.set(requestId, controller);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": normalizeAuthorization(payload.apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload.body),
      signal: controller.signal,
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    return {
      ok: response.ok,
      status: response.status,
      payload: normalizePayload(text, contentType),
    };
  }
  catch (error) {
    if (error && error.name === "AbortError") {
      return {
        ok: false,
        status: 0,
        cancelled: true,
        error: "Request was cancelled.",
      };
    }

    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  finally {
    if (requestId)
      activeRequests.delete(requestId);
  }
});

ipcMain.handle("dify:cancel", (_event, requestId) => {
  const controller = activeRequests.get(String(requestId || ""));
  if (controller)
    controller.abort();

  return { ok: true };
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin")
    app.quit();
});
