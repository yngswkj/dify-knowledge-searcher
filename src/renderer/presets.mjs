import { state, saveState } from "./state.mjs";
import { uid, roundWeight, clampInteger, clampNumber } from "./utils.mjs";
import { defaultPreset } from "./preset-model.mjs";
import { renderPresets, updateWeightLabels } from "./render.mjs";

export function handlePresetInput(event) {
  const target = event.target;
  const card = target.closest("[data-preset-id]");
  if (!card || !target.dataset.field)
    return;

  const preset = state.presets.find(item => item.id === card.dataset.presetId);
  if (!preset)
    return;

  const field = target.dataset.field;
  const value = target.type === "radio" ? target.value : target.value;

  if (field === "name") {
    preset.name = value;
  }
  else if (field === "searchMethod") {
    preset.searchMethod = value;
    saveState();
    renderPresets();
    return;
  }
  else if (field === "hybridMode") {
    preset.hybridMode = value;
    saveState();
    renderPresets();
    return;
  }
  else if (field === "vectorWeight") {
    preset.vectorWeight = roundWeight(Number(value));
    updateWeightLabels(card, preset.vectorWeight);
  }
  else if (field === "topK") {
    preset.topK = clampInteger(Number(value), 1, 50, 3);
  }
  else if (field === "scoreThresholdEnabled") {
    preset.scoreThresholdEnabled = value === "true";
    const thresholdInput = card.querySelector('[data-field="scoreThreshold"]');
    if (thresholdInput)
      thresholdInput.disabled = !preset.scoreThresholdEnabled;
  }
  else if (field === "scoreThreshold") {
    preset.scoreThreshold = clampNumber(Number(value), 0, 1, 0.5);
  }
  else if (field === "rerankingProviderName") {
    preset.rerankingProviderName = value.trim();
  }
  else if (field === "rerankingModelName") {
    preset.rerankingModelName = value.trim();
  }
  else if (field === "embeddingProviderName") {
    preset.embeddingProviderName = value.trim();
  }
  else if (field === "embeddingModelName") {
    preset.embeddingModelName = value.trim();
  }

  saveState();
}

export function handlePresetClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button)
    return;

  const id = button.dataset.presetId;
  const index = state.presets.findIndex(preset => preset.id === id);
  if (index === -1)
    return;

  if (button.dataset.action === "duplicate-preset") {
    const copy = {
      ...JSON.parse(JSON.stringify(state.presets[index])),
      id: uid("preset"),
      name: `${state.presets[index].name} copy`,
    };
    state.presets.splice(index + 1, 0, copy);
    saveState();
    renderPresets();
  }

  if (button.dataset.action === "delete-preset") {
    state.presets.splice(index, 1);
    if (!state.presets.length)
      state.presets.push(defaultPreset());
    saveState();
    renderPresets();
  }
}
