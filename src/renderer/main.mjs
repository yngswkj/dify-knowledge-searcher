import { elements } from "./dom.mjs";
import { state, runState, saveState } from "./state.mjs";
import { uid } from "./utils.mjs";
import { defaultPreset } from "./preset-model.mjs";
import { renderConnection, renderQueries, renderPresets, renderResults } from "./render.mjs";
import { handlePresetInput, handlePresetClick } from "./presets.mjs";
import { runAll } from "./api.mjs";

function bindEvents() {
  elements.settingsToggle.addEventListener("click", () => {
    const isOpen = !elements.connectionPanel.hidden;
    elements.connectionPanel.hidden = isOpen;
    elements.settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  });

  elements.connectionPanel.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  elements.toggleKey.addEventListener("click", () => {
    const visible = elements.apiKey.type === "text";
    elements.apiKey.type = visible ? "password" : "text";
    elements.toggleKey.textContent = visible ? "表示" : "隠す";
  });

  elements.baseUrl.addEventListener("input", () => {
    state.connection.baseUrl = elements.baseUrl.value.trim();
    saveState();
  });

  elements.apiKey.addEventListener("input", () => {
    state.connection.apiKey = elements.apiKey.value;
    saveState();
  });

  elements.datasetId.addEventListener("input", () => {
    state.connection.datasetId = elements.datasetId.value.trim();
    saveState();
  });

  elements.addQuery.addEventListener("click", () => {
    state.queries.push({ id: uid("query"), text: "" });
    saveState();
    renderQueries();
    const last = elements.queryList.querySelector(".query-row:last-child input");
    if (last)
      last.focus();
  });

  elements.queryList.addEventListener("input", (event) => {
    const input = event.target.closest("[data-query-id]");
    if (!input)
      return;

    const query = state.queries.find(item => item.id === input.dataset.queryId);
    if (!query)
      return;

    query.text = input.value;
    saveState();
  });

  elements.queryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button)
      return;

    if (button.dataset.action === "delete-query") {
      const id = button.dataset.queryId;
      state.queries = state.queries.filter(query => query.id !== id);
      if (!state.queries.length)
        state.queries.push({ id: uid("query"), text: "" });
      saveState();
      renderQueries();
    }
  });

  elements.addPreset.addEventListener("click", () => {
    state.presets.push(defaultPreset(`設定 ${state.presets.length + 1}`));
    saveState();
    renderPresets();
  });

  elements.presetList.addEventListener("input", handlePresetInput);
  elements.presetList.addEventListener("change", handlePresetInput);
  elements.presetList.addEventListener("click", handlePresetClick);

  elements.runBtn.addEventListener("click", runAll);
  elements.cancelBtn.addEventListener("click", () => {
    if (runState.abortController)
      runState.abortController.abort();
  });
}

function init() {
  renderConnection();
  renderQueries();
  renderPresets();
  renderResults();
  bindEvents();
}

init();
