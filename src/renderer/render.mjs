import { DEFAULT_BASE_URL, MAX_QUERY_LENGTH } from "./config.mjs";
import { state, runState, uiState } from "./state.mjs";
import { elements, textEl, badgeEl, chip, spinner } from "./dom.mjs";
import { escapeAttr, roundWeight, formatWeight, getScore, selected } from "./utils.mjs";
import { sanitizePreset } from "./preset-model.mjs";
import { combTop, combAvg, combDocs } from "./metrics.mjs";

export function renderConnection() {
  elements.baseUrl.value = state.connection.baseUrl || DEFAULT_BASE_URL;
  elements.apiKey.value = state.connection.apiKey || "";
  elements.datasetId.value = state.connection.datasetId || "";
}

export function renderQueries() {
  elements.queryList.innerHTML = state.queries.map((query, index) => `
    <div class="query-row">
      <input
        class="input"
        type="text"
        maxlength="${MAX_QUERY_LENGTH}"
        data-query-id="${escapeAttr(query.id)}"
        placeholder="検索クエリ ${index + 1}"
        value="${escapeAttr(query.text)}"
      >
      <button class="button small ghost" type="button" data-action="delete-query" data-query-id="${escapeAttr(query.id)}" aria-label="クエリを削除">削除</button>
    </div>
  `).join("");
}

export function renderPresets() {
  elements.presetList.innerHTML = state.presets.map((rawPreset) => {
    const preset = sanitizePreset(rawPreset);
    Object.assign(rawPreset, preset);
    const isHybrid = preset.searchMethod === "hybrid_search";
    const isWeighted = preset.hybridMode === "weighted_score";
    const keywordWeight = roundWeight(1 - preset.vectorWeight);
    const thresholdDisabled = preset.scoreThresholdEnabled ? "" : "disabled";

    return `
      <section class="preset-card" data-preset-id="${escapeAttr(preset.id)}">
        <div class="preset-top">
          <div class="field">
            <label>設定名</label>
            <input class="input" type="text" data-field="name" value="${escapeAttr(preset.name)}" placeholder="設定名">
          </div>
          <button class="button small" type="button" data-action="duplicate-preset" data-preset-id="${escapeAttr(preset.id)}">複製</button>
          <button class="button small ghost" type="button" data-action="delete-preset" data-preset-id="${escapeAttr(preset.id)}">削除</button>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>検索方法</label>
            <select class="select" data-field="searchMethod">
              <option value="hybrid_search" ${selected(preset.searchMethod, "hybrid_search")}>Hybrid</option>
              <option value="semantic_search" ${selected(preset.searchMethod, "semantic_search")}>Semantic</option>
              <option value="full_text_search" ${selected(preset.searchMethod, "full_text_search")}>Full-text</option>
            </select>
          </div>
          <div class="field">
            <label>top_k</label>
            <input class="input mono" type="number" min="1" max="50" step="1" data-field="topK" value="${escapeAttr(String(preset.topK))}">
          </div>
        </div>

        ${isHybrid ? `
          <div class="field">
            <span class="field-label">ハイブリッドモード</span>
            <div class="segmented">
              <label>
                <input type="radio" name="mode-${escapeAttr(preset.id)}" value="weighted_score" data-field="hybridMode" ${isWeighted ? "checked" : ""}>
                <span>重み付けスコア</span>
              </label>
              <label>
                <input type="radio" name="mode-${escapeAttr(preset.id)}" value="reranking_model" data-field="hybridMode" ${!isWeighted ? "checked" : ""}>
                <span>Rerankモデル</span>
              </label>
            </div>
          </div>

          ${isWeighted ? `
            <div class="field">
              <span class="field-label">ベクトル重み / キーワード重み</span>
              <div class="weight-row">
                <span class="mono" data-role="vectorValue">${formatWeight(preset.vectorWeight)}</span>
                <input class="range" type="range" min="0" max="1" step="0.05" data-field="vectorWeight" value="${escapeAttr(String(preset.vectorWeight))}">
                <span class="mono" data-role="keywordValue">${formatWeight(keywordWeight)}</span>
              </div>
              <div class="weight-values">
                <span>vector_weight</span>
                <span>keyword_weight = 1.0 - vector_weight</span>
              </div>
            </div>
          ` : `
            <div class="form-grid">
              <div class="field">
                <label>Rerank provider</label>
                <input class="input mono" type="text" data-field="rerankingProviderName" value="${escapeAttr(preset.rerankingProviderName)}" placeholder="cohere">
              </div>
              <div class="field">
                <label>Rerank model</label>
                <input class="input mono" type="text" data-field="rerankingModelName" value="${escapeAttr(preset.rerankingModelName)}" placeholder="rerank-v3">
              </div>
            </div>
          `}

          <details class="advanced">
            <summary>Embedding 名を明示する場合</summary>
            <div class="form-grid">
              <div class="field">
                <label>Embedding provider</label>
                <input class="input mono" type="text" data-field="embeddingProviderName" value="${escapeAttr(preset.embeddingProviderName)}" placeholder="空欄可">
              </div>
              <div class="field">
                <label>Embedding model</label>
                <input class="input mono" type="text" data-field="embeddingModelName" value="${escapeAttr(preset.embeddingModelName)}" placeholder="空欄可">
              </div>
            </div>
          </details>
        ` : ""}

        <div class="form-grid">
          <div class="field">
            <label>スコア閾値</label>
            <select class="select" data-field="scoreThresholdEnabled">
              <option value="false" ${!preset.scoreThresholdEnabled ? "selected" : ""}>OFF</option>
              <option value="true" ${preset.scoreThresholdEnabled ? "selected" : ""}>ON</option>
            </select>
          </div>
          <div class="field">
            <label>score_threshold</label>
            <input class="input mono" type="number" min="0" max="1" step="0.01" data-field="scoreThreshold" value="${escapeAttr(String(preset.scoreThreshold))}" ${thresholdDisabled}>
          </div>
        </div>
      </section>
    `;
  }).join("");
}

const COLUMNS = [
  { key: "query", label: "クエリ", numeric: false },
  { key: "preset", label: "設定", numeric: false },
  { key: "top", label: "top", numeric: true },
  { key: "avg", label: "avg", numeric: true },
  { key: "count", label: "件数", numeric: true },
  { key: "docs", label: "docs", numeric: true },
  { key: "status", label: "状態", numeric: false },
];

const TEXT_KEYS = new Set(["query", "preset"]);

const STATUS_LABELS = { success: "成功", running: "実行中", pending: "待機", error: "エラー" };
const STATUS_RANK = { pending: 0, running: 1, success: 2, error: 3 };

export function renderResults() {
  renderSummary();
  ensureSelection();
  renderComboControls();
  renderComboTable();
  renderDetail();
}

function comboMetric(item, key) {
  switch (key) {
    case "top": return combTop(item);
    case "avg": return combAvg(item);
    case "count": return item.status === "success" ? item.records.length : null;
    case "docs": return combDocs(item);
    case "query": return item.queryText;
    case "preset": return item.presetName;
    case "status": return STATUS_RANK[item.status] ?? 9;
    default: return null;
  }
}

function comboComparator(a, b) {
  const key = uiState.sortKey;
  const dir = uiState.sortDir === "asc" ? 1 : -1;
  const va = comboMetric(a, key);
  const vb = comboMetric(b, key);

  if (TEXT_KEYS.has(key))
    return String(va).localeCompare(String(vb), "ja") * dir;

  // 数値はnullを常に末尾へ。
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  return (Number(va) - Number(vb)) * dir;
}

function visibleCombos() {
  let rows = runState.results.slice();
  if (uiState.filterQueryId)
    rows = rows.filter(item => item.queryId === uiState.filterQueryId);
  if (uiState.filterPresetId)
    rows = rows.filter(item => item.presetId === uiState.filterPresetId);
  rows.sort(comboComparator);
  return rows;
}

function ensureSelection() {
  const visible = visibleCombos();
  if (!visible.length) {
    uiState.selectedId = null;
    return;
  }
  if (!visible.some(item => item.id === uiState.selectedId))
    uiState.selectedId = visible[0].id;
}

function renderComboControls() {
  if (!runState.results.length) {
    elements.comboControls.innerHTML = "";
    return;
  }

  const queries = [];
  const presets = [];
  const seenQuery = new Set();
  const seenPreset = new Set();
  for (const item of runState.results) {
    if (!seenQuery.has(item.queryId)) {
      seenQuery.add(item.queryId);
      queries.push({ id: item.queryId, label: item.queryText });
    }
    if (!seenPreset.has(item.presetId)) {
      seenPreset.add(item.presetId);
      presets.push({ id: item.presetId, label: item.presetName });
    }
  }

  const option = (value, label, current) =>
    `<option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>${escapeAttr(label)}</option>`;

  elements.comboControls.innerHTML = `
    <label class="combo-filter">
      <span>クエリ</span>
      <select class="select" data-filter="query">
        ${option("", "すべて", uiState.filterQueryId)}
        ${queries.map(query => option(query.id, query.label, uiState.filterQueryId)).join("")}
      </select>
    </label>
    <label class="combo-filter">
      <span>設定</span>
      <select class="select" data-filter="preset">
        ${option("", "すべて", uiState.filterPresetId)}
        ${presets.map(preset => option(preset.id, preset.label, uiState.filterPresetId)).join("")}
      </select>
    </label>
  `;
}

function renderComboTable() {
  if (!runState.results.length) {
    elements.comboTableWrap.innerHTML = `
      <div class="notice">
        まだ検索結果はありません。接続設定、検索クエリ、検索設定を入力して「実行」を押してください。
        デスクトップ版ではアプリ側からAPIを呼び出すため、通常のブラウザCORS制約を受けません。
      </div>
    `;
    return;
  }

  const fmt = value => (value == null ? "—" : value.toFixed(4));

  const head = COLUMNS.map((col) => {
    const active = uiState.sortKey === col.key;
    const arrow = active ? (uiState.sortDir === "asc" ? " ▲" : " ▼") : "";
    const cls = [col.numeric ? "num" : "", active ? "active" : ""].filter(Boolean).join(" ");
    return `<th class="${cls}" data-sort="${col.key}">${escapeAttr(col.label)}${arrow}</th>`;
  }).join("");

  const body = visibleCombos().map((item) => {
    const isSuccess = item.status === "success";
    const count = isSuccess ? `${item.records.length}/${item.requestBody.retrieval_model.top_k}` : "—";
    const docs = isSuccess ? String(combDocs(item)) : "—";
    const selectedCls = item.id === uiState.selectedId ? " selected" : "";
    return `
      <tr class="combo-row${selectedCls}" data-combo-id="${escapeAttr(item.id)}">
        <td class="q" title="${escapeAttr(item.queryText)}">${escapeAttr(item.queryText)}</td>
        <td class="p" title="${escapeAttr(item.presetName)}">${escapeAttr(item.presetName)}</td>
        <td class="num">${fmt(combTop(item))}</td>
        <td class="num">${fmt(combAvg(item))}</td>
        <td class="num">${count}</td>
        <td class="num">${docs}</td>
        <td class="st"><span class="dot ${item.status}"></span>${STATUS_LABELS[item.status] || item.status}</td>
      </tr>
    `;
  }).join("");

  elements.comboTableWrap.innerHTML = `
    <table class="combo-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderDetail() {
  const selectedItem = runState.results.find(item => item.id === uiState.selectedId);

  if (!selectedItem) {
    elements.detailPane.innerHTML = `<div class="detail-empty">左の表から行を選ぶと、詳細とチャンクを表示します。</div>`;
    return;
  }

  elements.detailPane.innerHTML = "";

  const header = document.createElement("div");
  header.className = "detail-header";
  const title = document.createElement("h3");
  title.textContent = selectedItem.queryText;
  const sub = document.createElement("div");
  sub.className = "detail-sub";
  sub.append(textEl("span", selectedItem.presetName, "detail-preset"), statusBadge(selectedItem));
  const params = textEl("div", describeRequest(selectedItem.requestBody.retrieval_model), "detail-params");
  header.append(title, sub, params);

  const top = combTop(selectedItem);
  const avg = combAvg(selectedItem);
  const metrics = document.createElement("div");
  metrics.className = "detail-metrics";
  metrics.append(
    badgeEl(`top ${top == null ? "—" : top.toFixed(4)}`),
    badgeEl(`avg ${avg == null ? "—" : avg.toFixed(4)}`),
    badgeEl(`${selectedItem.status === "success" ? selectedItem.records.length : 0} chunks`),
  );

  elements.detailPane.append(header, metrics);

  if (selectedItem.status === "pending") {
    elements.detailPane.append(textEl("div", "待機中", "row-state"));
  }
  else if (selectedItem.status === "running") {
    const state = document.createElement("div");
    state.className = "row-state";
    state.append(textEl("span", "検索中 "), spinner());
    elements.detailPane.append(state);
  }
  else if (selectedItem.status === "error") {
    elements.detailPane.append(textEl("div", selectedItem.error, "row-state error"));
  }
  else if (!selectedItem.records.length) {
    elements.detailPane.append(textEl("div", "records は空でした。top_k、閾値、検索方法を変えて再実行してください。", "row-state"));
  }
  else {
    const chunkList = document.createElement("div");
    chunkList.className = "chunk-list";
    selectedItem.records.forEach((record, index) => chunkList.append(renderChunkItem(record, index)));
    elements.detailPane.append(chunkList);
  }

  const reqDetails = document.createElement("details");
  reqDetails.className = "req-body-details";
  const reqSummary = document.createElement("summary");
  reqSummary.textContent = "Request body";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(selectedItem.requestBody, null, 2);
  reqDetails.append(reqSummary, pre);
  elements.detailPane.append(reqDetails);
}

function chevronSvg(className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.classList.add(className);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M9 18l6-6-6-6");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

function renderChunkItem(record, index) {
  const segment = record.segment || {};
  const documentName = segment.document?.name || record.document?.name || "document unknown";
  const position = segment.position ?? record.position ?? "-";
  const keywords = Array.isArray(segment.keywords) ? segment.keywords : [];
  const content = segment.content || record.content || "";
  const score = getScore(record);

  const item = document.createElement("div");
  item.className = "chunk-item";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "chunk-trigger";

  const rank = document.createElement("span");
  rank.className = `chunk-rank${index === 0 ? " top1" : ""}`;
  rank.textContent = `#${index + 1}`;

  const scoreEl = document.createElement("span");
  scoreEl.className = "chunk-score";
  scoreEl.textContent = Number.isFinite(score) ? score.toFixed(6) : "—";

  const preview = document.createElement("span");
  preview.className = "chunk-preview";
  preview.textContent = content.slice(0, 80) || "(content empty)";

  const docEl = document.createElement("span");
  docEl.className = "chunk-doc";
  docEl.title = documentName;
  docEl.textContent = documentName;

  trigger.append(chevronSvg("chunk-chevron"), rank, scoreEl, preview, docEl);

  const body = document.createElement("div");
  body.className = "chunk-body";

  const contentEl = document.createElement("p");
  contentEl.className = "chunk-content";
  contentEl.textContent = content || "(content empty)";

  const metaEl = document.createElement("div");
  metaEl.className = "chunk-meta";
  metaEl.append(chip(`document: ${documentName}`, true));
  metaEl.append(chip(`position: ${position}`, false, "mono"));
  if (keywords.length) {
    for (const keyword of keywords)
      metaEl.append(chip(`keyword: ${keyword}`, true));
  }

  body.append(contentEl, metaEl);
  item.append(trigger, body);

  trigger.addEventListener("click", () => {
    item.classList.toggle("open");
  });

  return item;
}

function renderSummary() {
  const total = runState.results.length;
  if (!total) {
    elements.runSummary.innerHTML = "";
    elements.resultSubtitle.textContent = "実行すると、クエリごとに設定別の結果を並べて表示します。";
    return;
  }

  const success = runState.results.filter(item => item.status === "success").length;
  const error = runState.results.filter(item => item.status === "error").length;
  const running = runState.results.filter(item => item.status === "running").length;
  const pending = runState.results.filter(item => item.status === "pending").length;
  const topScore = Math.max(
    ...runState.results.flatMap(item => item.records.map(getScore)).filter(Number.isFinite),
  );
  const elapsed = runState.running
    ? Math.round(performance.now() - runState.startedAt)
    : Math.round(runState.finishedAt - runState.startedAt);

  elements.resultSubtitle.textContent = `${total} 件の組み合わせを比較しています。`;
  elements.runSummary.innerHTML = "";
  elements.runSummary.append(
    badgeEl(`${success}/${total} success`, "success"),
    error ? badgeEl(`${error} error`, "error") : badgeEl("0 error"),
    running || pending ? badgeEl(`${running} running / ${pending} pending`, "warning") : badgeEl("done"),
    badgeEl(`top ${Number.isFinite(topScore) ? topScore.toFixed(6) : "-"}`, ""),
    badgeEl(`${elapsed} ms`, ""),
  );
}

function statusBadge(item) {
  if (item.status === "running") {
    const badge = badgeEl("running", "warning");
    badge.prepend(spinner());
    return badge;
  }
  if (item.status === "success")
    return badgeEl(`${item.records.length} records / ${item.elapsedMs} ms`, "success");
  if (item.status === "error")
    return badgeEl("error", "error");
  return badgeEl("pending", "");
}

function describeRequest(model) {
  const parts = [
    model.search_method,
    `top_k=${model.top_k}`,
  ];

  if (model.search_method === "hybrid_search") {
    parts.push(model.reranking_mode);
    if (model.reranking_mode === "weighted_score") {
      parts.push(`v=${formatWeight(model.weights.vector_setting.vector_weight)}`);
      parts.push(`k=${formatWeight(model.weights.keyword_setting.keyword_weight)}`);
    }
    else {
      parts.push(model.reranking_model.reranking_model_name || "rerank model empty");
    }
  }

  if (model.score_threshold_enabled)
    parts.push(`threshold=${model.score_threshold}`);

  return parts.join(" / ");
}

export function setRunningUi(running) {
  elements.runBtn.disabled = running;
  elements.cancelBtn.hidden = !running;
}

export function showMessage(message, type) {
  elements.messageArea.innerHTML = "";
  if (!message)
    return;

  const notice = document.createElement("div");
  notice.className = `notice ${type || ""}`.trim();
  notice.textContent = message;
  elements.messageArea.append(notice);
}

export function updateWeightLabels(card, vectorWeight) {
  const vector = card.querySelector('[data-role="vectorValue"]');
  const keyword = card.querySelector('[data-role="keywordValue"]');
  if (vector)
    vector.textContent = formatWeight(vectorWeight);
  if (keyword)
    keyword.textContent = formatWeight(1 - vectorWeight);
}
