export const elements = {
  settingsToggle: document.getElementById("settingsToggle"),
  connectionPanel: document.getElementById("connectionPanel"),
  baseUrl: document.getElementById("baseUrl"),
  apiKey: document.getElementById("apiKey"),
  datasetId: document.getElementById("datasetId"),
  toggleKey: document.getElementById("toggleKey"),
  addQuery: document.getElementById("addQuery"),
  queryList: document.getElementById("queryList"),
  addPreset: document.getElementById("addPreset"),
  presetList: document.getElementById("presetList"),
  runBtn: document.getElementById("runBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  runSummary: document.getElementById("runSummary"),
  messageArea: document.getElementById("messageArea"),
  results: document.getElementById("results"),
  resultSubtitle: document.getElementById("resultSubtitle"),
};

export function textEl(tag, text, className = "") {
  const node = document.createElement(tag);
  if (className)
    node.className = className;
  node.textContent = text;
  return node;
}

export function badgeEl(text, type = "") {
  const badge = document.createElement("span");
  badge.className = `badge ${type}`.trim();
  badge.textContent = text;
  return badge;
}

export function chip(text, truncate = false, extraClass = "") {
  const node = document.createElement("span");
  node.className = `chip ${truncate ? "truncate" : ""} ${extraClass}`.trim();
  node.textContent = text;
  return node;
}

export function spinner() {
  const node = document.createElement("span");
  node.className = "spinner";
  node.setAttribute("aria-hidden", "true");
  return node;
}
