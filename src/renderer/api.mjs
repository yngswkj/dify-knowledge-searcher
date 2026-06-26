import { MAX_QUERY_LENGTH, DEFAULT_BASE_URL } from "./config.mjs";
import { state, runState } from "./state.mjs";
import { sanitizePreset, buildRetrievalModel } from "./preset-model.mjs";
import { uid, getScore } from "./utils.mjs";
import { elements } from "./dom.mjs";
import { renderResults, showMessage, setRunningUi } from "./render.mjs";

export async function runAll() {
  if (runState.running)
    return;

  const validation = validateRun();
  if (validation.length) {
    showMessage(validation.join("\n"), "error");
    if (validation.some(message => message.includes("Base URL") || message.includes("APIキー") || message.includes("Dataset ID"))) {
      elements.connectionPanel.hidden = false;
      elements.settingsToggle.setAttribute("aria-expanded", "true");
    }
    return;
  }

  const queries = state.queries
    .map(query => ({ ...query, text: query.text.trim() }))
    .filter(query => query.text);
  const presets = state.presets.map(sanitizePreset);
  const combinations = [];

  for (const query of queries) {
    for (const preset of presets) {
      const requestBody = {
        query: query.text,
        retrieval_model: buildRetrievalModel(preset),
      };
      combinations.push({
        id: uid("run"),
        queryId: query.id,
        queryText: query.text,
        presetId: preset.id,
        presetName: preset.name,
        requestBody,
        status: "pending",
        records: [],
        error: "",
        elapsedMs: 0,
      });
    }
  }

  runState.running = true;
  runState.abortController = new AbortController();
  runState.results = combinations;
  runState.startedAt = performance.now();
  runState.finishedAt = 0;
  setRunningUi(true);
  showMessage("", "");
  renderResults();

  let cursor = 0;
  const workerCount = Math.min(4, combinations.length);

  const worker = async () => {
    while (cursor < combinations.length && !runState.abortController.signal.aborted) {
      const index = cursor;
      cursor += 1;
      await runCombination(runState.results[index], runState.abortController.signal);
      renderResults();
    }
  };

  try {
    await Promise.all(Array.from({ length: workerCount }, worker));
  }
  finally {
    runState.finishedAt = performance.now();
    runState.running = false;
    setRunningUi(false);
    if (runState.abortController.signal.aborted)
      showMessage("実行を停止しました。完了済みの結果だけ表示しています。", "warning");
    runState.abortController = null;
    renderResults();
  }
}

async function runCombination(item, signal) {
  item.status = "running";
  item.startedAt = performance.now();
  renderResults();

  const url = `${normalizeBaseUrl(state.connection.baseUrl)}/datasets/${encodeURIComponent(state.connection.datasetId.trim())}/retrieve`;

  try {
    const response = await retrieve(url, state.connection.apiKey, item.requestBody, item.id, signal);
    const payload = response.payload;

    if (!response.ok) {
      item.status = "error";
      item.error = response.status === 0
        ? formatNetworkError(new Error(response.error || "Request failed."))
        : formatApiError(response.status, payload);
      return;
    }

    const records = Array.isArray(payload.records) ? payload.records : [];
    item.records = records.sort((a, b) => getScore(b) - getScore(a));
    item.status = "success";
  }
  catch (error) {
    if (error.name === "AbortError") {
      item.status = "error";
      item.error = "停止されました。";
    }
    else {
      item.status = "error";
      item.error = formatNetworkError(error);
    }
  }
  finally {
    item.elapsedMs = Math.round(performance.now() - item.startedAt);
  }
}

function validateRun() {
  const errors = [];
  const baseUrl = state.connection.baseUrl.trim();
  const apiKey = state.connection.apiKey.trim();
  const datasetId = state.connection.datasetId.trim();
  const activeQueries = state.queries.map(query => query.text.trim()).filter(Boolean);

  if (!baseUrl)
    errors.push("Base URL を入力してください。");
  if (!apiKey)
    errors.push("ナレッジAPIキーを入力してください。");
  if (!datasetId)
    errors.push("Dataset ID を入力してください。");
  if (!activeQueries.length)
    errors.push("検索クエリを1件以上入力してください。");

  for (const query of activeQueries) {
    if (query.length > MAX_QUERY_LENGTH)
      errors.push(`検索クエリは ${MAX_QUERY_LENGTH} 文字以内にしてください: ${query.slice(0, 30)}...`);
  }

  return errors;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json"))
    return response.json();

  return response.text();
}

async function retrieve(url, apiKey, body, requestId, signal) {
  if (window.difyDesktop?.retrieve)
    return retrieveThroughDesktop(url, apiKey, body, requestId, signal);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": authorizationHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  return {
    ok: response.ok,
    status: response.status,
    payload: await parseResponse(response),
  };
}

function retrieveThroughDesktop(url, apiKey, body, requestId, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      window.difyDesktop.cancel(requestId).catch(() => {});
      reject(createAbortError());
    };

    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener("abort", abort, { once: true });

    window.difyDesktop.retrieve({ requestId, url, apiKey, body })
      .then((response) => {
        if (response?.cancelled) {
          reject(createAbortError());
          return;
        }

        resolve(response);
      })
      .catch(reject)
      .finally(() => {
        signal.removeEventListener("abort", abort);
      });
  });
}

function createAbortError() {
  try {
    return new DOMException("停止されました。", "AbortError");
  }
  catch {
    const error = new Error("停止されました。");
    error.name = "AbortError";
    return error;
  }
}

function formatApiError(status, payload) {
  if (typeof payload === "string")
    return `HTTP ${status}\n${payload || "(empty response)"}`;

  const message = payload.message || payload.error || payload.description || JSON.stringify(payload, null, 2);
  if (status === 401)
    return `HTTP 401 Unauthorized\nAPIキーが正しいか、Knowledge APIキーを使っているか確認してください。\n${message}`;
  if (status === 404)
    return `HTTP 404 Not Found\nBase URL と Dataset ID を確認してください。\n${message}`;

  return `HTTP ${status}\n${message}`;
}

function formatNetworkError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("failed to fetch")) {
    return [
      "Fetch に失敗しました。",
      "ブラウザのCORS制約、Base URLの誤り、ネットワーク、またはHTTPS証明書を確認してください。",
      "file:// から直接開く場合、セルフホストDify側でOrigin許可が必要になることがあります。",
      `detail: ${message}`,
    ].join("\n");
  }

  if (window.difyDesktop?.retrieve) {
    return [
      "API呼び出しに失敗しました。",
      "Base URL、Dataset ID、ネットワーク、HTTPS証明書を確認してください。",
      `detail: ${message}`,
    ].join("\n");
  }

  return message;
}

function normalizeBaseUrl(value) {
  return (value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
}

function authorizationHeader(value) {
  const trimmed = String(value || "").trim();
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
}
