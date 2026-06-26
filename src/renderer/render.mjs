import { DEFAULT_BASE_URL, MAX_QUERY_LENGTH } from "./config.mjs";
import { state, runState } from "./state.mjs";
import { elements, textEl, badgeEl, chip, spinner } from "./dom.mjs";
import { escapeAttr, roundWeight, formatWeight, getScore, groupBy, selected } from "./utils.mjs";
import { sanitizePreset } from "./preset-model.mjs";

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

export function renderResults() {
  renderSummary();

  if (!runState.results.length) {
    elements.results.innerHTML = `
      <div class="notice">
        まだ検索結果はありません。接続設定、検索クエリ、検索設定を入力して「実行」を押してください。
        デスクトップ版ではアプリ側からAPIを呼び出すため、通常のブラウザCORS制約を受けません。
      </div>
    `;
    return;
  }

  const groups = groupBy(runState.results, item => item.queryText);
  elements.results.innerHTML = "";

  for (const [queryText, items] of groups) {
    const group = document.createElement("section");
    group.className = "query-group";

    const label = document.createElement("div");
    label.className = "query-label";
    label.append(
      textEl("span", "query"),
      textEl("span", `${items.length} settings`),
    );

    const title = document.createElement("h3");
    title.textContent = queryText;

    const grid = document.createElement("div");
    grid.className = "result-grid";

    for (const item of items)
      grid.append(renderResultCard(item));

    group.append(label, title, grid);
    elements.results.append(group);
  }
}

function renderResultCard(item) {
  const card = document.createElement("article");
  card.className = `result-card ${item.status}`;

  const head = document.createElement("div");
  head.className = "result-head";

  const title = document.createElement("div");
  title.className = "result-title";
  const name = document.createElement("strong");
  name.textContent = item.presetName;
  const meta = document.createElement("span");
  meta.textContent = describeRequest(item.requestBody.retrieval_model);
  title.append(name, meta);

  const badge = statusBadge(item);
  head.append(title, badge);
  card.append(head);

  if (item.status === "pending") {
    card.append(textEl("div", "待機中", "notice"));
  }
  else if (item.status === "running") {
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.append(textEl("span", "検索中 "), spinner());
    card.append(notice);
  }
  else if (item.status === "error") {
    const error = document.createElement("div");
    error.className = "error-text";
    error.textContent = item.error;
    card.append(error);
  }
  else if (!item.records.length) {
    card.append(textEl("div", "records は空でした。top_k、閾値、検索方法を変えて再実行してください。", "notice warning"));
  }
  else {
    const list = document.createElement("div");
    list.className = "record-list";
    item.records.forEach((record, index) => list.append(renderRecord(record, index)));
    card.append(list);
  }

  const details = document.createElement("details");
  details.className = "details";
  const summary = document.createElement("summary");
  summary.textContent = "Request body";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(item.requestBody, null, 2);
  details.append(summary, pre);
  card.append(details);

  return card;
}

function renderRecord(record, index) {
  const segment = record.segment || {};
  const documentName = segment.document?.name || record.document?.name || "document unknown";
  const position = segment.position ?? record.position ?? "-";
  const keywords = Array.isArray(segment.keywords) ? segment.keywords : [];
  const content = segment.content || record.content || "";
  const score = getScore(record);

  const item = document.createElement("section");
  item.className = "record";

  const top = document.createElement("div");
  top.className = "record-top";
  const rank = document.createElement("span");
  rank.textContent = `#${index + 1}`;
  const scoreEl = document.createElement("span");
  scoreEl.className = "score mono";
  scoreEl.textContent = `score ${Number.isFinite(score) ? score.toFixed(6) : "-"}`;
  top.append(rank, scoreEl);

  const body = document.createElement("p");
  body.className = "content";
  body.textContent = content || "(content empty)";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(chip(`document: ${documentName}`, true));
  meta.append(chip(`position: ${position}`, false, "mono"));
  if (keywords.length) {
    for (const keyword of keywords)
      meta.append(chip(`keyword: ${keyword}`, true));
  }

  item.append(top, body, meta);
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
