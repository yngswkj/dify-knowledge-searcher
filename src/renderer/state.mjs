import { STORAGE_KEY, DEFAULT_BASE_URL } from "./config.mjs";
import { uid } from "./utils.mjs";
import { defaultPreset, sanitizePreset } from "./preset-model.mjs";

export const runState = {
  running: false,
  abortController: null,
  results: [],
  startedAt: 0,
  finishedAt: 0,
};

function normalizeQueries(queries) {
  if (!Array.isArray(queries) || !queries.length)
    return [{ id: uid("query"), text: "" }];

  return queries.map(query => ({
    id: typeof query.id === "string" ? query.id : uid("query"),
    text: typeof query.text === "string" ? query.text : "",
  }));
}

function normalizePresets(presets) {
  if (!Array.isArray(presets) || !presets.length)
    return [defaultPreset()];

  return presets.map((preset, index) => sanitizePreset({
    ...defaultPreset(`設定 ${index + 1}`),
    ...preset,
    id: typeof preset.id === "string" ? preset.id : uid("preset"),
  }));
}

function loadState() {
  const fallback = {
    connection: {
      baseUrl: DEFAULT_BASE_URL,
      apiKey: "",
      datasetId: "",
    },
    queries: [
      { id: uid("query"), text: "" },
    ],
    presets: [
      defaultPreset("Hybrid weighted 0.7 / 0.3"),
      {
        ...defaultPreset("Hybrid rerank"),
        hybridMode: "reranking_model",
      },
      {
        ...defaultPreset("Semantic"),
        searchMethod: "semantic_search",
        hybridMode: "weighted_score",
      },
    ],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return fallback;

    const parsed = JSON.parse(raw);
    return {
      connection: {
        baseUrl: typeof parsed.connection?.baseUrl === "string" ? parsed.connection.baseUrl : DEFAULT_BASE_URL,
        apiKey: typeof parsed.connection?.apiKey === "string" ? parsed.connection.apiKey : "",
        datasetId: typeof parsed.connection?.datasetId === "string" ? parsed.connection.datasetId : "",
      },
      queries: normalizeQueries(parsed.queries),
      presets: normalizePresets(parsed.presets),
    };
  }
  catch {
    return fallback;
  }
}

export const state = loadState();

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
